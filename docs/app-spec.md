# Car Pool V1.1 Product Specification (Engineering Grade)

## 1. Product Definition

Car Pool is a private commute fairness system for fixed office groups.

It manages:
- driver rotation among present members
- attendance-aware scheduling
- trip logging
- fairness tracking over time

---

## 2. Core Principle

> Rotation decides "who drives today"  
> Fairness tracking ensures "nobody loses over time"

---

## 3. V1 Scope

### INCLUDED
- group creation
- member management
- attendance handling
- rotation engine
- trip logging
- fairness tracking (basic)
- cost logging (informational only)

### EXCLUDED
- payments
- GPS / maps
- chat
- notifications
- public ride sharing
- AI optimization

---

## 4. Route Model

- `/` → landing
- `/app` → group list
- `/app/groups/[id]` → group dashboard
- `/app/groups/[id]/trips` → trip history
- `/app/groups/[id]/trips/[tripId]` → trip detail

---

## 5. Data Model (FINAL)

### CarPoolGroups
- id
- ownerId
- name
- workingDays (array of weekday numbers)
- isArchived
- createdAt
- updatedAt

---

### CarPoolMembers
- id
- groupId
- userId
- name
- rotationOrder (integer, unique per group)
- isActive
- createdAt
- updatedAt

---

### CarPoolTrips
- id
- groupId
- tripDate (unique per group)
- assignedDriverId
- actualDriverId
- petrolAmount (optional)
- tollAmount (optional)
- notes
- createdAt
- updatedAt

---

### CarPoolTripParticipants (CRITICAL TABLE)
- id
- tripId
- memberId
- role (driver | passenger)
- attendanceStatus (present | absent)
- receivedRide (boolean)
- missedRide (boolean)
- createdAt

---

## 6. Attendance Rules

### Default
- all members are assumed **present**

### Absence
- absence must be explicitly marked per date
- absent members are excluded from rotation

---

## 7. Rotation Engine (DETERMINISTIC)

### Step 1
Get:
```text
ActiveMembers = members where attendanceStatus = present
```

### Step 2

If:

ActiveMembers.length == 0 → skip trip
ActiveMembers.length == 1 → no trip (solo commute, no logging required)

### Step 3

Driver selection rule:

Driver = next member in base rotation order
filtered by ActiveMembers

### Step 4 (tie-breaker / fairness assist)

If multiple eligible:

Driver = member with lowest driveCount among ActiveMembers
tie-breaker = rotationOrder

## 8. Trip Logging Rules

Each working day → at most one trip per group.

Trip must store:

actual driver
list of passengers
absentees

## 9. Fairness Engine (CRITICAL)

Each member must track:

driveCount
rideCount
absenceCount
missedRideCount

### Update Rules Per Trip
Driver:
driveCount += 1
receivedRide = false

Passenger:
rideCount += 1
receivedRide = true

Absent member:
absenceCount += 1
receivedRide = false

### Missed Ride Rule (IMPORTANT)

If:

member is absent
AND would have been a passenger in a normal rotation cycle

Then:

missedRideCount += 1

## 10. Fairness Interpretation

Per member:

fairnessScore = driveCount - rideCount

Optional display:

positive → contributed more (drove more)
negative → benefited more (rode more)

Missed rides are shown separately:

transparency only
no auto adjustment in V1

## 11. Cost Logging
petrolAmount (optional)
tollAmount (optional)

Rules:

stored per trip
no automatic splitting
no settlement engine

## 12. Validation Rules
group must have ≥ 2 active members
tripDate must be unique per group
actualDriver must be present member
passenger must be present member
absent member cannot be passenger
driver cannot be passenger
invalid group → 404
invalid trip → redirect safely

## 13. Edge Cases (DEFINED)
1 member present

→ no trip recorded

0 members present

→ skip day

assigned driver absent

→ select next eligible present member

weekend / non-working day

→ no trip

member inactive

→ excluded from rotation

duplicate date

→ reject

## 14. UI Requirements (MINIMAL V1)
Group Dashboard
today's driver
member list (present/absent)
next drivers preview

Trip Form
driver select
passenger checkboxes
absence toggle
cost input

Fairness Panel
drives per member
rides per member
missed rides
simple balance indicator

## 15. Testing Checklist
rotation works with 4 members
rotation works with 3 members
rotation works with 2 members
absence affects rotation correctly
fairness updates correctly
missed ride recorded correctly
duplicate trips blocked
invalid access safe

## 16. Final Principle

The system must always be predictable, transparent, and fair over time.

---

# 🚀 Next Step

Now we do **one thing only**:

👉 Send this to Codex and say:

> "Implement exactly as per spec V1.1"

---

## 🧠 Final note

Partner, now:
- No ambiguity
- No guesswork
- No hidden logic

👉 This is now at **ad-copy-assistant level clarity**

---

When ready, say:
👉 **"Create implementation task"**

I'll give you the **perfect Codex execution task**.