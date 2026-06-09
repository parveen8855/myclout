/* eslint-disable @typescript-eslint/no-explicit-any */

import { create } from "zustand";
import { getUserDoc } from "@/lib/firestore";

interface AuthState {
  user: any;
  loading: boolean;
  setUser: (user: any) => void;
  setLoading: (loading: boolean) => void;
  refreshUser: (uid: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: true,
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  refreshUser: async (uid) => {
    const freshDoc = await getUserDoc(uid);
    const currentUser = get().user;

    set({ user: { ...currentUser, ...freshDoc } });
  },
}));
