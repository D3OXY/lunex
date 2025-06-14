import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type { Id } from "../../../convex/_generated/dataModel";

interface Message {
    role: "user" | "assistant";
    content: string;
    id?: string;
    isStreaming?: boolean;
}

export interface Chat {
    _id: Id<"chats">;
    userId: Id<"users">;
    title: string;
    messages: Message[];
    _creationTime: number;
}

interface ChatState {
    // State
    query: string;
    selectedModel: string;
    chats: Chat[];
    currentChatId: Id<"chats"> | null;
    isLoading: boolean;
    isStreaming: boolean;
    streamingMessage: string;

    // Actions
    setQuery: (query: string) => void;
    setSelectedModel: (model: string) => void;
    setChats: (chats: Chat[]) => void;
    setCurrentChatId: (chatId: Id<"chats"> | null) => void;
    addChat: (chat: Chat) => void;
    updateChat: (chatId: Id<"chats">, updates: Partial<Chat>) => void;
    removeChat: (chatId: Id<"chats">) => void;

    // Message actions
    addMessage: (chatId: Id<"chats">, message: Message) => void;
    updateMessage: (chatId: Id<"chats">, messageIndex: number, content: string) => void;
    setIsStreaming: (isStreaming: boolean) => void;
    setStreamingMessage: (message: string) => void;
    clearStreamingMessage: () => void;

    // Utilities
    getCurrentChat: () => Chat | null;
    getChatById: (chatId: Id<"chats">) => Chat | null;
}

export const useChatStore = create<ChatState>()(
    subscribeWithSelector((set, get) => ({
        // Initial state
        query: "",
        selectedModel: "google/gemini-2.5-pro-exp-03-25",
        chats: [],
        currentChatId: null,
        isLoading: false,
        isStreaming: false,
        streamingMessage: "",

        // Actions
        setQuery: (query) => set({ query }),

        setSelectedModel: (model) => set({ selectedModel: model }),

        setChats: (chats) => set({ chats }),

        setCurrentChatId: (chatId) => set({ currentChatId: chatId }),

        addChat: (chat) =>
            set((state) => ({
                chats: [chat, ...state.chats],
            })),

        updateChat: (chatId, updates) =>
            set((state) => ({
                chats: state.chats.map((chat) => (chat._id === chatId ? { ...chat, ...updates } : chat)),
            })),

        removeChat: (chatId) =>
            set((state) => ({
                chats: state.chats.filter((chat) => chat._id !== chatId),
                currentChatId: state.currentChatId === chatId ? null : state.currentChatId,
            })),

        // Message actions
        addMessage: (chatId, message) =>
            set((state) => ({
                chats: state.chats.map((chat) => (chat._id === chatId ? { ...chat, messages: [...chat.messages, message] } : chat)),
            })),

        updateMessage: (chatId, messageIndex, content) =>
            set((state) => ({
                chats: state.chats.map((chat) =>
                    chat._id === chatId
                        ? {
                              ...chat,
                              messages: chat.messages.map((msg, index) => (index === messageIndex ? { ...msg, content } : msg)),
                          }
                        : chat
                ),
            })),

        setIsStreaming: (isStreaming) => set({ isStreaming }),

        setStreamingMessage: (message) => set({ streamingMessage: message }),

        clearStreamingMessage: () => set({ streamingMessage: "" }),

        // Utilities
        getCurrentChat: () => {
            const { chats, currentChatId } = get();
            return chats.find((chat) => chat._id === currentChatId) ?? null;
        },

        getChatById: (chatId) => {
            const { chats } = get();
            return chats.find((chat) => chat._id === chatId) ?? null;
        },
    }))
);

// Selector hooks for better performance
export const useCurrentChat = () => useChatStore((state) => state.getCurrentChat());
export const useChats = () => useChatStore((state) => state.chats);
export const useIsStreaming = () => useChatStore((state) => state.isStreaming);
export const useStreamingMessage = () => useChatStore((state) => state.streamingMessage);
