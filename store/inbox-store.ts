"use client";

import { create } from "zustand";

import type { Message } from "@/types";

interface InboxState {
  selectedConversationId?: string;
  typingConversationIds: Record<string, boolean>;
  appendMessage: (conversationId: string, message: Message) => void;
  liveMessages: Record<string, Message[]>;
  setSelectedConversationId: (conversationId?: string) => void;
  setTyping: (conversationId: string, value: boolean) => void;
}

export const useInboxStore = create<InboxState>((set) => ({
  selectedConversationId: undefined,
  typingConversationIds: {},
  liveMessages: {},
  appendMessage: (conversationId, message) =>
    set((state) => ({
      liveMessages: {
        ...state.liveMessages,
        [conversationId]: [...(state.liveMessages[conversationId] || []), message],
      },
    })),
  setSelectedConversationId: (conversationId) => set({ selectedConversationId: conversationId }),
  setTyping: (conversationId, value) =>
    set((state) => ({
      typingConversationIds: {
        ...state.typingConversationIds,
        [conversationId]: value,
      },
    })),
}));
