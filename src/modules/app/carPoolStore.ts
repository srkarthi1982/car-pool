import type { Alpine } from "alpinejs";
import { AvBaseStore } from "@ansiversa/components/alpine";
import { server } from "../../actions";

// Type definitions
export interface CarPoolGroup {
  id: string;
  createdByUserId: string;
  name: string;
  rotationType: string;
  startDate: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CarPoolGroupMember {
  id: string;
  groupId: string;
  userId: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CarPoolTrip {
  id: string;
  groupId: string;
  tripDate: Date;
  suggestedDriverUserId?: string;
  actualDriverUserId?: string;
  presentUserIdsJson?: string;
  absentUserIdsJson?: string;
  petrolAmount?: number;
  tollAmount?: number;
  notes?: string;
  createdByUserId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CarPoolWorkingDay {
  id: string;
  groupId: string;
  dayOfWeek: number;
  createdAt: Date;
}

export class CarPoolAppStore extends AvBaseStore {
  // State
  groups: CarPoolGroup[] = [];
  selectedGroupId: string | null = null;
  selectedGroupDetail: {
    group: CarPoolGroup | null;
    members: CarPoolGroupMember[];
    workingDays: CarPoolWorkingDay[];
  } = {
    group: null,
    members: [],
    workingDays: [],
  };

  tripHistory: CarPoolTrip[] = [];
  todaysSuggestedDriver: string | null = null;
  nextWeekSuggestions: Array<{ date: string; driverUserId: string | null }> = [];

  // UI state
  isLoading = false;
  error: string | null = null;
  selectedTab: "overview" | "members" | "schedule" | "trips" = "overview";
  showCreateGroupDrawer = false;
  showAddMembersDrawer = false;
  showCreateTripDrawer = false;

  // Form state
  createGroupForm = {
    name: "",
    rotationType: "simple_rotation" as const,
    startDate: new Date().toISOString().split("T")[0],
  };

  createTripForm = {
    tripDate: new Date().toISOString().split("T")[0],
    actualDriverUserId: "",
    petrolAmount: 0,
    tollAmount: 0,
    notes: "",
  };

  // ============================================================================
  // GROUP LOADING & SELECTION
  // ============================================================================

  async loadUserGroups() {
    this.isLoading = true;
    this.error = null;
    try {
      const result = await server.loadUserGroups();
      this.groups = result.groups || [];
      if (this.groups.length > 0 && !this.selectedGroupId) {
        this.selectedGroupId = this.groups[0].id;
        await this.loadGroupDetail();
      }
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
        group: result.group,
        members: result.members || [],
        workingDays: result.workingDays || [],
      };
      await this.loadTripHistory();
      await this.loadTodaysSuggestion();
    } catch (err: any) {
      this.error = err.message || "Failed to load group detail";
    } finally {
      this.isLoading = false;
    }
  }

  selectGroup(groupId: string) {
    this.selectedGroupId = groupId;
    this.loadGroupDetail();
  }

  // ============================================================================
  // GROUP CREATION & MANAGEMENT
  // ============================================================================

  openCreateGroupDrawer() {
    this.showCreateGroupDrawer = true;
    this.error = null;
  }

  closeCreateGroupDrawer() {
    this.showCreateGroupDrawer = false;
    this.createGroupForm = {
      name: "",
      rotationType: "simple_rotation",
      startDate: new Date().toISOString().split("T")[0],
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
      if (result.success) {
        await this.loadUserGroups();
        this.closeCreateGroupDrawer();
        this.selectedGroupId = result.groupId;
        await this.loadGroupDetail();
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
  }

  closeAddMembersDrawer() {
    this.showAddMembersDrawer = false;
  }

  async addMembers(userIds: string[]) {
    if (!this.selectedGroupId || userIds.length === 0) return;

    this.isLoading = true;
    this.error = null;
    try {
      const result = await server.addGroupMembers({
        groupId: this.selectedGroupId,
        userIds,
      });
      if (result.success) {
        await this.loadGroupDetail();
        this.closeAddMembersDrawer();
      }
    } catch (err: any) {
      this.error = err.message || "Failed to add members";
    } finally {
      this.isLoading = false;
    }
  }

  async updateMemberOrder(memberOrder: Array<{ memberId: string; sortOrder: number }>) {
    if (!this.selectedGroupId) return;

    this.isLoading = true;
    this.error = null;
    try {
      const result = await server.updateGroupMemberOrder({
        groupId: this.selectedGroupId,
        memberOrder,
      });
      if (result.success) {
        await this.loadGroupDetail();
      }
    } catch (err: any) {
      this.error = err.message || "Failed to update member order";
    } finally {
      this.isLoading = false;
    }
  }

  async removeMember(memberId: string) {
    if (!this.selectedGroupId) return;

    if (!confirm("Are you sure you want to remove this member?")) return;

    this.isLoading = true;
    this.error = null;
    try {
      const result = await server.removeGroupMember({
        groupId: this.selectedGroupId,
        memberId,
      });
      if (result.success) {
        await this.loadGroupDetail();
      }
    } catch (err: any) {
      this.error = err.message || "Failed to remove member";
    } finally {
      this.isLoading = false;
    }
  }

  // ============================================================================
  // WORKING DAYS
  // ============================================================================

  async saveWorkingDays(daysOfWeek: number[]) {
    if (!this.selectedGroupId) return;

    this.isLoading = true;
    this.error = null;
    try {
      const result = await server.saveWorkingDays({
        groupId: this.selectedGroupId,
        daysOfWeek,
      });
      if (result.success) {
        await this.loadGroupDetail();
      }
    } catch (err: any) {
      this.error = err.message || "Failed to save working days";
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
  }

  closeCreateTripDrawer() {
    this.showCreateTripDrawer = false;
    this.createTripForm = {
      tripDate: new Date().toISOString().split("T")[0],
      actualDriverUserId: "",
      petrolAmount: 0,
      tollAmount: 0,
      notes: "",
    };
  }

  async submitCreateTrip() {
    if (!this.selectedGroupId || !this.createTripForm.tripDate) {
      this.error = "Trip date is required";
      return;
    }

    this.isLoading = true;
    this.error = null;
    try {
      const result = await server.createTrip({
        groupId: this.selectedGroupId,
        ...this.createTripForm,
      });
      if (result.success) {
        await this.loadTripHistory();
        this.closeCreateTripDrawer();
      }
    } catch (err: any) {
      this.error = err.message || "Failed to create trip";
    } finally {
      this.isLoading = false;
    }
  }

  async loadTripHistory() {
    if (!this.selectedGroupId) return;

    try {
      const result = await server.listTripHistory({
        groupId: this.selectedGroupId,
        limit: 30,
      });
      this.tripHistory = result.trips || [];
    } catch (err: any) {
      console.error("Failed to load trip history:", err);
    }
  }

  async loadTodaysSuggestion() {
    if (!this.selectedGroupId) return;

    try {
      const today = new Date().toISOString().split("T")[0];
      const result = await server.getSuggestedDriverForDate({
        groupId: this.selectedGroupId,
        date: today,
      });
      this.todaysSuggestedDriver = result.suggestedDriverUserId;
    } catch (err: any) {
      console.error("Failed to load suggestion:", err);
    }
  }

  async updateTrip(tripId: string, updates: any) {
    this.isLoading = true;
    this.error = null;
    try {
      const result = await server.updateOwnTrip({
        tripId,
        ...updates,
      });
      if (result.success) {
        await this.loadTripHistory();
      }
    } catch (err: any) {
      this.error = err.message || "Failed to update trip";
    } finally {
      this.isLoading = false;
    }
  }

  // ============================================================================
  // UI HELPERS
  // ============================================================================

  setSelectedTab(tab: "overview" | "members" | "schedule" | "trips") {
    this.selectedTab = tab;
  }

  clearError() {
    this.error = null;
  }
}

export const registerCarPoolAppStore = (Alpine: Alpine) => {
  Alpine.store("carPoolApp", new CarPoolAppStore());
};
