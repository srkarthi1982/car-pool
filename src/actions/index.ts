import { defineAction } from "astro:actions";
import { db, eq, and, desc, sql } from "astro:db";
import { z } from "astro:schema";
import { requireUser } from "./_guards";
import { CarPoolGroups, CarPoolMembers, CarPoolTrips, CarPoolTripParticipants } from "../../db/tables";

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

// Get suggested driver for a date
async function getSuggestedDriverForDate(groupId: string, tripDate: Date): Promise<string | null> {
  const members = await getActiveMembers(groupId);
  if (members.length === 0) return null;

  // For simplicity, use a deterministic rotation based on date
  // In a real implementation, this could be more sophisticated
  const dateStr = tripDate.toISOString().split('T')[0];
  const hash = dateStr.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
  const index = hash % members.length;
  return members[index].userId;
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
    if (p.role === 'driver') driveCount++;
    if (p.role === 'passenger') rideCount++;
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

      if (membership.length === 0) throw new Error("Not a member of this group");

      const group = await db
        .select()
        .from(CarPoolGroups as any)
        .where(eq((CarPoolGroups as any).id, input.groupId))
        .limit(1);

      if (group.length === 0) throw new Error("Group not found");

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

      if (group.length === 0) throw new Error("Not group owner");

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
      petrolAmount: z.number().optional(),
      tollAmount: z.number().optional(),
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

      if (membership.length === 0) throw new Error("Not a member of this group");

      // Check group not archived
      const group = await db
        .select()
        .from(CarPoolGroups as any)
        .where(eq((CarPoolGroups as any).id, input.groupId))
        .limit(1);

      if (group.length === 0 || group[0].isArchived) throw new Error("Group not found or archived");

      // Check no duplicate trip date
      const existingTrip = await db
        .select()
        .from(CarPoolTrips as any)
        .where(and(
          eq((CarPoolTrips as any).groupId, input.groupId),
          eq((CarPoolTrips as any).tripDate, new Date(input.tripDate))
        ));

      if (existingTrip.length > 0) throw new Error("Trip already exists for this date");

      // Get all active members
      const allMembers = await getActiveMembers(input.groupId);
      const memberMap = new Map(allMembers.map(m => [m.id, m]));

      // Validate driver
      if (!memberMap.has(input.actualDriverId)) throw new Error("Invalid driver");
      const driver = memberMap.get(input.actualDriverId)!;

      // Validate passengers and absentees
      const passengerSet = new Set(input.passengers);
      const absenteeSet = new Set(input.absentees);

      for (const pid of input.passengers) {
        if (!memberMap.has(pid)) throw new Error("Invalid passenger");
        if (pid === input.actualDriverId) throw new Error("Driver cannot be passenger");
      }

      for (const aid of input.absentees) {
        if (!memberMap.has(aid)) throw new Error("Invalid absentee");
        if (passengerSet.has(aid)) throw new Error("Absent member cannot be passenger");
      }

      // Check at least 2 active members
      if (allMembers.length < 2) throw new Error("Group must have at least 2 active members");

      // Create trip
      const tripId = generateId();
      const tripDate = new Date(input.tripDate);

      await db.insert(CarPoolTrips as any).values({
        id: tripId,
        groupId: input.groupId,
        tripDate,
        assignedDriverId: await getSuggestedDriverForDate(input.groupId, tripDate),
        actualDriverId: driver.userId,
        petrolAmount: input.petrolAmount,
        tollAmount: input.tollAmount,
        notes: input.notes,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Create participants
      const participants = [];

      // Driver
      participants.push({
        id: generateId(),
        tripId,
        memberId: input.actualDriverId,
        role: 'driver',
        attendanceStatus: 'present',
        receivedRide: false,
        missedRide: false,
        createdAt: new Date(),
      });

      // Passengers
      for (const pid of input.passengers) {
        participants.push({
          id: generateId(),
          tripId,
          memberId: pid,
          role: 'passenger',
          attendanceStatus: 'present',
          receivedRide: true,
          missedRide: false,
          createdAt: new Date(),
        });
      }

      // Absentees
      for (const aid of input.absentees) {
        const member = memberMap.get(aid)!;
        // Check if they would have been a passenger in normal rotation
        const wouldBePassenger = driver.userId !== member.userId; // Simple check

        participants.push({
          id: generateId(),
          tripId,
          memberId: aid,
          role: wouldBePassenger ? 'passenger' : 'driver',
          attendanceStatus: 'absent',
          receivedRide: false,
          missedRide: wouldBePassenger,
          createdAt: new Date(),
        });
      }

      // Insert all participants
      for (const p of participants) {
        await db.insert(CarPoolTripParticipants as any).values(p);
      }

      return { tripId };
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

      if (membership.length === 0) throw new Error("Not a member of this group");

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

      if (trip.length === 0) throw new Error("Trip not found");

      // Check membership in group
      const membership = await db
        .select()
        .from(CarPoolMembers as any)
        .where(and(
          eq((CarPoolMembers as any).groupId, trip[0].groupId),
          eq((CarPoolMembers as any).userId, user.id),
          eq((CarPoolMembers as any).isActive, true)
        ));

      if (membership.length === 0) throw new Error("Not authorized to view this trip");

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
