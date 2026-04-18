import { defineAction } from "astro:actions";
import { db, eq, and } from "astro:db";
import { z } from "astro:schema";
import { requireUser } from "./_guards";
import { CarPoolGroups, CarPoolGroupMembers, CarPoolWorkingDays, CarPoolTrips } from "../../db/tables";

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function generateId(): string {
  // Simple ID generation using timestamp + random number
  // Works server-side only
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Simple rotation: get the suggested driver for a given date
async function getSuggestedDriverForGroupDate(
  groupId: string,
  tripDate: Date
): Promise<string | null> {
  const groupResults = await db.select().from(CarPoolGroups).where(eq(CarPoolGroups.id, groupId));
  if (!groupResults || groupResults.length === 0) return null;

  const group = groupResults[0];

  // Get active members ordered by sortOrder
  const members = await db
    .select()
    .from(CarPoolGroupMembers)
    .where(and(eq(CarPoolGroupMembers.groupId, groupId), eq(CarPoolGroupMembers.isActive, true)));

  const sortedMembers = members.sort((a, b) => a.sortOrder - b.sortOrder);

  if (sortedMembers.length === 0) return null;

  // Get working days for the group
  const workingDaysRecords = await db
    .select()
    .from(CarPoolWorkingDays)
    .where(eq(CarPoolWorkingDays.groupId, groupId));

  const workingDaysOfWeek = new Set(workingDaysRecords.map((d) => d.dayOfWeek));

  // Count working days from start date to target date
  const startDate = new Date(group.startDate);
  let currentDate = new Date(startDate);
  let workingDayCount = 0;

  while (currentDate <= tripDate) {
    const dayOfWeek = currentDate.getDay();
    if (workingDaysOfWeek.size === 0 || workingDaysOfWeek.has(dayOfWeek)) {
      if (currentDate.getTime() < tripDate.getTime()) {
        workingDayCount++;
      }
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Get the driver index (simple rotation)
  const driverIndex = workingDayCount % sortedMembers.length;
  return sortedMembers[driverIndex].userId;
}

// ============================================================================
// ACTIONS DEFINITION
// ============================================================================

export const server = {
  // Group actions
  createGroup: defineAction({
    input: z.object({
      name: z.string().min(1),
      rotationType: z.enum(["simple_rotation", "complex_rotation"]),
      startDate: z.string(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);
      const groupId = generateId();
      const startDate = new Date(input.startDate);

      await db.insert(CarPoolGroups).values({
        id: groupId,
        createdByUserId: user.id,
        name: input.name,
        rotationType: input.rotationType,
        startDate: startDate,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Add creator as first member
      const memberId = generateId();
      await db.insert(CarPoolGroupMembers).values({
        id: memberId,
        groupId,
        userId: user.id,
        sortOrder: 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return { success: true, groupId };
    },
  }),

  updateGroup: defineAction({
    input: z.object({
      groupId: z.string(),
      name: z.string().min(1).optional(),
      rotationType: z.enum(["simple_rotation", "complex_rotation"]).optional(),
      startDate: z.string().optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);

      const groupResults = await db.select().from(CarPoolGroups).where(eq(CarPoolGroups.id, input.groupId));
      if (!groupResults || groupResults.length === 0) throw new Error("Group not found");

      const group = groupResults[0];
      if (group.createdByUserId !== user.id) throw new Error("Only group creator can edit group");

      const updates: any = { updatedAt: new Date() };
      if (input.name !== undefined) updates.name = input.name;
      if (input.rotationType !== undefined) updates.rotationType = input.rotationType;
      if (input.startDate !== undefined) updates.startDate = new Date(input.startDate);

      await db.update(CarPoolGroups).set(updates).where(eq(CarPoolGroups.id, input.groupId));

      return { success: true };
    },
  }),

  addGroupMembers: defineAction({
    input: z.object({
      groupId: z.string(),
      userIds: z.array(z.string()),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);

      const groupResults = await db.select().from(CarPoolGroups).where(eq(CarPoolGroups.id, input.groupId));
      if (!groupResults || groupResults.length === 0) throw new Error("Group not found");

      const group = groupResults[0];
      if (group.createdByUserId !== user.id) throw new Error("Only group creator can add members");

      const members = await db.select().from(CarPoolGroupMembers).where(eq(CarPoolGroupMembers.groupId, input.groupId));
      const maxOrder = members.length > 0 ? Math.max(...members.map((m) => m.sortOrder)) : -1;

      for (let i = 0; i < input.userIds.length; i++) {
        const memberId = generateId();
        await db.insert(CarPoolGroupMembers).values({
          id: memberId,
          groupId: input.groupId,
          userId: input.userIds[i],
          sortOrder: maxOrder + i + 1,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      return { success: true };
    },
  }),

  loadUserGroups: defineAction({
    input: z.any().optional(),
    handler: async (_, context) => {
      const user = requireUser(context);

      const members = await db
        .select()
        .from(CarPoolGroupMembers)
        .where(eq(CarPoolGroupMembers.userId, user.id));

      const groupIds = members.map((m) => m.groupId);

      let groups: any[] = [];
      if (groupIds.length > 0) {
        const allGroups = await db.select().from(CarPoolGroups);
        groups = allGroups.filter((g) => groupIds.includes(g.id));
      }

      return { groups };
    },
  }),

  loadGroupDetail: defineAction({
    input: z.object({ groupId: z.string() }),
    handler: async (input, context) => {
      const user = requireUser(context);

      const userMembership = await db
        .select()
        .from(CarPoolGroupMembers)
        .where(and(eq(CarPoolGroupMembers.groupId, input.groupId), eq(CarPoolGroupMembers.userId, user.id)));

      if (userMembership.length === 0) throw new Error("You are not a member of this group");

      const groupResults = await db.select().from(CarPoolGroups).where(eq(CarPoolGroups.id, input.groupId));
      const group = groupResults.length > 0 ? groupResults[0] : null;

      const members = await db
        .select()
        .from(CarPoolGroupMembers)
        .where(eq(CarPoolGroupMembers.groupId, input.groupId));

      const sortedMembers = members.sort((a, b) => a.sortOrder - b.sortOrder);

      const workingDays = await db.select().from(CarPoolWorkingDays).where(eq(CarPoolWorkingDays.groupId, input.groupId));

      return { group, members: sortedMembers, workingDays };
    },
  }),

  getSuggestedDriverForDate: defineAction({
    input: z.object({
      groupId: z.string(),
      date: z.string(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);

      const userMembership = await db
        .select()
        .from(CarPoolGroupMembers)
        .where(and(eq(CarPoolGroupMembers.groupId, input.groupId), eq(CarPoolGroupMembers.userId, user.id)));

      if (userMembership.length === 0) throw new Error("You are not a member of this group");

      const suggestedDriverUserId = await getSuggestedDriverForGroupDate(input.groupId, new Date(input.date));
      return { suggestedDriverUserId };
    },
  }),

  createTrip: defineAction({
    input: z.object({
      groupId: z.string(),
      tripDate: z.string(),
      actualDriverUserId: z.string().optional(),
      petrolAmount: z.number().optional(),
      tollAmount: z.number().optional(),
      notes: z.string().optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);

      const userMembership = await db
        .select()
        .from(CarPoolGroupMembers)
        .where(and(eq(CarPoolGroupMembers.groupId, input.groupId), eq(CarPoolGroupMembers.userId, user.id)));

      if (userMembership.length === 0) throw new Error("You are not a member of this group");

      const tripDate = new Date(input.tripDate);
      const tripDateKey = tripDate.toISOString().split("T")[0];
      const existingTrips = await db
        .select()
        .from(CarPoolTrips)
        .where(eq(CarPoolTrips.groupId, input.groupId));

      const duplicateTrip = existingTrips.find((t) => {
        const existingDateKey = new Date(t.tripDate).toISOString().split("T")[0];
        return existingDateKey === tripDateKey;
      });

      if (duplicateTrip) throw new Error("A trip already exists for this group and date");

      const tripId = generateId();
      const suggestedDriver = await getSuggestedDriverForGroupDate(input.groupId, tripDate);

      await db.insert(CarPoolTrips).values({
        id: tripId,
        groupId: input.groupId,
        tripDate: tripDate,
        suggestedDriverUserId: suggestedDriver || undefined,
        actualDriverUserId: input.actualDriverUserId,
        petrolAmount: input.petrolAmount,
        tollAmount: input.tollAmount,
        notes: input.notes,
        createdByUserId: user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return { success: true, tripId };
    },
  }),

  updateOwnTrip: defineAction({
    input: z.object({
      tripId: z.string(),
      actualDriverUserId: z.string().optional(),
      presentUserIdsJson: z.string().optional(),
      absentUserIdsJson: z.string().optional(),
      petrolAmount: z.number().optional(),
      tollAmount: z.number().optional(),
      notes: z.string().optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);

      const tripResults = await db.select().from(CarPoolTrips).where(eq(CarPoolTrips.id, input.tripId));
      if (!tripResults || tripResults.length === 0) throw new Error("Trip not found");

      const trip = tripResults[0];
      if (trip.createdByUserId !== user.id) throw new Error("You can only edit trips you created");

      const updates: any = { updatedAt: new Date() };
      if (input.actualDriverUserId !== undefined) updates.actualDriverUserId = input.actualDriverUserId;
      if (input.presentUserIdsJson !== undefined) updates.presentUserIdsJson = input.presentUserIdsJson;
      if (input.absentUserIdsJson !== undefined) updates.absentUserIdsJson = input.absentUserIdsJson;
      if (input.petrolAmount !== undefined) updates.petrolAmount = input.petrolAmount;
      if (input.tollAmount !== undefined) updates.tollAmount = input.tollAmount;
      if (input.notes !== undefined) updates.notes = input.notes;

      await db.update(CarPoolTrips).set(updates).where(eq(CarPoolTrips.id, input.tripId));

      return { success: true };
    },
  }),

  listTripHistory: defineAction({
    input: z.object({
      groupId: z.string(),
      limit: z.number().optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);

      const userMembership = await db
        .select()
        .from(CarPoolGroupMembers)
        .where(and(eq(CarPoolGroupMembers.groupId, input.groupId), eq(CarPoolGroupMembers.userId, user.id)));

      if (userMembership.length === 0) throw new Error("You are not a member of this group");

      const allTrips = await db.select().from(CarPoolTrips).where(eq(CarPoolTrips.groupId, input.groupId));

      const trips = allTrips
        .sort((a, b) => new Date(b.tripDate).getTime() - new Date(a.tripDate).getTime())
        .slice(0, input.limit || 30);

      return { trips };
    },
  }),

  // Additional member & working day actions
  updateGroupMemberOrder: defineAction({
    input: z.object({
      groupId: z.string(),
      memberOrder: z.array(z.object({ memberId: z.string(), sortOrder: z.number() })),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);

      const groupResults = await db.select().from(CarPoolGroups).where(eq(CarPoolGroups.id, input.groupId));
      if (!groupResults || groupResults.length === 0) throw new Error("Group not found");

      const group = groupResults[0];
      if (group.createdByUserId !== user.id) throw new Error("Only group creator can reorder members");

      for (const item of input.memberOrder) {
        await db
          .update(CarPoolGroupMembers)
          .set({ sortOrder: item.sortOrder, updatedAt: new Date() })
          .where(eq(CarPoolGroupMembers.id, item.memberId));
      }

      return { success: true };
    },
  }),

  removeGroupMember: defineAction({
    input: z.object({ groupId: z.string(), memberId: z.string() }),
    handler: async (input, context) => {
      const user = requireUser(context);

      const groupResults = await db.select().from(CarPoolGroups).where(eq(CarPoolGroups.id, input.groupId));
      if (!groupResults || groupResults.length === 0) throw new Error("Group not found");

      const group = groupResults[0];
      if (group.createdByUserId !== user.id) throw new Error("Only group creator can remove members");

      const memberResults = await db.select().from(CarPoolGroupMembers).where(eq(CarPoolGroupMembers.id, input.memberId));
      if (!memberResults || memberResults.length === 0) throw new Error("Member not found");

      const member = memberResults[0];

      const memberTrips = await db
        .select()
        .from(CarPoolTrips)
        .where(and(eq(CarPoolTrips.groupId, input.groupId), eq(CarPoolTrips.createdByUserId, member.userId)));

      if (memberTrips.length > 0) throw new Error("Cannot remove member with existing trips");

      await db
        .update(CarPoolGroupMembers)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(CarPoolGroupMembers.id, input.memberId));

      return { success: true };
    },
  }),

  saveWorkingDays: defineAction({
    input: z.object({
      groupId: z.string(),
      daysOfWeek: z.array(z.number().min(0).max(6)),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);

      const groupResults = await db.select().from(CarPoolGroups).where(eq(CarPoolGroups.id, input.groupId));
      if (!groupResults || groupResults.length === 0) throw new Error("Group not found");

      const group = groupResults[0];
      if (group.createdByUserId !== user.id) throw new Error("Only group creator can set working days");

      for (const dayOfWeek of input.daysOfWeek) {
        const dayId = generateId();
        await db.insert(CarPoolWorkingDays).values({
          id: dayId,
          groupId: input.groupId,
          dayOfWeek,
          createdAt: new Date(),
        });
      }

      return { success: true };
    },
  }),
};
