import type { Alpine } from "alpinejs";
import { AvBaseStore } from "@ansiversa/components/alpine";
import { server } from "../../actions";

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
  petrolAmount?: number;
  tollAmount?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  passengerCount?: number;
  absenteeCount?: number;
}

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
  showAddMembersDrawer = false;
  showCreateTripDrawer = false;

  // Form state
  createGroupForm = {
    name: "",
    workingDays: [1, 2, 3, 4, 5], // Mon-Fri
  };

  addMembersForm = {
    members: [] as Array<{ userId: string; name: string }>,
  };

  createTripForm = {
    tripDate: new Date().toISOString().split("T")[0],
    actualDriverId: "",
    passengers: [] as string[],
    absentees: [] as string[],
    petrolAmount: "",
    tollAmount: "",
    notes: "",
  };

  initializeIndex(serializedState?: string) {
    const state = this.parseState(serializedState);
    this.groups = Array.isArray(state.groups) ? state.groups : [];
    this.selectedGroupId = null;
    this.selectedGroupDetail = { group: null, members: [] };
    this.tripHistory = [];
    this.selectedTrip = { trip: null, participants: [] };
    this.currentView = "groups";
    this.error = typeof state.loadError === "string" && state.loadError.length > 0 ? state.loadError : null;
  }

  initializeGroupWorkspace(serializedState?: string) {
    const state = this.parseState(serializedState);
    this.selectedGroupId = typeof state.groupId === "string" ? state.groupId : null;
    this.selectedGroupDetail = {
      group: state.groupDetail?.group ?? null,
      members: Array.isArray(state.groupDetail?.members) ? state.groupDetail.members : [],
    };
    this.tripHistory = Array.isArray(state.tripHistory) ? state.tripHistory : [];
    this.selectedTrip = { trip: null, participants: [] };
    this.currentView = "group-dashboard";
    this.error = typeof state.loadError === "string" && state.loadError.length > 0 ? state.loadError : null;
  }

  initializeTripHistoryPage(serializedState?: string) {
    const state = this.parseState(serializedState);
    this.selectedGroupId = typeof state.groupId === "string" ? state.groupId : null;
    this.tripHistory = Array.isArray(state.tripHistory) ? state.tripHistory : [];
    this.currentView = "trip-history";
    this.error = typeof state.loadError === "string" && state.loadError.length > 0 ? state.loadError : null;
  }

  initializeTripDetailPage(serializedState?: string) {
    const state = this.parseState(serializedState);
    this.selectedGroupId = typeof state.groupId === "string" ? state.groupId : null;
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
      const result = await server.loadUserGroups({});
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
      const result = await server.loadGroupDetail({ groupId: this.selectedGroupId });
      this.selectedGroupDetail = {
        group: (result.data?.group as any) ?? null,
        members: (result.data?.members as any) || [],
      };
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

    this.isLoading = true;
    this.error = null;
    try {
      const result = await server.createGroup(this.createGroupForm);
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

  // ============================================================================
  // MEMBER MANAGEMENT
  // ============================================================================

  openAddMembersDrawer() {
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

  async submitAddMembers() {
    if (!this.selectedGroupId || this.addMembersForm.members.length === 0) return;

    this.isLoading = true;
    this.error = null;
    try {
      await server.addGroupMembers({
        groupId: this.selectedGroupId,
        members: this.addMembersForm.members,
      });
      await this.loadGroupDetail();
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
    this.showCreateTripDrawer = true;
    this.error = null;
    this.createTripForm = {
      tripDate: new Date().toISOString().split("T")[0],
      actualDriverId: "",
      passengers: [],
      absentees: [],
      petrolAmount: "",
      tollAmount: "",
      notes: "",
    };
  }

  closeCreateTripDrawer() {
    this.showCreateTripDrawer = false;
  }

  togglePassenger(memberId: string) {
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

    const petrolAmount = this.createTripForm.petrolAmount ? parseFloat(this.createTripForm.petrolAmount) : undefined;
    const tollAmount = this.createTripForm.tollAmount ? parseFloat(this.createTripForm.tollAmount) : undefined;

    this.isLoading = true;
    this.error = null;
    try {
      await server.createTrip({
        groupId: this.selectedGroupId,
        tripDate: this.createTripForm.tripDate,
        actualDriverId: this.createTripForm.actualDriverId,
        passengers: this.createTripForm.passengers,
        absentees: this.createTripForm.absentees,
        petrolAmount,
        tollAmount,
        notes: this.createTripForm.notes,
      });
      await this.loadGroupDetail();
      await this.loadTripHistory();
      this.closeCreateTripDrawer();
    } catch (err: any) {
      this.error = err.message || "Failed to create trip";
    } finally {
      this.isLoading = false;
    }
  }

  async loadTripHistory() {
    if (!this.selectedGroupId) return;

    this.isLoading = true;
    this.error = null;
    try {
      const result = await server.listTripHistory({ groupId: this.selectedGroupId });
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
      const result = await server.loadTripDetail({ tripId });
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

  // ============================================================================
  // UTILITIES
  // ============================================================================

  formatDate(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  getTodaysDriver(): CarPoolMember | null {
    if (!this.selectedGroupDetail.members.length) return null;
    // Simple implementation - in real app, use rotation logic
    const today = new Date().toISOString().split('T')[0];
    const hash = today.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    const index = hash % this.selectedGroupDetail.members.length;
    return this.selectedGroupDetail.members[index];
  }

  getNextDrivers(count: number = 3): CarPoolMember[] {
    if (!this.selectedGroupDetail.members.length) return [];
    const today = new Date();
    const drivers: CarPoolMember[] = [];
    for (let i = 1; i <= count; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const hash = date.toISOString().split('T')[0].split('').reduce((a, b) => a + b.charCodeAt(0), 0);
      const index = hash % this.selectedGroupDetail.members.length;
      drivers.push(this.selectedGroupDetail.members[index]);
    }
    return drivers;
  }

  private parseState(serializedState?: string) {
    if (!serializedState) return {};
    try {
      return JSON.parse(serializedState);
    } catch {
      return {};
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
