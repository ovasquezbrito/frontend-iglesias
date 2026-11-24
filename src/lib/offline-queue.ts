import { create } from "zustand";
import { persist } from "zustand/middleware";
import axios from "axios";
import { apiClient } from "@/lib/axios";

export type OfflineOpType = "CREATE_PERSON" | "CREATE_EVENT" | "CHECK_IN" | "CREATE_OFFERING";

export interface OfflineOperation {
  opId: string;
  type: OfflineOpType;
  endpoint: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

const PRIORITY: Record<OfflineOpType, number> = {
  CREATE_PERSON: 1,
  CREATE_EVENT: 2,
  CHECK_IN: 3,
  CREATE_OFFERING: 4,
};

interface OfflineQueueState {
  queue: OfflineOperation[];
  isSyncing: boolean;
  enqueue: (op: Omit<OfflineOperation, "opId" | "createdAt">) => void;
  flush: () => Promise<{ synced: number; failed: number }>;
  clear: () => void;
}

export const useOfflineQueueStore = create<OfflineQueueState>()(
  persist(
    (set, get) => ({
      queue: [],
      isSyncing: false,

      enqueue: (op) => {
        const entry: OfflineOperation = {
          ...op,
          opId: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ queue: [...state.queue, entry] }));
      },

      flush: async () => {
        const { queue, isSyncing } = get();
        if (isSyncing || queue.length === 0 || !navigator.onLine) {
          return { synced: 0, failed: 0 };
        }

        set({ isSyncing: true });
        const ordered = [...queue].sort((a, b) => {
          const diff = PRIORITY[a.type] - PRIORITY[b.type];
          return diff !== 0 ? diff : a.createdAt.localeCompare(b.createdAt);
        });

        const remaining: OfflineOperation[] = [];
        let synced = 0;
        let failed = 0;

        for (const op of ordered) {
          try {
            await apiClient.post(op.endpoint, op.payload);
            synced++;
          } catch (err) {
            if (axios.isAxiosError(err)) {
              const status = err.response?.status;
              // 409 Conflict = idempotent duplicate (UUID or event+person already synced)
              if (status === 409) {
                synced++;
                continue;
              }
              // 4xx validation/precondition won't succeed on retry; drop to avoid blocking queue
              if (status && status >= 400 && status < 500 && status !== 401 && status !== 429) {
                failed++;
                continue;
              }
            }
            // Network / 5xx / 401 -> keep in queue for next retry
            remaining.push(op);
            failed++;
          }
        }

        set({ queue: remaining, isSyncing: false });
        return { synced, failed };
      },

      clear: () => set({ queue: [], isSyncing: false }),
    }),
    {
      name: "klaro-iglesia-offline-queue",
    }
  )
);
