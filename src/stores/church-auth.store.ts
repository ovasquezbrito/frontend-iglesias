import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  ChurchBranch,
  ChurchContextResponse,
  ChurchLoginResponse,
  ChurchMinistry,
  KlaroContaLoginResponse,
} from "@/types/church";

export type AppAuthRole = "CHURCH_MINISTRY" | "ADMIN" | "EMPRESA";

interface ChurchAuthState {
  isAuthenticated: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  sessionId: string | null;
  role: AppAuthRole | null;
  ministryRole: "LEADER" | "VOLUNTEER" | "ADMIN" | null;
  volunteerName: string;
  companyId: string;
  churchName: string;
  ministry: ChurchMinistry | null;
  assignedBranchId: string;
  activeBranch: { id: string; name: string } | null;
  branches: ChurchBranch[];
  ministries: ChurchMinistry[];
}

interface ChurchAuthActions {
  loginSatellite: (res: ChurchLoginResponse) => void;
  loginAdmin: (
    res: KlaroContaLoginResponse,
    branches: ChurchBranch[],
    ministries: ChurchMinistry[]
  ) => void;
  hydrateContext: (ctx: ChurchContextResponse) => void;
  setActiveBranch: (branch: { id: string; name: string } | null) => void;
  setActiveMinistry: (ministry: ChurchMinistry) => void;
  setAdminCatalogs: (branches: ChurchBranch[], ministries: ChurchMinistry[]) => void;
  updateAccessToken: (accessToken: string) => void;
  logout: () => void;
}

const initialState: ChurchAuthState = {
  isAuthenticated: false,
  accessToken: null,
  refreshToken: null,
  sessionId: null,
  role: null,
  ministryRole: null,
  volunteerName: "",
  companyId: "",
  churchName: "",
  ministry: null,
  assignedBranchId: "",
  activeBranch: null,
  branches: [],
  ministries: [],
};

export const useChurchAuthStore = create<ChurchAuthState & ChurchAuthActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      loginSatellite: (res) => {
        const branches = res.branches || [];
        let activeBranch: { id: string; name: string } | null = null;
        if (res.assigned_branch_id) {
          const found = branches.find((b) => b.id === res.assigned_branch_id);
          activeBranch = found
            ? { id: found.id, name: found.name }
            : { id: res.assigned_branch_id, name: "Sede asignada" };
        } else if (branches.length > 0) {
          const main = branches.find((b) => b.is_main) || branches[0];
          activeBranch = { id: main.id, name: main.name };
        }

        set({
          isAuthenticated: true,
          accessToken: res.access_token,
          refreshToken: res.refresh_token,
          sessionId: res.session_id,
          role: "CHURCH_MINISTRY",
          ministryRole: res.ministry_role || "VOLUNTEER",
          volunteerName: res.volunteer_name,
          companyId: res.company_id,
          churchName: res.company_name,
          ministry: res.ministry,
          assignedBranchId: res.assigned_branch_id || "",
          activeBranch,
          branches,
          ministries: res.ministry ? [res.ministry] : [],
        });
      },

      loginAdmin: (res, branches, ministries) => {
        const activeBranches = branches.filter((b) => b.is_active);
        const activeMinistries = ministries.filter((m) => m.is_active);
        const mainBranch = activeBranches.find((b) => b.is_main) || activeBranches[0] || null;
        const firstMinistry = activeMinistries[0] || ministries[0] || null;

        set({
          isAuthenticated: true,
          accessToken: res.access_token,
          refreshToken: res.refresh_token,
          sessionId: res.session_id,
          role: res.user.name_rol.toUpperCase() as AppAuthRole,
          ministryRole: "ADMIN",
          volunteerName: res.user.full_name,
          companyId: res.user.company_id,
          churchName: res.user.name_company,
          ministry: firstMinistry,
          assignedBranchId: "",
          activeBranch: mainBranch ? { id: mainBranch.id, name: mainBranch.name } : null,
          branches: activeBranches,
          ministries: activeMinistries,
        });
      },

      hydrateContext: (ctx) => {
        const current = get();
        const branches = ctx.branches || [];
        let activeBranch = current.activeBranch;

        if (ctx.assigned_branch_id) {
          const found = branches.find((b) => b.id === ctx.assigned_branch_id);
          activeBranch = found
            ? { id: found.id, name: found.name }
            : { id: ctx.assigned_branch_id, name: "Sede asignada" };
        } else if (activeBranch && !branches.some((b) => b.id === activeBranch?.id)) {
          const main = branches.find((b) => b.is_main) || branches[0];
          activeBranch = main ? { id: main.id, name: main.name } : null;
        }

        set({
          companyId: ctx.company_id,
          churchName: ctx.company_name,
          ministry: ctx.ministry,
          volunteerName: ctx.volunteer_name,
          ministryRole: ctx.ministry_role,
          assignedBranchId: ctx.assigned_branch_id || "",
          branches,
          activeBranch,
        });
      },

      setActiveBranch: (branch) => {
        const { assignedBranchId } = get();
        if (assignedBranchId && branch && branch.id !== assignedBranchId) return;
        set({ activeBranch: branch });
      },

      setActiveMinistry: (ministry) => {
        if (get().role === "CHURCH_MINISTRY") return;
        set({ ministry });
      },

      setAdminCatalogs: (branches, ministries) => {
        const current = get();
        const activeBranches = branches.filter((b) => b.is_active);
        const activeMinistries = ministries.filter((m) => m.is_active);
        const nextMinistry =
          activeMinistries.find((m) => m.id === current.ministry?.id) ||
          activeMinistries[0] ||
          null;
        const nextBranchObj =
          activeBranches.find((b) => b.id === current.activeBranch?.id) ||
          activeBranches.find((b) => b.is_main) ||
          activeBranches[0] ||
          null;

        set({
          branches: activeBranches,
          ministries: activeMinistries,
          ministry: nextMinistry,
          activeBranch: nextBranchObj ? { id: nextBranchObj.id, name: nextBranchObj.name } : null,
        });
      },

      updateAccessToken: (accessToken) => set({ accessToken }),

      logout: () => set({ ...initialState }),
    }),
    {
      name: "klaro-iglesia-auth",
    }
  )
);
