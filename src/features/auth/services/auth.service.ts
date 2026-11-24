import { apiClient } from "@/lib/axios";
import type {
  ChurchBranch,
  ChurchContextResponse,
  ChurchLoginResponse,
  ChurchMinistry,
  KlaroContaLoginResponse,
} from "@/types/church";

export const authService = {
  loginByCode: async (payload: {
    access_code: string;
    volunteer_name: string;
    branch_id?: string;
  }): Promise<ChurchLoginResponse> => {
    const res = await apiClient.post<ChurchLoginResponse>("/church/auth/login-code", payload);
    return res.data;
  },

  loginByEmail: async (payload: {
    email: string;
    password: string;
  }): Promise<ChurchLoginResponse> => {
    const res = await apiClient.post<ChurchLoginResponse>("/church/auth/login", payload);
    return res.data;
  },

  loginKlaroContaAdmin: async (payload: {
    email: string;
    password: string;
  }): Promise<KlaroContaLoginResponse> => {
    const res = await apiClient.post<KlaroContaLoginResponse>("/login_user", payload);
    return res.data;
  },

  getContext: async (): Promise<ChurchContextResponse> => {
    const res = await apiClient.get<ChurchContextResponse>("/church/context");
    return res.data;
  },

  listBranchesWithToken: async (token: string): Promise<ChurchBranch[]> => {
    const res = await apiClient.get<{ branches: ChurchBranch[] }>("/church/branches", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data?.branches ?? [];
  },

  listMinistriesWithToken: async (token: string): Promise<ChurchMinistry[]> => {
    const res = await apiClient.get<{ ministries: ChurchMinistry[] }>("/church/ministries", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data?.ministries ?? [];
  },
};
