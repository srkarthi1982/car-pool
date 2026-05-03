import type { Alpine } from "alpinejs";
import { AvBaseStore } from "@ansiversa/components/alpine";
import { actions } from "astro:actions";

// Type definitions
export interface CarPoolGroup {
  id: string;
  ownerId: string;
  name: string;
  workingDays: number[];
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CarPoolMember {
  id: string;
  groupId: string;
  userId: string;
  name: string;
  rotationOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  fairness?: {
    driveCount: number;
    rideCount: number;
    absenceCount: number;
    missedRideCount: number;
    fairnessScore: number;
  };
}

export interface CarPoolTrip {
  id: string;
  groupId: string;
  tripDate: Date;
  assignedDriverId?: string;
  actualDriverId?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  passengerCount?: number;
  absenteeCount?: number;
}

type FairnessStatus = "Driving more" | "Balanced" | "Receiving more";

type DriverCandidate = {
  member: CarPoolMember;
  driveCount: number;
  rideCount: number;
  absenceCount: number;
  missedRideCount: number;
  fairnessScore: number;
};

export interface TripParticipant {
  id: string;
  tripId: string;
  memberId: string;
  role: 'driver' | 'passenger';
  attendanceStatus: 'present' | 'absent';
  receivedRide: boolean;
  missedRide: boolean;
  createdAt: Date;
  member?: CarPoolMember;
}

export class CarPoolAppStore extends AvBaseStore {
  // State
  groups: CarPoolGroup[] = [];
  currentUser: { id: string | null; roleId: number | null } = { id: null, roleId: null };
  selectedGroupId: string | null = null;
  selectedGroupDetail: {
    group: CarPoolGroup | null;
    members: CarPoolMember[];
  } = {
    group: null,
    members: [],
  };

  tripHistory: CarPoolTrip[] = [];
  selectedTrip: {
    trip: CarPoolTrip | null;
    participants: TripParticipant[];
  } = {
    trip: null,
    participants: [],
  };

  // UI state
  isLoading = false;
  error: string | null = null;
  currentView: 'groups' | 'group-dashboard' | 'trip-history' | 'trip-detail' = 'groups';
  showCreateGroupDrawer = false;
  showEditGroupDrawer = false;
  showAddMembersDrawer = false;
  showEditMemberDrawer = false;
  showCreateTripDrawer = false;
  editingTripId: string | null = null;
  pendingDeleteGroupId: string | null = null;
  pendingRemoveMemberId: string | null = null;
  travellingMemberIds: string[] = [];

  // Form state
  createGroupForm = {
    name: "",
    workingDays: [1, 2, 3, 4, 5], // Mon-Fri
  };

  editGroupForm = {
    name: "",
  };

  addMembersForm = {
    members: [] as Array<{ userId: string; name: string }>,
  };

  editMemberForm = {
    memberId: "",
    name: "",
  };

  createTripForm = {
    tripDate: new Date().toISOString().split("T")[0],
    actualDriverId: "",
    passengers: [] as string[],
    absentees: [] as string[],
    notes: "",
  };

  initializeIndex(serializedState?: string) {
    const state = this.parseState(serializedState);
    this.groups = Array.isArray(state.groups) ? state.groups : [];
    this.currentUser = this.parseCurrentUser(state.currentUser);
    this.selectedGroupId = null;
    this.selectedGroupDetail = { group: null, members: [] };
    this.tripHistory = [];
    this.selectedTrip = { trip: null, participants: [] };
    this.currentView = "groups";
    this.error = typeof state.loadError === "string" && state.loadError.length > 0 ? state.loadError : null;
  }

  initializeGroupWorkspace(serializedState?: string) {
    const state = this.parseState(serializedState);
    this.currentUser = this.parseCurrentUser(state.currentUser);
    this.selectedGroupId = typeof state.groupId === "string" ? state.groupId : null;
    this.selectedGroupDetail = {
      group: state.groupDetail?.group ?? null,
      members: Array.isArray(state.groupDetail?.members) ? state.groupDetail.members : [],
    };
    this.resetTravellingMembers();
    this.tripHistory = Array.isArray(state.tripHistory) ? state.tripHistory : [];
    this.selectedTrip = { trip: null, participants: [] };
    this.currentView = "group-dashboard";
    this.error = typeof state.loadError === "string" && state.loadError.length > 0 ? state.loadError : null;
  }

  initializeTripHistoryPage(serializedState?: string) {
    const state = this.parseState(serializedState);
    this.currentUser = this.parseCurrentUser(state.currentUser);
    this.selectedGroupId = typeof state.groupId === "string" ? state.groupId : null;
    this.tripHistory = Array.isArray(state.tripHistory) ? state.tripHistory : [];
    this.currentView = "trip-history";
    this.error = typeof state.loadError === "string" && state.loadError.length > 0 ? state.loadError : null;
  }

  initializeTripDetailPage(serializedState?: string) {
    const state = this.parseState(serializedState);
    this.currentUser = this.parseCurrentUser(state.currentUser);
    this.selectedGroupId = typeof state.groupId === "string" ? state.groupId : null;
    this.selectedGroupDetail = {
      group: state.groupDetail?.group ?? null,
      members: Array.isArray(state.groupDetail?.members) ? state.groupDetail.members : [],
    };
    this.selectedTrip = {
      trip: state.tripDetail?.trip ?? null,
      participants: Array.isArray(state.tripDetail?.participants) ? state.tripDetail.participants : [],
    };
    this.currentView = "trip-detail";
    this.error = typeof state.loadError === "string" && state.loadError.length > 0 ? state.loadError : null;
  }

  // ============================================================================
  // NAVIGATION
  // ============================================================================

  navigateToGroups() {
    this.visit("/app");
  }

  navigateToGroup(groupId: string) {
    this.visit(`/app/groups/${groupId}`);
  }

  navigateToTripHistory() {
    if (!this.selectedGroupId) return;
    this.visit(`/app/groups/${this.selectedGroupId}/trips`);
  }

  navigateToTripDetail(tripId: string) {
    if (!this.selectedGroupId) return;
    this.visit(`/app/groups/${this.selectedGroupId}/trips/${tripId}`);
  }

  // ============================================================================
  // GROUP LOADING & MANAGEMENT
  // ============================================================================

  async loadUserGroups() {
    this.isLoading = true;
    this.error = null;
    try {
      const result = await actions.loadUserGroups({});
      this.groups = (result.data?.groups as any) || [];
    } catch (err: any) {
      this.error = err.message || "Failed to load groups";
    } finally {
      this.isLoading = false;
    }
  }

  async loadGroupDetail() {
    if (!this.selectedGroupId) return;

    this.isLoading = true;
    this.error = null;
    try {
      const result = await actions.loadGroupDetail({ groupId: this.selectedGroupId });
      this.selectedGroupDetail = {
        group: (result.data?.group as any) ?? null,
        members: (result.data?.members as any) || [],
      };
      this.resetTravellingMembers();
    } catch (err: any) {
      this.error = err.message || "Failed to load group detail";
    } finally {
      this.isLoading = false;
    }
  }

  openCreateGroupDrawer() {
    this.showCreateGroupDrawer = true;
    this.error = null;
  }

  closeCreateGroupDrawer() {
    this.showCreateGroupDrawer = false;
    this.createGroupForm = {
      name: "",
      workingDays: [1, 2, 3, 4, 5],
    };
  }

  async submitCreateGroup() {
    if (!this.createGroupForm.name.trim()) {
      this.error = "Group name is required";
      return;
    }

    const workingDays = this.normalizeWorkingDays(this.createGroupForm.workingDays);
    if (workingDays.length === 0) {
      this.error = "Select at least one working day";
      return;
    }

    this.isLoading = true;
    this.error = null;
    try {
      const result = await actions.createGroup({
        name: this.createGroupForm.name.trim(),
        workingDays,
      });
      this.closeCreateGroupDrawer();
      if (result.data?.groupId) {
        this.navigateToGroup(result.data.groupId);
      }
    } catch (err: any) {
      this.error = err.message || "Failed to create group";
    } finally {
      this.isLoading = false;
    }
  }

  canManageSelectedGroup() {
    const group = this.selectedGroupDetail.group;
    if (!group) return false;
    if (this.currentUser.roleId === 1) return true;
    return Boolean(this.currentUser.id && group.ownerId === this.currentUser.id);
  }

  canDeleteSelectedGroup() {
    return this.canManageSelectedGroup();
  }

  openEditGroupDrawer() {
    const group = this.selectedGroupDetail.group;
    if (!group || !this.canManageSelectedGroup()) {
      this.error = "Only the group owner or an admin can rename this group";
      return;
    }

    this.editGroupForm.name = group.name ?? "";
    this.showEditGroupDrawer = true;
    this.error = null;
  }

  closeEditGroupDrawer() {
    this.showEditGroupDrawer = false;
    this.editGroupForm.name = "";
  }

  async submitEditGroup() {
    if (!this.selectedGroupId) return;
    const name = this.editGroupForm.name.trim();
    if (!name) {
      this.error = "Group name is required";
      return;
    }

    this.isLoading = true;
    this.error = null;
    try {
      const result = await actions.renameGroup({
        groupId: this.selectedGroupId,
        name,
      });
      if (result.error) {
        throw new Error(result.error.message || "Failed to rename group");
      }
      await this.loadGroupDetail();
      this.closeEditGroupDrawer();
    } catch (err: any) {
      this.error = err.message || "Failed to rename group";
    } finally {
      this.isLoading = false;
    }
  }

  openDeleteGroupConfirm() {
    if (!this.selectedGroupId || !this.canDeleteSelectedGroup()) {
      this.error = "Only the group owner or an admin can delete this group";
      return;
    }

    this.pendingDeleteGroupId = this.selectedGroupId;
    this.error = null;
    this.openConfirmDialog("delete-group-dialog");
  }

  async confirmDeleteGroup() {
    if (!this.pendingDeleteGroupId) return;
    const groupId = this.pendingDeleteGroupId;

    this.isLoading = true;
    this.error = null;
    try {
      const result = await actions.deleteGroup({ groupId });
      if (result.error) {
        throw new Error(result.error.message || "Failed to delete group");
      }
      this.pendingDeleteGroupId = null;
      this.visit("/app");
    } catch (err: any) {
      this.error = err.message || "Failed to delete group";
    } finally {
      this.isLoading = false;
    }
  }

  cancelDeleteGroup() {
    this.pendingDeleteGroupId = null;
  }

  // ============================================================================
  // MEMBER MANAGEMENT
  // ============================================================================

  openAddMembersDrawer() {
    if (!this.canManageSelectedGroup()) {
      this.error = "Only the group owner or an admin can add members";
      return;
    }
    this.showAddMembersDrawer = true;
    this.error = null;
    this.addMembersForm.members = [];
  }

  closeAddMembersDrawer() {
    this.showAddMembersDrawer = false;
    this.addMembersForm.members = [];
  }

  addMemberToForm(userId: string, name: string) {
    if (!this.addMembersForm.members.find(m => m.userId === userId)) {
      this.addMembersForm.members.push({ userId, name });
    }
  }

  removeMemberFromForm(index: number) {
    this.addMembersForm.members.splice(index, 1);
  }

  openEditMemberDrawer(memberId: string) {
    const member = this.selectedGroupDetail.members.find((candidate) => candidate.id === memberId);
    if (!member || !this.canManageSelectedGroup()) {
      this.error = "Only the group owner or an admin can rename members";
      return;
    }

    this.editMemberForm = {
      memberId: member.id,
      name: member.name ?? "",
    };
    this.showEditMemberDrawer = true;
    this.error = null;
  }

  closeEditMemberDrawer() {
    this.showEditMemberDrawer = false;
    this.editMemberForm = {
      memberId: "",
      name: "",
    };
  }

  async submitEditMember() {
    if (!this.selectedGroupId || !this.editMemberForm.memberId) return;
    const name = this.editMemberForm.name.trim();
    if (!name) {
      this.error = "Member name is required";
      return;
    }

    this.isLoading = true;
    this.error = null;
    try {
      const result = await actions.renameGroupMember({
        groupId: this.selectedGroupId,
        memberId: this.editMemberForm.memberId,
        name,
      });
      if (result.error) {
        throw new Error(result.error.message || "Failed to rename member");
      }
      await this.refreshGroupWorkspaceData();
      if (this.selectedTrip.trip) {
        await this.loadTripDetail(this.selectedTrip.trip.id);
      }
      this.closeEditMemberDrawer();
    } catch (err: any) {
      this.error = err.message || "Failed to rename member";
    } finally {
      this.isLoading = false;
    }
  }

  openRemoveMemberConfirm(memberId: string) {
    if (!this.selectedGroupId || !this.canManageSelectedGroup()) {
      this.error = "Only the group owner or an admin can remove members";
      return;
    }

    const member = this.selectedGroupDetail.members.find((candidate) => candidate.id === memberId);
    if (!member) {
      this.error = "Member not found";
      return;
    }

    this.pendingRemoveMemberId = memberId;
    this.error = null;
    this.openConfirmDialog("remove-member-dialog");
  }

  getPendingRemoveMemberName() {
    if (!this.pendingRemoveMemberId) return "this member";
    return this.selectedGroupDetail.members.find((member) => member.id === this.pendingRemoveMemberId)?.name ?? "this member";
  }

  async confirmRemoveMember() {
    if (!this.selectedGroupId || !this.pendingRemoveMemberId) return;

    const memberId = this.pendingRemoveMemberId;
    this.isLoading = true;
    this.error = null;
    try {
      const result = await actions.removeGroupMember({
        groupId: this.selectedGroupId,
        memberId,
      });
      if (result.error) {
        throw new Error(result.error.message || "Failed to remove member");
      }
      this.pendingRemoveMemberId = null;
      await this.refreshGroupWorkspaceData();
    } catch (err: any) {
      this.error = err.message || "Failed to remove member";
    } finally {
      this.isLoading = false;
    }
  }

  cancelRemoveMember() {
    this.pendingRemoveMemberId = null;
  }

  async submitAddMembers() {
    if (!this.selectedGroupId || this.addMembersForm.members.length === 0) return;

    this.isLoading = true;
    this.error = null;
    try {
      await actions.addGroupMembers({
        groupId: this.selectedGroupId,
        members: this.addMembersForm.members,
      });
      await this.refreshGroupWorkspaceData();
      this.closeAddMembersDrawer();
    } catch (err: any) {
      this.error = err.message || "Failed to add members";
    } finally {
      this.isLoading = false;
    }
  }

  // ============================================================================
  // TRIP MANAGEMENT
  // ============================================================================

  openCreateTripDrawer() {
    if (this.selectedGroupDetail.group?.isArchived) {
      this.error = "Archived groups cannot log new trips";
      return;
    }
    if (!this.hasValidTravellerSelection()) {
      this.error = "Select at least 2 travelling members to calculate today’s rotation.";
      return;
    }

    const driver = this.getTodaysDriver();
    if (!driver) {
      this.error = "Select at least 2 travelling members to calculate today’s rotation.";
      return;
    }

    const travellerIds = new Set(this.travellingMemberIds.map(String));
    this.showCreateTripDrawer = true;
    this.editingTripId = null;
    this.error = null;
    this.createTripForm = {
      tripDate: new Date().toISOString().split("T")[0],
      actualDriverId: driver.id,
      passengers: this.getOrderedActiveMembers()
        .filter((member) => travellerIds.has(member.id) && member.id !== driver.id)
        .map((member) => member.id),
      absentees: this.getOrderedActiveMembers()
        .filter((member) => !travellerIds.has(member.id) && member.id !== driver.id)
        .map((member) => member.id),
      notes: "",
    };
    this.sanitizeTripFormDriverSelections();
  }

  closeCreateTripDrawer() {
    this.showCreateTripDrawer = false;
    this.editingTripId = null;
  }

  async openEditTripDrawer(tripId: string) {
    if (!tripId || !this.selectedGroupId) return;
    if (this.selectedGroupDetail.group?.isArchived) {
      this.error = "Archived groups cannot edit trips";
      return;
    }

    this.isLoading = true;
    this.error = null;
    try {
      const result = await actions.loadTripDetail({ tripId });
      const trip = (result.data?.trip as any) ?? null;
      const participants = (result.data?.participants as any) || [];
      if (!trip) {
        this.error = "Trip not found";
        return;
      }

      const driverParticipant = participants.find(
        (participant: TripParticipant) => participant.role === "driver" && participant.attendanceStatus === "present",
      );
      const driverId = driverParticipant?.memberId ?? trip.actualDriverId ?? "";

      this.selectedTrip = { trip, participants };
      this.editingTripId = tripId;
      this.createTripForm = {
        tripDate: this.toDateInputValue(trip.tripDate),
        actualDriverId: driverId != null ? String(driverId) : "",
        passengers: participants
          .filter((participant: TripParticipant) => participant.role === "passenger" && participant.attendanceStatus === "present")
          .map((participant: TripParticipant) => String(participant.memberId)),
        absentees: participants
          .filter((participant: TripParticipant) => participant.attendanceStatus === "absent")
          .map((participant: TripParticipant) => String(participant.memberId)),
        notes: trip.notes ?? "",
      };
      this.sanitizeTripFormDriverSelections();
      this.showCreateTripDrawer = true;
    } catch (err: any) {
      this.error = err.message || "Failed to load trip";
    } finally {
      this.isLoading = false;
    }
  }

  onTripDriverChange() {
    this.sanitizeTripFormDriverSelections();
  }

  onTripDateChange() {
    if (!this.isTripDateOnWorkingDay()) {
      this.error = "This date is outside the group’s selected travel days.";
      return;
    }

    if (this.error === "This date is outside the group’s selected travel days.") {
      this.error = null;
    }
  }

  getTripPassengerOptions() {
    return this.selectedGroupDetail.members.filter((member) => member.id !== this.createTripForm.actualDriverId);
  }

  getTripAbsenteeOptions() {
    return this.selectedGroupDetail.members.filter((member) => member.id !== this.createTripForm.actualDriverId);
  }

  getTravellingMembers() {
    const travellingIds = new Set(this.travellingMemberIds.map(String));
    return this.getOrderedActiveMembers().filter((member) => travellingIds.has(member.id));
  }

  getTravellingMemberCount() {
    return this.getTravellingMembers().length;
  }

  hasValidTravellerSelection() {
    return this.getTravellingMemberCount() >= 2;
  }

  onTravellingMembersChange() {
    const activeMemberIds = new Set(this.getOrderedActiveMembers().map((member) => member.id));
    this.travellingMemberIds = this.travellingMemberIds
      .map(String)
      .filter((memberId, index, allIds) => activeMemberIds.has(memberId) && allIds.indexOf(memberId) === index);
  }

  togglePassenger(memberId: string) {
    if (memberId === this.createTripForm.actualDriverId) {
      this.error = "Driver cannot be marked as passenger or absent.";
      return;
    }

    const index = this.createTripForm.passengers.indexOf(memberId);
    if (index > -1) {
      this.createTripForm.passengers.splice(index, 1);
    } else {
      this.createTripForm.passengers.push(memberId);
      // Remove from absentees if present
      const absIndex = this.createTripForm.absentees.indexOf(memberId);
      if (absIndex > -1) {
        this.createTripForm.absentees.splice(absIndex, 1);
      }
    }
  }

  toggleAbsentee(memberId: string) {
    if (memberId === this.createTripForm.actualDriverId) {
      this.error = "Driver cannot be marked as passenger or absent.";
      return;
    }

    const index = this.createTripForm.absentees.indexOf(memberId);
    if (index > -1) {
      this.createTripForm.absentees.splice(index, 1);
    } else {
      this.createTripForm.absentees.push(memberId);
      // Remove from passengers if present
      const passIndex = this.createTripForm.passengers.indexOf(memberId);
      if (passIndex > -1) {
        this.createTripForm.passengers.splice(passIndex, 1);
      }
    }
  }

  async submitCreateTrip() {
    if (!this.selectedGroupId) return;

    // Validation
    if (!this.createTripForm.actualDriverId) {
      this.error = "Driver is required";
      return;
    }

    if (!this.isTripDateOnWorkingDay()) {
      this.error = "This date is outside the group’s selected travel days.";
      return;
    }

    this.sanitizeTripFormDriverSelections();

    this.isLoading = true;
    this.error = null;
    try {
      const payload = {
        groupId: this.selectedGroupId,
        tripDate: this.createTripForm.tripDate,
        actualDriverId: this.createTripForm.actualDriverId,
        passengers: this.createTripForm.passengers,
        absentees: this.createTripForm.absentees,
        notes: this.createTripForm.notes,
      };

      let result;
      if (this.editingTripId) {
        result = await actions.updateTrip({
          tripId: this.editingTripId,
          ...payload,
        });
      } else {
        result = await actions.createTrip(payload);
      }

      if (result.error) {
        throw new Error(result.error.message || (this.editingTripId ? "Failed to update trip" : "Failed to create trip"));
      }

      await this.loadGroupDetail();
      await this.loadTripHistory();
      if (this.editingTripId) {
        await this.loadTripDetail(this.editingTripId);
      }
      this.closeCreateTripDrawer();
    } catch (err: any) {
      this.error = err.message || (this.editingTripId ? "Failed to update trip" : "Failed to create trip");
    } finally {
      this.isLoading = false;
    }
  }

  async loadTripHistory() {
    if (!this.selectedGroupId) return;

    this.isLoading = true;
    this.error = null;
    try {
      const result = await actions.listTripHistory({ groupId: this.selectedGroupId });
      this.tripHistory = (result.data?.trips as any) || [];
    } catch (err: any) {
      this.error = err.message || "Failed to load trip history";
    } finally {
      this.isLoading = false;
    }
  }

  async loadTripDetail(tripId: string) {
    this.isLoading = true;
    this.error = null;
    try {
      const result = await actions.loadTripDetail({ tripId });
      this.selectedTrip = {
        trip: (result.data?.trip as any) ?? null,
        participants: (result.data?.participants as any) || [],
      };
    } catch (err: any) {
      this.error = err.message || "Failed to load trip detail";
    } finally {
      this.isLoading = false;
    }
  }

  async refreshGroupWorkspaceData() {
    await this.loadGroupDetail();
    await this.loadTripHistory();
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  formatDate(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  formatShortDate(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  getTodaysDriver(): CarPoolMember | null {
    if (!this.hasValidTravellerSelection()) return null;
    return this.getDriverSuggestionQueue(1)[0] ?? null;
  }

  getNextDrivers(count: number = 3): CarPoolMember[] {
    if (!this.hasValidTravellerSelection()) return [];
    return this.getDriverSuggestionQueue(count + 1).slice(1);
  }

  getNextDriverPreview(count: number = 3) {
    return this.getNextDrivers(count).map((driver, index) => {
      const date = new Date();
      date.setDate(date.getDate() + index + 1);
      return {
        id: `${driver.id}-${index}`,
        driver,
        date,
      };
    });
  }

  getFairnessScore(member?: CarPoolMember | null) {
    if (!member) return 0;
    return this.getRelativeFairnessScore(member);
  }

  getFairnessStatus(member?: CarPoolMember | null): FairnessStatus {
    const score = this.getFairnessScore(member);
    if (score > 1) return "Driving more";
    if (score < -1) return "Receiving more";
    return "Balanced";
  }

  getFairnessStatusClass(member?: CarPoolMember | null) {
    const score = this.getFairnessScore(member);
    if (score > 1) return "app-status-pill--positive";
    if (score < -1) return "app-status-pill--negative";
    return "app-status-pill--balanced";
  }

  getTripDriverName(trip?: CarPoolTrip | null) {
    if (!trip?.actualDriverId) return "Driver not set";
    return this.selectedGroupDetail.members.find((member) => member.id === trip.actualDriverId)?.name ?? "Driver not set";
  }

  getTripDriverParticipant() {
    return this.selectedTrip.participants.find(
      (participant) => participant.role === "driver" && participant.attendanceStatus === "present",
    );
  }

  getTripPassengerNames() {
    return this.selectedTrip.participants
      .filter((participant) => participant.role === "passenger" && participant.attendanceStatus === "present")
      .map((participant) => participant.member?.name || "Unknown member");
  }

  getTripAbsentNames() {
    return this.selectedTrip.participants
      .filter((participant) => participant.attendanceStatus === "absent")
      .map((participant) => participant.member?.name || "Unknown member");
  }

  getParticipantRoleLabel(participant: TripParticipant) {
    if (participant.attendanceStatus === "absent") return "Absent";
    return participant.role === "driver" ? "Driver" : "Passenger";
  }

  getParticipantRoleClass(participant: TripParticipant) {
    if (participant.attendanceStatus === "absent") return "app-status-pill--negative";
    return participant.role === "driver" ? "app-status-pill--positive" : "app-status-pill--balanced";
  }

  getParticipantImpactLabel(participant: TripParticipant) {
    if (participant.role === "driver" && participant.attendanceStatus === "present") return "+1 drive";
    if (participant.missedRide) return "missed ride";
    if (participant.attendanceStatus === "absent") return "absent";
    return "+1 ride";
  }

  private parseState(serializedState?: string) {
    if (!serializedState) return {};
    try {
      return JSON.parse(serializedState);
    } catch {
      return {};
    }
  }

  private parseCurrentUser(value: any) {
    const roleId = Number(value?.roleId);
    return {
      id: typeof value?.id === "string" ? value.id : null,
      roleId: Number.isFinite(roleId) ? roleId : null,
    };
  }

  private normalizeWorkingDays(values: Array<string | number>) {
    return values
      .map((value) => typeof value === "number" ? value : Number.parseInt(value, 10))
      .filter((value) => Number.isInteger(value) && value >= 0 && value <= 6);
  }

  private sanitizeTripFormDriverSelections() {
    const driverId = this.createTripForm.actualDriverId;
    if (!driverId) return;
    this.createTripForm.passengers = this.createTripForm.passengers.filter((memberId) => memberId !== driverId);
    this.createTripForm.absentees = this.createTripForm.absentees.filter((memberId) => memberId !== driverId);
  }

  private isTripDateOnWorkingDay() {
    const workingDays = Array.isArray(this.selectedGroupDetail.group?.workingDays)
      ? this.selectedGroupDetail.group.workingDays
      : [];
    if (workingDays.length === 0) return true;

    const tripDate = this.parseLocalDateInput(this.createTripForm.tripDate);
    if (!tripDate) return true;

    return workingDays.includes(tripDate.getDay());
  }

  private getDriverSuggestionQueue(count: number) {
    const members = this.getEligibleRotationMembers();
    if (members.length < 2) return [];

    const eligibleMemberIds = new Set(members.map((member) => member.id));
    const targetDate = new Date();
    const targetKey = this.toDateKey(targetDate);
    const latestTrip = [...this.tripHistory]
      .filter((trip) => {
        const driverId = trip.actualDriverId ? String(trip.actualDriverId) : "";
        return driverId && eligibleMemberIds.has(driverId) && this.toDateKey(trip.tripDate) <= targetKey;
      })
      .sort((a, b) => this.toDateKey(b.tripDate).localeCompare(this.toDateKey(a.tripDate)))[0];
    let latestDriverId = latestTrip?.actualDriverId ? String(latestTrip.actualDriverId) : null;

    const fullGroupMembers = this.getOrderedActiveMembers();
    const rawScores = fullGroupMembers.map((member) => member.fairness?.fairnessScore ?? 0);
    const averageScore = rawScores.length > 0
      ? rawScores.reduce((total, score) => total + score, 0) / rawScores.length
      : 0;

    const candidates = members.map((member) => ({
      member,
      driveCount: member.fairness?.driveCount ?? 0,
      rideCount: member.fairness?.rideCount ?? 0,
      absenceCount: member.fairness?.absenceCount ?? 0,
      missedRideCount: member.fairness?.missedRideCount ?? 0,
      fairnessScore: (member.fairness?.fairnessScore ?? 0) - averageScore,
    }));
    const queue: CarPoolMember[] = [];

    for (let index = 0; index < count; index += 1) {
      const next = this.pickNextDriverCandidate(candidates, latestDriverId);
      if (!next) break;
      queue.push(next.member);

      next.driveCount += 1;
      next.fairnessScore += 1;
      for (const candidate of candidates) {
        if (candidate.member.id === next.member.id) continue;
        candidate.rideCount += 1;
        candidate.fairnessScore -= 1;
      }
      latestDriverId = next.member.id;
    }

    return queue;
  }

  private pickNextDriverCandidate(candidates: DriverCandidate[], latestDriverId: string | null) {
    if (!candidates.length) return null;

    const ranked = [...candidates].sort((a, b) => this.compareDriverCandidates(a, b));
    const best = ranked[0] ?? null;
    if (!best) return null;

    let tied = ranked.filter((candidate) => this.hasSameFairnessRank(candidate, best));

    if (latestDriverId && tied.length > 1 && tied.some((candidate) => candidate.member.id === latestDriverId)) {
      tied = tied.filter((candidate) => candidate.member.id !== latestDriverId);
    }

    return this.pickByRotationContinuity(tied, latestDriverId) ?? best;
  }

  private compareDriverCandidates(a: DriverCandidate, b: DriverCandidate) {
    if (a.driveCount !== b.driveCount) return a.driveCount - b.driveCount;
    if (a.fairnessScore !== b.fairnessScore) return a.fairnessScore - b.fairnessScore;
    if (a.missedRideCount !== b.missedRideCount) return b.missedRideCount - a.missedRideCount;
    if (a.absenceCount !== b.absenceCount) return b.absenceCount - a.absenceCount;
    if (a.member.rotationOrder !== b.member.rotationOrder) return a.member.rotationOrder - b.member.rotationOrder;
    return a.member.name.localeCompare(b.member.name);
  }

  private hasSameFairnessRank(candidate: DriverCandidate, best: DriverCandidate) {
    return candidate.driveCount === best.driveCount &&
      candidate.fairnessScore === best.fairnessScore &&
      candidate.missedRideCount === best.missedRideCount &&
      candidate.absenceCount === best.absenceCount;
  }

  private pickByRotationContinuity(candidates: DriverCandidate[], latestDriverId: string | null) {
    const orderedCandidates = [...candidates].sort((a, b) => {
      if (a.member.rotationOrder !== b.member.rotationOrder) {
        return a.member.rotationOrder - b.member.rotationOrder;
      }
      return a.member.name.localeCompare(b.member.name);
    });

    if (!orderedCandidates.length) return null;
    if (!latestDriverId) return orderedCandidates[0] ?? null;

    const selectedOrder = this.getEligibleRotationMembers();
    const latestMember = selectedOrder.find((member) => member.id === latestDriverId);
    if (!latestMember) return orderedCandidates[0] ?? null;

    const nextAfterLatest = orderedCandidates.find((candidate) => candidate.member.rotationOrder > latestMember.rotationOrder);
    return nextAfterLatest ?? orderedCandidates[0] ?? null;
  }

  private getRelativeFairnessScore(member: CarPoolMember) {
    const members = this.getOrderedActiveMembers();
    if (!members.length) return 0;

    const scores = members.map((candidate) => candidate.fairness?.fairnessScore ?? 0);
    const allScoresEqual = scores.every((score) => score === scores[0]);
    if (allScoresEqual) return 0;

    const average = scores.reduce((total, score) => total + score, 0) / scores.length;
    const rawScore = member.fairness?.fairnessScore ?? 0;
    const relativeScore = rawScore - average;

    if (Math.abs(relativeScore) < 0.5) return 0;
    return Math.round(relativeScore);
  }

  private getOrderedActiveMembers() {
    return [...this.selectedGroupDetail.members]
      .filter((member) => member.isActive !== false)
      .sort((a, b) => a.rotationOrder - b.rotationOrder);
  }

  private getEligibleRotationMembers() {
    const travellingIds = new Set(this.travellingMemberIds.map(String));
    return this.getOrderedActiveMembers().filter((member) => travellingIds.has(member.id));
  }

  private resetTravellingMembers() {
    this.travellingMemberIds = this.getOrderedActiveMembers().map((member) => member.id);
  }

  private toDateKey(date: Date | string) {
    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) return "";
    return parsedDate.toISOString().split("T")[0];
  }

  private toDateInputValue(date: Date | string) {
    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) {
      return new Date().toISOString().split("T")[0];
    }
    return this.toDateKey(parsedDate);
  }

  private parseLocalDateInput(value: string) {
    if (!value) return null;
    const parsedDate = /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? new Date(`${value}T00:00:00`)
      : new Date(value);
    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
  }

  private openConfirmDialog(dialogId: string) {
    if (typeof document === "undefined") return;
    const dialog = document.getElementById(dialogId) as HTMLDialogElement | null;
    if (!dialog?.open && typeof dialog?.showModal === "function") {
      dialog.showModal();
    }
  }

  private visit(path: string) {
    if (typeof window !== "undefined") {
      window.location.href = path;
    }
  }
}

export const registerCarPoolAppStore = (Alpine: Alpine) => {
  Alpine.store("carPoolApp", new CarPoolAppStore());
};
