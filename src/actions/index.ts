import { ActionError, defineAction } from "astro:actions";
import {
  db,
  eq,
  and,
  desc,
  sql,
  CarPoolGroups,
  CarPoolMembers,
  CarPoolTrips,
  CarPoolTripParticipants,
} from "astro:db";
import { z } from "astro:schema";
import { requireUser } from "./_guards";

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Get active members for a group
async function getActiveMembers(groupId: string) {
  return await db
    .select()
    .from(CarPoolMembers as any)
    .where(and(eq((CarPoolMembers as any).groupId, groupId), eq((CarPoolMembers as any).isActive, true)))
    .orderBy((CarPoolMembers as any).rotationOrder);
}

async function getPreviousTrips(groupId: string, beforeTripDate: Date) {
  const trips = await db
    .select()
    .from(CarPoolTrips as any)
    .where(eq((CarPoolTrips as any).groupId, groupId))
    .orderBy(desc((CarPoolTrips as any).tripDate));

  return trips.filter((trip) => new Date(trip.tripDate).getTime() < beforeTripDate.getTime());
}

function getNextMemberInRotation(members: any[], startRotationOrder: number | null) {
  if (members.length === 0) return null;

  if (startRotationOrder == null) {
    return members[0];
  }

  const sorted = [...members].sort((a, b) => a.rotationOrder - b.rotationOrder);
  const next = sorted.find((member) => member.rotationOrder > startRotationOrder);
  return next ?? sorted[0];
}

async function getRotationContext(groupId: string, tripDate: Date, absenteeIds: string[]) {
  const members = await getActiveMembers(groupId);
  const presentMembers = members.filter((member) => !absenteeIds.includes(member.id));
  const previousTrips = await getPreviousTrips(groupId, tripDate);
  const lastTrip = previousTrips[0] ?? null;

  let lastDriverMember: any = null;
  if (lastTrip?.actualDriverId) {
    lastDriverMember = members.find(
      (member) => member.id === lastTrip.actualDriverId || member.userId === lastTrip.actualDriverId,
    ) ?? null;
  }

  const baseCandidate = getNextMemberInRotation(members, lastDriverMember?.rotationOrder ?? null);
  if (!baseCandidate) {
    return {
      members,
      presentMembers,
      baseCandidate: null,
      assignedDriver: null,
    };
  }

  const sortedMembers = [...members].sort((a, b) => a.rotationOrder - b.rotationOrder);
  const startIndex = sortedMembers.findIndex((member) => member.id === baseCandidate.id);
  let assignedDriver = null;

  for (let offset = 0; offset < sortedMembers.length; offset += 1) {
    const member = sortedMembers[(startIndex + offset) % sortedMembers.length];
    if (presentMembers.some((present) => present.id === member.id)) {
      assignedDriver = member;
      break;
    }
  }

  return {
    members,
    presentMembers,
    baseCandidate,
    assignedDriver,
  };
}

// Calculate fairness for a member
async function calculateMemberFairness(memberId: string) {
  const participations = await db
    .select()
    .from(CarPoolTripParticipants as any)
    .where(eq((CarPoolTripParticipants as any).memberId, memberId));

  let driveCount = 0;
  let rideCount = 0;
  let absenceCount = 0;
  let missedRideCount = 0;

  for (const p of participations) {
    if (p.role === 'driver' && p.attendanceStatus === 'present') driveCount++;
    if (p.role === 'passenger' && p.attendanceStatus === 'present') rideCount++;
    if (p.attendanceStatus === 'absent') absenceCount++;
    if (p.missedRide) missedRideCount++;
  }

  return {
    driveCount,
    rideCount,
    absenceCount,
    missedRideCount,
    fairnessScore: driveCount - rideCount
  };
}

function validateTripMemberPayload(input: {
  actualDriverId: string;
  passengers: string[];
  absentees: string[];
}, memberMap: Map<string, any>) {
  const passengerSet = new Set(input.passengers);
  const absenteeSet = new Set(input.absentees);

  if (passengerSet.has(input.actualDriverId) || absenteeSet.has(input.actualDriverId)) {
    throw new ActionError({ code: "BAD_REQUEST", message: "Driver cannot be marked as passenger or absent." });
  }

  for (const pid of input.passengers) {
    if (!memberMap.has(pid)) throw new ActionError({ code: "BAD_REQUEST", message: "Invalid passenger" });
    if (absenteeSet.has(pid)) throw new ActionError({ code: "BAD_REQUEST", message: "Absent member cannot be passenger" });
  }

  for (const aid of input.absentees) {
    if (!memberMap.has(aid)) throw new ActionError({ code: "BAD_REQUEST", message: "Invalid absentee" });
  }
}

async function buildTripParticipants(input: {
  tripId: string;
  actualDriverId: string;
  passengers: string[];
  absentees: string[];
}, rotation: any, memberMap: Map<string, any>) {
  const presentMembers = rotation.presentMembers;
  const participants = [];

  participants.push({
    id: generateId(),
    tripId: input.tripId,
    memberId: input.actualDriverId,
    role: 'driver',
    attendanceStatus: 'present',
    receivedRide: false,
    missedRide: false,
    createdAt: new Date(),
  });

  for (const pid of input.passengers) {
    participants.push({
      id: generateId(),
      tripId: input.tripId,
      memberId: pid,
      role: 'passenger',
      attendanceStatus: 'present',
      receivedRide: true,
      missedRide: false,
      createdAt: new Date(),
    });
  }

  for (const aid of input.absentees) {
    const member = memberMap.get(aid)!;
    const wouldBePassenger =
      rotation.baseCandidate != null &&
      rotation.baseCandidate.id !== member.id &&
      presentMembers.length >= 2;

    participants.push({
      id: generateId(),
      tripId: input.tripId,
      memberId: aid,
      role: wouldBePassenger ? 'passenger' : 'driver',
      attendanceStatus: 'absent',
      receivedRide: false,
      missedRide: wouldBePassenger,
      createdAt: new Date(),
    });
  }

  for (const participant of participants) {
    await db.insert(CarPoolTripParticipants as any).values(participant);
  }
}

// ============================================================================
// ACTIONS DEFINITION
// ============================================================================

export const server = {
  // Create a new group
  createGroup: defineAction({
    input: z.object({
      name: z.string().min(1),
      workingDays: z.array(z.number()).min(1),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);
      const groupId = generateId();

      await db.insert(CarPoolGroups as any).values({
        id: groupId,
        ownerId: user.id,
        name: input.name,
        workingDays: input.workingDays,
        isArchived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Add creator as first member
      const memberId = generateId();
      await db.insert(CarPoolMembers as any).values({
        id: memberId,
        groupId,
        userId: user.id,
        name: user.name || 'Unknown', // Assuming user has name
        rotationOrder: 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return { groupId };
    },
  }),

  // Load user's groups
  loadUserGroups: defineAction({
    input: z.any().optional(),
    handler: async (_, context) => {
      const user = requireUser(context);

      const memberships = await db
        .select()
        .from(CarPoolMembers as any)
        .where(and(eq((CarPoolMembers as any).userId, user.id), eq((CarPoolMembers as any).isActive, true)));

      const groupIds = memberships.map(m => m.groupId);

      if (groupIds.length === 0) return { groups: [] };

      const groups = await db
        .select()
        .from(CarPoolGroups as any)
        .where(sql`${(CarPoolGroups as any).id} IN (${sql.join(groupIds, sql`, `)})`);

      return { groups };
    },
  }),

  // Load group detail
  loadGroupDetail: defineAction({
    input: z.object({ groupId: z.string() }),
    handler: async (input, context) => {
      const user = requireUser(context);

      // Check membership
      const membership = await db
        .select()
        .from(CarPoolMembers as any)
        .where(and(
          eq((CarPoolMembers as any).groupId, input.groupId),
          eq((CarPoolMembers as any).userId, user.id),
          eq((CarPoolMembers as any).isActive, true)
        ));

      if (membership.length === 0) {
        throw new ActionError({ code: "FORBIDDEN", message: "Not a member of this group" });
      }

      const group = await db
        .select()
        .from(CarPoolGroups as any)
        .where(eq((CarPoolGroups as any).id, input.groupId))
        .limit(1);

      if (group.length === 0) {
        throw new ActionError({ code: "NOT_FOUND", message: "Group not found" });
      }

      const members = await getActiveMembers(input.groupId);

      // Get fairness for each member
      const membersWithFairness = await Promise.all(
        members.map(async (member) => ({
          ...member,
          fairness: await calculateMemberFairness(member.id)
        }))
      );

      return {
        group: group[0],
        members: membersWithFairness
      };
    },
  }),

  // Delete a group and all V1 child records
  deleteGroup: defineAction({
    input: z.object({ groupId: z.string() }),
    handler: async (input, context) => {
      const user = requireUser(context);

      const group = await db
        .select()
        .from(CarPoolGroups as any)
        .where(eq((CarPoolGroups as any).id, input.groupId))
        .limit(1);

      if (group.length === 0) {
        throw new ActionError({ code: "NOT_FOUND", message: "Group not found" });
      }

      const isOwner = group[0].ownerId === user.id;
      const isAdmin = Number(user.roleId) === 1;

      if (!isOwner && !isAdmin) {
        throw new ActionError({ code: "FORBIDDEN", message: "Only the group owner or an admin can delete this group" });
      }

      const trips = await db
        .select()
        .from(CarPoolTrips as any)
        .where(eq((CarPoolTrips as any).groupId, input.groupId));

      for (const trip of trips) {
        await db
          .delete(CarPoolTripParticipants as any)
          .where(eq((CarPoolTripParticipants as any).tripId, trip.id));
      }

      await db
        .delete(CarPoolTrips as any)
        .where(eq((CarPoolTrips as any).groupId, input.groupId));

      await db
        .delete(CarPoolMembers as any)
        .where(eq((CarPoolMembers as any).groupId, input.groupId));

      await db
        .delete(CarPoolGroups as any)
        .where(eq((CarPoolGroups as any).id, input.groupId));

      return { success: true };
    },
  }),

  // Add members to group
  addGroupMembers: defineAction({
    input: z.object({
      groupId: z.string(),
      members: z.array(z.object({
        userId: z.string(),
        name: z.string()
      }))
    }),
    handler: async (input, context) => {
      const user = requireUser(context);

      // Check ownership
      const group = await db
        .select()
        .from(CarPoolGroups as any)
        .where(and(eq((CarPoolGroups as any).id, input.groupId), eq((CarPoolGroups as any).ownerId, user.id)))
        .limit(1);

      if (group.length === 0) {
        throw new ActionError({ code: "FORBIDDEN", message: "Not group owner" });
      }

      const existingMembers = await getActiveMembers(input.groupId);
      const maxOrder = existingMembers.length > 0 ? Math.max(...existingMembers.map(m => m.rotationOrder)) : -1;

      for (let i = 0; i < input.members.length; i++) {
        const memberId = generateId();
        await db.insert(CarPoolMembers as any).values({
          id: memberId,
          groupId: input.groupId,
          userId: input.members[i].userId,
          name: input.members[i].name,
          rotationOrder: maxOrder + i + 1,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      return { success: true };
    },
  }),

  // Create a trip
  createTrip: defineAction({
    input: z.object({
      groupId: z.string(),
      tripDate: z.string(),
      actualDriverId: z.string(),
      passengers: z.array(z.string()), // member IDs
      absentees: z.array(z.string()), // member IDs
      notes: z.string().optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);

      // Check membership
      const membership = await db
        .select()
        .from(CarPoolMembers as any)
        .where(and(
          eq((CarPoolMembers as any).groupId, input.groupId),
          eq((CarPoolMembers as any).userId, user.id),
          eq((CarPoolMembers as any).isActive, true)
        ))

      if (membership.length === 0) {
        throw new ActionError({ code: "FORBIDDEN", message: "Not a member of this group" });
      }

      // Check group not archived
      const group = await db
        .select()
        .from(CarPoolGroups as any)
        .where(eq((CarPoolGroups as any).id, input.groupId))
        .limit(1);

      if (group.length === 0) {
        throw new ActionError({ code: "NOT_FOUND", message: "Group not found" });
      }
      if (group[0].isArchived) {
        throw new ActionError({ code: "CONFLICT", message: "Archived groups cannot log new trips" });
      }

      const tripDate = new Date(input.tripDate);
      if (Number.isNaN(tripDate.getTime())) {
        throw new ActionError({ code: "BAD_REQUEST", message: "Trip date is invalid" });
      }

      const workingDays = Array.isArray(group[0].workingDays) ? group[0].workingDays : [];
      if (workingDays.length > 0 && !workingDays.includes(tripDate.getDay())) {
        throw new ActionError({ code: "BAD_REQUEST", message: "Trip date is outside the group's working days" });
      }

      // Check no duplicate trip date
      const existingTrip = await db
        .select()
        .from(CarPoolTrips as any)
        .where(and(
          eq((CarPoolTrips as any).groupId, input.groupId),
          eq((CarPoolTrips as any).tripDate, tripDate)
        ));

      if (existingTrip.length > 0) {
        throw new ActionError({ code: "CONFLICT", message: "Trip already exists for this date" });
      }

      const rotation = await getRotationContext(input.groupId, tripDate, input.absentees);
      const allMembers = rotation.members;
      const presentMembers = rotation.presentMembers;
      const memberMap = new Map(allMembers.map(m => [m.id, m]));

      // Validate driver
      if (!memberMap.has(input.actualDriverId)) {
        throw new ActionError({ code: "BAD_REQUEST", message: "Invalid driver" });
      }
      const driver = memberMap.get(input.actualDriverId)!;

      validateTripMemberPayload(input, memberMap);

      // Check at least 2 present members
      if (presentMembers.length < 2) {
        throw new ActionError({ code: "BAD_REQUEST", message: "Trip requires at least 2 present members" });
      }

      // Create trip
      const tripId = generateId();

      await db.insert(CarPoolTrips as any).values({
        id: tripId,
        groupId: input.groupId,
        tripDate,
        assignedDriverId: rotation.assignedDriver?.id ?? null,
        actualDriverId: driver.id,
        notes: input.notes,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await buildTripParticipants({ ...input, tripId }, rotation, memberMap);

      return { tripId };
    },
  }),

  // Update an existing trip
  updateTrip: defineAction({
    input: z.object({
      tripId: z.string(),
      groupId: z.string(),
      tripDate: z.string(),
      actualDriverId: z.string(),
      passengers: z.array(z.string()),
      absentees: z.array(z.string()),
      notes: z.string().optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);

      const trip = await db
        .select()
        .from(CarPoolTrips as any)
        .where(eq((CarPoolTrips as any).id, input.tripId))
        .limit(1);

      if (trip.length === 0) {
        throw new ActionError({ code: "NOT_FOUND", message: "Trip not found" });
      }

      if (trip[0].groupId !== input.groupId) {
        throw new ActionError({ code: "BAD_REQUEST", message: "Trip does not belong to this group" });
      }

      const membership = await db
        .select()
        .from(CarPoolMembers as any)
        .where(and(
          eq((CarPoolMembers as any).groupId, input.groupId),
          eq((CarPoolMembers as any).userId, user.id),
          eq((CarPoolMembers as any).isActive, true)
        ));

      if (membership.length === 0) {
        throw new ActionError({ code: "FORBIDDEN", message: "Not a member of this group" });
      }

      const group = await db
        .select()
        .from(CarPoolGroups as any)
        .where(eq((CarPoolGroups as any).id, input.groupId))
        .limit(1);

      if (group.length === 0) {
        throw new ActionError({ code: "NOT_FOUND", message: "Group not found" });
      }
      if (group[0].isArchived) {
        throw new ActionError({ code: "CONFLICT", message: "Archived groups cannot edit trips" });
      }

      const tripDate = new Date(input.tripDate);
      if (Number.isNaN(tripDate.getTime())) {
        throw new ActionError({ code: "BAD_REQUEST", message: "Trip date is invalid" });
      }

      const workingDays = Array.isArray(group[0].workingDays) ? group[0].workingDays : [];
      if (workingDays.length > 0 && !workingDays.includes(tripDate.getDay())) {
        throw new ActionError({ code: "BAD_REQUEST", message: "Trip date is outside the group's working days" });
      }

      const existingTrips = await db
        .select()
        .from(CarPoolTrips as any)
        .where(and(
          eq((CarPoolTrips as any).groupId, input.groupId),
          eq((CarPoolTrips as any).tripDate, tripDate)
        ));

      if (existingTrips.some((existingTrip) => existingTrip.id !== input.tripId)) {
        throw new ActionError({ code: "CONFLICT", message: "Trip already exists for this date" });
      }

      const rotation = await getRotationContext(input.groupId, tripDate, input.absentees);
      const allMembers = rotation.members;
      const presentMembers = rotation.presentMembers;
      const memberMap = new Map(allMembers.map(m => [m.id, m]));

      if (!memberMap.has(input.actualDriverId)) {
        throw new ActionError({ code: "BAD_REQUEST", message: "Invalid driver" });
      }

      validateTripMemberPayload(input, memberMap);

      if (presentMembers.length < 2) {
        throw new ActionError({ code: "BAD_REQUEST", message: "Trip requires at least 2 present members" });
      }

      await db
        .update(CarPoolTrips as any)
        .set({
          tripDate,
          assignedDriverId: rotation.assignedDriver?.id ?? null,
          actualDriverId: input.actualDriverId,
          notes: input.notes,
          updatedAt: new Date(),
        })
        .where(eq((CarPoolTrips as any).id, input.tripId));

      await db
        .delete(CarPoolTripParticipants as any)
        .where(eq((CarPoolTripParticipants as any).tripId, input.tripId));

      await buildTripParticipants(input, rotation, memberMap);

      return { success: true };
    },
  }),

  // List trip history
  listTripHistory: defineAction({
    input: z.object({ groupId: z.string(), limit: z.number().optional() }),
    handler: async (input, context) => {
      const user = requireUser(context);

      // Check membership
      const membership = await db
        .select()
        .from(CarPoolMembers as any)
        .where(and(
          eq((CarPoolMembers as any).groupId, input.groupId),
          eq((CarPoolMembers as any).userId, user.id),
          eq((CarPoolMembers as any).isActive, true)
        ));

      if (membership.length === 0) {
        throw new ActionError({ code: "FORBIDDEN", message: "Not a member of this group" });
      }

      const trips = await db
        .select()
        .from(CarPoolTrips as any)
        .where(eq((CarPoolTrips as any).groupId, input.groupId))
        .orderBy(desc((CarPoolTrips as any).tripDate))
        .limit(input.limit || 30);

      // Get participant counts for each trip
      const tripsWithCounts = await Promise.all(
        trips.map(async (trip) => {
          const participants = await db
            .select()
            .from(CarPoolTripParticipants as any)
            .where(eq((CarPoolTripParticipants as any).tripId, trip.id));

          const passengerCount = participants.filter(p => p.role === 'passenger' && p.attendanceStatus === 'present').length;
          const absenteeCount = participants.filter(p => p.attendanceStatus === 'absent').length;

          return {
            ...trip,
            passengerCount,
            absenteeCount
          };
        })
      );

      return { trips: tripsWithCounts };
    },
  }),

  // Load trip detail
  loadTripDetail: defineAction({
    input: z.object({ tripId: z.string() }),
    handler: async (input, context) => {
      const user = requireUser(context);

      const trip = await db
        .select()
        .from(CarPoolTrips as any)
        .where(eq((CarPoolTrips as any).id, input.tripId))
        .limit(1);

      if (trip.length === 0) {
        throw new ActionError({ code: "NOT_FOUND", message: "Trip not found" });
      }

      // Check membership in group
      const membership = await db
        .select()
        .from(CarPoolMembers as any)
        .where(and(
          eq((CarPoolMembers as any).groupId, trip[0].groupId),
          eq((CarPoolMembers as any).userId, user.id),
          eq((CarPoolMembers as any).isActive, true)
        ));

      if (membership.length === 0) {
        throw new ActionError({ code: "FORBIDDEN", message: "Not authorized to view this trip" });
      }

      const participants = await db
        .select()
        .from(CarPoolTripParticipants as any)
        .where(eq((CarPoolTripParticipants as any).tripId, input.tripId));

      // Get member details
      const memberIds = participants.map(p => p.memberId);
      const members = await db
        .select()
        .from(CarPoolMembers as any)
        .where(sql`${(CarPoolMembers as any).id} IN (${sql.join(memberIds, sql`, `)})`);

      const memberMap = new Map(members.map(m => [m.id, m]));

      const participantsWithDetails = participants.map(p => ({
        ...p,
        member: memberMap.get(p.memberId)
      }));

      return {
        trip: trip[0],
        participants: participantsWithDetails
      };
    },
  }),
};
