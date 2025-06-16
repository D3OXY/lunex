import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type { Id } from "../../../convex/_generated/dataModel";
import { DEFAULT_MODEL } from "@/lib/models";

interface Message {
    role: "user" | "assistant";
    content: string;
    reasoning?: string;
    id?: string;
    isStreaming?: boolean;
    attachments?: FileAttachment[];
}

export interface FileAttachment {
    url: string;
    name: string;
    size: number;
    type: "image" | "pdf";
}

export interface Chat {
    _id: Id<"chats">;
    userId: Id<"users">;
    title: string;
    messages: Message[];
    _creationTime: number;
    updatedAt: number;
    branched: boolean;
    visibility: "public" | "private";
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
    webSearchEnabled: boolean;
    attachments: FileAttachment[];

    // Stream priority tracking
    activeStreamChatId: Id<"chats"> | null;
    streamingMessageIndex: number | null;

    // Actions
    setQuery: (query: string) => void;
    setSelectedModel: (model: string) => void;
    setChats: (chats: Chat[]) => void;
    mergeChatsFromServer: (serverChats: Chat[]) => void;
    setCurrentChatId: (chatId: Id<"chats"> | null) => void;
    addChat: (chat: Chat) => void;
    updateChat: (chatId: Id<"chats">, updates: Partial<Chat>) => void;
    removeChat: (chatId: Id<"chats">) => void;
    setWebSearchEnabled: (enabled: boolean) => void;
    addAttachment: (attachment: FileAttachment) => void;
    removeAttachment: (index: number) => void;
    clearAttachments: () => void;

    // Message actions
    addMessage: (chatId: Id<"chats">, message: Message) => void;
    updateMessage: (chatId: Id<"chats">, messageIndex: number, content: string) => void;
    updateMessageReasoning: (chatId: Id<"chats">, messageIndex: number, reasoning: string) => void;
    setIsStreaming: (isStreaming: boolean) => void;
    setStreamingMessage: (message: string) => void;
    clearStreamingMessage: () => void;

    // Stream priority actions
    startStreaming: (chatId: Id<"chats">, messageIndex: number) => void;
    stopStreaming: () => void;

    // Utilities
    getCurrentChat: () => Chat | null;
    getChatById: (chatId: Id<"chats">) => Chat | null;
}

export const useChatStore = create<ChatState>()(
    subscribeWithSelector((set, get) => ({
        // Initial state
        query: "",
        selectedModel: DEFAULT_MODEL,
        chats: [],
        currentChatId: null,
        isLoading: false,
        isStreaming: false,
        streamingMessage: "",
        webSearchEnabled: false,
        attachments: [],
        activeStreamChatId: null,
        streamingMessageIndex: null,

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
                        // If this specific chat is currently streaming, prioritize local state completely
                        // This prevents server data from overriding streaming content prematurely
                        if (state.activeStreamChatId === serverChat._id && state.isStreaming) {
                            return {
                                ...serverChat,
                                messages: localChat.messages, // Keep local streaming messages
                            };
                        }

                        // If not streaming, check if we should use server data
                        const serverHasMoreMessages = serverChat.messages.length > localChat.messages.length;
                        const serverLastMessage = serverChat.messages[serverChat.messages.length - 1];
                        const localLastMessage = localChat.messages[localChat.messages.length - 1];

                        // Only use server data if it has significantly more content or different structure
                        // This prevents premature replacement of streaming content
                        const serverHasSignificantlyMoreContent =
                            serverLastMessage &&
                            localLastMessage &&
                            serverLastMessage.role === localLastMessage.role &&
                            serverLastMessage.content.length > localLastMessage.content.length + 10; // Add buffer to prevent premature replacement

                        // Check if the local message is marked as streaming - if so, don't replace it
                        const localMessageIsStreaming = localLastMessage?.isStreaming === true;

                        const shouldUseServerMessages = Boolean(serverHasMoreMessages || (serverHasSignificantlyMoreContent && !localMessageIsStreaming));

                        return {
                            ...serverChat,
                            messages: shouldUseServerMessages ? serverChat.messages : localChat.messages,
                        };
                    }
                    return serverChat;
                });

                // Only add local-only chats that are very recent (created in the last 30 seconds)
                // This prevents keeping deleted chats that haven't been synced yet
                const serverChatIds = new Set(serverChats.map((chat) => chat._id));
                const now = Date.now();
                const localOnlyChats = state.chats.filter((chat) => {
                    if (serverChatIds.has(chat._id)) return false;

                    // Only keep local chats that are very recent (likely pending sync)
                    const chatAge = now - chat._creationTime;
                    return chatAge < 30000; // 30 seconds
                });

                // Update currentChatId if the current chat was deleted
                let newCurrentChatId = state.currentChatId;
                if (state.currentChatId && !serverChatIds.has(state.currentChatId)) {
                    // Check if it's in localOnlyChats
                    const isLocalOnly = localOnlyChats.some((chat) => chat._id === state.currentChatId);
                    if (!isLocalOnly) {
                        newCurrentChatId = null;
                    }
                }

                return {
                    chats: [...localOnlyChats, ...mergedChats],
                    currentChatId: newCurrentChatId,
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

        setWebSearchEnabled: (enabled) => set({ webSearchEnabled: enabled }),

        addAttachment: (attachment) =>
            set((state) => ({
                attachments: [...state.attachments, attachment],
            })),

        removeAttachment: (index) =>
            set((state) => ({
                attachments: state.attachments.filter((_, i) => i !== index),
            })),

        clearAttachments: () => set({ attachments: [] }),

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

        // Stream priority actions
        startStreaming: (chatId, messageIndex) =>
            set({
                activeStreamChatId: chatId,
                streamingMessageIndex: messageIndex,
                isStreaming: true,
            }),

        stopStreaming: () =>
            set((state) => {
                // Clear the isStreaming flag from the message that was being streamed
                if (state.activeStreamChatId && state.streamingMessageIndex !== null) {
                    const updatedChats = state.chats.map((chat) =>
                        chat._id === state.activeStreamChatId
                            ? {
                                  ...chat,
                                  messages: chat.messages.map((msg, index) => (index === state.streamingMessageIndex ? { ...msg, isStreaming: false } : msg)),
                              }
                            : chat
                    );

                    return {
                        activeStreamChatId: null,
                        streamingMessageIndex: null,
                        isStreaming: false,
                        chats: updatedChats,
                    };
                }

                return {
                    activeStreamChatId: null,
                    streamingMessageIndex: null,
                    isStreaming: false,
                };
            }),

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
export const useWebSearchEnabled = () => useChatStore((state) => state.webSearchEnabled);
