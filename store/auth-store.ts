"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { AgentProfile } from "@/types";

interface AuthState {
  token: string;
  user: AgentProfile | null;
  setSession: (token: string, user: AgentProfile) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: "",
      user: null,
      setSession: (token, user) => {
        localStorage.setItem("chat_access_token", token);
        set({ token, user });
      },
      clearSession: () => {
        localStorage.removeItem("chat_access_token");
        set({ token: "", user: null });
      },
    }),
    {
      name: "chat-auth-store",
    },
  ),
);
