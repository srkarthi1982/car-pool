import { column, defineTable, sql } from 'astro:db';

// CarPoolGroups: Shared group
export const CarPoolGroups = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    ownerId: column.text(),
    name: column.text(),
    workingDays: column.json(), // array of weekday numbers
    isArchived: column.boolean({ default: false }),
    createdAt: column.date({ default: sql`CURRENT_TIMESTAMP` }),
    updatedAt: column.date({ default: sql`CURRENT_TIMESTAMP` }),
  },
});

// CarPoolMembers: Group membership
export const CarPoolMembers = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    groupId: column.text(),
    userId: column.text(),
    name: column.text(),
    rotationOrder: column.number(),
    isActive: column.boolean({ default: true }),
    createdAt: column.date({ default: sql`CURRENT_TIMESTAMP` }),
    updatedAt: column.date({ default: sql`CURRENT_TIMESTAMP` }),
  },
});

// CarPoolTrips: Trip records
export const CarPoolTrips = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    groupId: column.text(),
    tripDate: column.date(),
    assignedDriverId: column.text({ optional: true }),
    actualDriverId: column.text({ optional: true }),
    notes: column.text({ optional: true }),
    createdAt: column.date({ default: sql`CURRENT_TIMESTAMP` }),
    updatedAt: column.date({ default: sql`CURRENT_TIMESTAMP` }),
  },
});

// CarPoolTripParticipants: Trip participation details
export const CarPoolTripParticipants = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    tripId: column.text(),
    memberId: column.text(),
    role: column.text(), // 'driver' | 'passenger'
    attendanceStatus: column.text(), // 'present' | 'absent'
    receivedRide: column.boolean(),
    missedRide: column.boolean(),
    createdAt: column.date({ default: sql`CURRENT_TIMESTAMP` }),
  },
});

export const carPoolTables = {
  CarPoolGroups,
  CarPoolMembers,
  CarPoolTrips,
  CarPoolTripParticipants,
} as const;
