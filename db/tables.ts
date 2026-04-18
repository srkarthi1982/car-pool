import { column, defineTable, sql } from 'astro:db';

// CarPoolGroups: Shared group with rotation type
export const CarPoolGroups = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    createdByUserId: column.text(),
    name: column.text(),
    rotationType: column.text({ default: 'simple_rotation' }), // 'simple_rotation' | 'complex_rotation'
    startDate: column.date(),
    isActive: column.boolean({ default: true }),
    createdAt: column.date({ default: sql`CURRENT_TIMESTAMP` }),
    updatedAt: column.date({ default: sql`CURRENT_TIMESTAMP` }),
  },
});

// CarPoolGroupMembers: Fixed group membership with user identity
export const CarPoolGroupMembers = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    groupId: column.text(),
    userId: column.text(), // Real Ansiversa user ID
    sortOrder: column.number(), // Member order for rotation
    isActive: column.boolean({ default: true }),
    createdAt: column.date({ default: sql`CURRENT_TIMESTAMP` }),
    updatedAt: column.date({ default: sql`CURRENT_TIMESTAMP` }),
  },
});

// CarPoolWorkingDays: Configurable working days per group
export const CarPoolWorkingDays = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    groupId: column.text(),
    dayOfWeek: column.number(), // 0-6 (Sunday-Saturday)
    createdAt: column.date({ default: sql`CURRENT_TIMESTAMP` }),
  },
});

// CarPoolTrips: Trip records with ownership and attendance
export const CarPoolTrips = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    groupId: column.text(),
    tripDate: column.date(),
    suggestedDriverUserId: column.text({ optional: true }),
    actualDriverUserId: column.text({ optional: true }),
    presentUserIdsJson: column.text({ optional: true }), // JSON array of present user IDs
    absentUserIdsJson: column.text({ optional: true }), // JSON array of absent user IDs
    petrolAmount: column.number({ optional: true }),
    tollAmount: column.number({ optional: true }),
    notes: column.text({ optional: true }),
    createdByUserId: column.text(), // Trip ownership
    createdAt: column.date({ default: sql`CURRENT_TIMESTAMP` }),
    updatedAt: column.date({ default: sql`CURRENT_TIMESTAMP` }),
  },
});

export const carPoolTables = {
  CarPoolGroups,
  CarPoolGroupMembers,
  CarPoolWorkingDays,
  CarPoolTrips,
} as const;
