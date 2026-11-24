import axios, { type InternalAxiosRequestConfig } from "axios";
import { useChurchAuthStore } from "@/stores/church-auth.store";

const baseURL =
  import.meta.env.VITE_URL_API ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:8080/v1";

export const apiClient = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15_000,
});

apiClient.interceptors.request.use((config) => {
  const token = useChurchAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const { refreshToken, updateAccessToken, logout } = useChurchAuthStore.getState();
  if (!refreshToken) {
    logout();
    return null;
  }

  try {
    const res = await axios.post<{ access_token: string }>(`${baseURL}/tokens/renew_access`, {
      refresh_token: refreshToken,
    });
    const nextToken = res.data?.access_token;
    if (!nextToken) {
      logout();
      return null;
    }
    updateAccessToken(nextToken);
    return nextToken;
  } catch {
    logout();
    return null;
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    const url = original?.url || "";
    const isAuthRoute =
      url.includes("/church/auth/login") ||
      url.includes("/login_user") ||
      url.includes("/tokens/renew_access");

    if (error.response?.status === 401 && original && !original._retry && !isAuthRoute) {
      original._retry = true;

      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }

      const newToken = await refreshPromise;
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(original);
      }
    }

    return Promise.reject(error);
  }
);
