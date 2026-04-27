import {
  CarPoolGroups,
  CarPoolMembers,
  CarPoolTripParticipants,
  CarPoolTrips,
  and,
  db,
  eq,
  sql,
} from "astro:db";

const GROUP_ID = "1777305269408-24idtvlpl";
const START_DATE = "2026-01-01";
const END_DATE = "2026-04-27";

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function atUtcDate(dateKeyValue: string) {
  return new Date(`${dateKeyValue}T00:00:00.000Z`);
}

function atCreatedTime(dateKeyValue: string) {
  return new Date(`${dateKeyValue}T16:00:00.000Z`);
}

function tripIdFor(dateKeyValue: string) {
  return `seed-gal-trip-${dateKeyValue}`;
}

function participantIdFor(dateKeyValue: string, memberId: string) {
  return `seed-gal-trip-${dateKeyValue}-${memberId}`;
}

function weekdayDates(startDate: string, endDate: string, workingDays: number[]) {
  const dates: string[] = [];
  const current = atUtcDate(startDate);
  const end = atUtcDate(endDate);

  while (current.getTime() <= end.getTime()) {
    if (workingDays.includes(current.getUTCDay())) {
      dates.push(dateKey(current));
    }
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return dates;
}

export default async function seedGalCarPoolJanAprBackfill() {
const groups = await db
  .select()
  .from(CarPoolGroups as any)
  .where(eq((CarPoolGroups as any).id, GROUP_ID))
  .limit(1);

if (groups.length !== 1) {
  throw new Error(`Expected one GAL Car Pool group, found ${groups.length}.`);
}

const group = groups[0];
if (group.isArchived) {
  throw new Error("GAL Car Pool is archived; seed aborted.");
}

const members = await db
  .select()
  .from(CarPoolMembers as any)
  .where(and(eq((CarPoolMembers as any).groupId, GROUP_ID), eq((CarPoolMembers as any).isActive, true)))
  .orderBy((CarPoolMembers as any).rotationOrder);

const expectedNames = ["Administrator", "Karthikeyan", "Vijayalakshmi", "Lakshman"];
const memberNames = members.map((member) => member.name);
for (const expectedName of expectedNames) {
  if (!memberNames.includes(expectedName)) {
    throw new Error(`Missing expected member: ${expectedName}.`);
  }
}

const workingDays = Array.isArray(group.workingDays) ? group.workingDays : [1, 2, 3, 4, 5];
const dates = weekdayDates(START_DATE, END_DATE, workingDays);

const existingTrips = await db
  .select()
  .from(CarPoolTrips as any)
  .where(eq((CarPoolTrips as any).groupId, GROUP_ID));

const existingTripDates = new Set(existingTrips.map((trip) => dateKey(new Date(trip.tripDate))));
let insertedTrips = 0;
let insertedParticipants = 0;

for (let index = 0; index < dates.length; index += 1) {
  const currentDateKey = dates[index];
  if (existingTripDates.has(currentDateKey)) {
    continue;
  }

  const driver = members[(index + 1) % members.length];
  const tripId = tripIdFor(currentDateKey);
  const tripDate = atUtcDate(currentDateKey);
  const timestamp = atCreatedTime(currentDateKey);

  await db.insert(CarPoolTrips as any).values({
    id: tripId,
    groupId: GROUP_ID,
    tripDate,
    assignedDriverId: driver.id,
    actualDriverId: driver.id,
    notes: "Jan-Apr 2026 commute backfill.",
    createdAt: timestamp,
    updatedAt: timestamp,
  });
  insertedTrips += 1;

  for (const member of members) {
    const isDriver = member.id === driver.id;
    await db.insert(CarPoolTripParticipants as any).values({
      id: participantIdFor(currentDateKey, member.id),
      tripId,
      memberId: member.id,
      role: isDriver ? "driver" : "passenger",
      attendanceStatus: "present",
      receivedRide: !isDriver,
      missedRide: false,
      createdAt: timestamp,
    });
    insertedParticipants += 1;
  }
}

const finalTripCount = await db
  .select({ count: sql`count(*)` })
  .from(CarPoolTrips as any)
  .where(eq((CarPoolTrips as any).groupId, GROUP_ID));

console.log({
  groupId: GROUP_ID,
  dateRange: `${START_DATE} to ${END_DATE}`,
  weekdayDates: dates.length,
  skippedExistingTrips: dates.length - insertedTrips,
  insertedTrips,
  insertedParticipants,
  finalTripCount: finalTripCount[0]?.count,
});
}
