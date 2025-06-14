import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type { Id } from "../../../convex/_generated/dataModel";

interface Message {
    role: "user" | "assistant";
    content: string;
    reasoning?: string;
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
    mergeChatsFromServer: (serverChats: Chat[]) => void;
    setCurrentChatId: (chatId: Id<"chats"> | null) => void;
    addChat: (chat: Chat) => void;
    updateChat: (chatId: Id<"chats">, updates: Partial<Chat>) => void;
    removeChat: (chatId: Id<"chats">) => void;

    // Message actions
    addMessage: (chatId: Id<"chats">, message: Message) => void;
    updateMessage: (chatId: Id<"chats">, messageIndex: number, content: string) => void;
    updateMessageReasoning: (chatId: Id<"chats">, messageIndex: number, reasoning: string) => void;
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

        mergeChatsFromServer: (serverChats) =>
            set((state) => {
                // Create a map of current local chats for quick lookup
                const localChatsMap = new Map(state.chats.map((chat) => [chat._id, chat]));

                // Merge server chats with local state, preserving local optimistic updates
                const mergedChats = serverChats.map((serverChat) => {
                    const localChat = localChatsMap.get(serverChat._id);
                    if (localChat) {
                        // If we have local changes (like streaming messages), preserve them
                        // but update server-side properties like title
                        return {
                            ...serverChat,
                            messages: localChat.messages.length > serverChat.messages.length ? localChat.messages : serverChat.messages,
                        };
                    }
                    return serverChat;
                });

                // Add any local-only chats that aren't on the server yet
                const serverChatIds = new Set(serverChats.map((chat) => chat._id));
                const localOnlyChats = state.chats.filter((chat) => !serverChatIds.has(chat._id));

                return {
                    chats: [...localOnlyChats, ...mergedChats],
                };
            }),

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

        updateMessageReasoning: (chatId, messageIndex, reasoning) =>
            set((state) => ({
                chats: state.chats.map((chat) =>
                    chat._id === chatId
                        ? {
                              ...chat,
                              messages: chat.messages.map((msg, index) => (index === messageIndex ? { ...msg, reasoning: (msg.reasoning ?? "") + reasoning } : msg)),
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
