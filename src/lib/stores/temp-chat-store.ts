import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

interface Message {
    role: "user" | "assistant";
    content: string;
    reasoning?: string;
    id?: string;
    isStreaming?: boolean;
}

export interface TempChat {
    id: string;
    title: string;
    messages: Message[];
    createdAt: number;
    updatedAt: number;
}

interface TempChatState {
    // State
    currentTempChat: TempChat | null;
    isStreaming: boolean;
    streamingMessage: string;

    // Stream priority tracking
    streamingMessageIndex: number | null;

    // Actions
    createTempChat: () => string;
    addMessage: (message: Message) => void;
    updateMessage: (messageIndex: number, content: string) => void;
    updateMessageReasoning: (messageIndex: number, reasoning: string) => void;
    setIsStreaming: (isStreaming: boolean) => void;
    setStreamingMessage: (message: string) => void;
    clearStreamingMessage: () => void;
    clearTempChat: () => void;

    // Stream priority actions
    startStreaming: (messageIndex: number) => void;
    stopStreaming: () => void;

    // Utilities
    getTempChat: () => TempChat | null;
}

export const useTempChatStore = create<TempChatState>()(
    subscribeWithSelector((set, get) => ({
        // Initial state
        currentTempChat: null,
        isStreaming: false,
        streamingMessage: "",
        streamingMessageIndex: null,

        // Actions
        createTempChat: () => {
            const id = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
            const now = Date.now();

            const tempChat: TempChat = {
                id,
                title: "Temporary Chat",
                messages: [],
                createdAt: now,
                updatedAt: now,
            };

            set({ currentTempChat: tempChat });
            return id;
        },

        addMessage: (message) =>
            set((state) => {
                if (!state.currentTempChat) return state;

                return {
                    currentTempChat: {
                        ...state.currentTempChat,
                        messages: [...state.currentTempChat.messages, message],
                        updatedAt: Date.now(),
                    },
                };
            }),

        updateMessage: (messageIndex, content) =>
            set((state) => {
                if (!state.currentTempChat) return state;

                return {
                    currentTempChat: {
                        ...state.currentTempChat,
                        messages: state.currentTempChat.messages.map((msg, index) => (index === messageIndex ? { ...msg, content } : msg)),
                        updatedAt: Date.now(),
                    },
                };
            }),

        updateMessageReasoning: (messageIndex, reasoning) =>
            set((state) => {
                if (!state.currentTempChat) return state;

                return {
                    currentTempChat: {
                        ...state.currentTempChat,
                        messages: state.currentTempChat.messages.map((msg, index) => (index === messageIndex ? { ...msg, reasoning: (msg.reasoning ?? "") + reasoning } : msg)),
                        updatedAt: Date.now(),
                    },
                };
            }),

        setIsStreaming: (isStreaming) => set({ isStreaming }),

        setStreamingMessage: (message) => set({ streamingMessage: message }),

        clearStreamingMessage: () => set({ streamingMessage: "" }),

        clearTempChat: () =>
            set({
                currentTempChat: null,
                isStreaming: false,
                streamingMessage: "",
                streamingMessageIndex: null,
            }),

        // Stream priority actions
        startStreaming: (messageIndex) =>
            set({
                streamingMessageIndex: messageIndex,
                isStreaming: true,
            }),

        stopStreaming: () =>
            set((state) => {
                // Clear the isStreaming flag from the message that was being streamed
                if (state.currentTempChat && state.streamingMessageIndex !== null) {
                    const updatedMessages = state.currentTempChat.messages.map((msg, index) => (index === state.streamingMessageIndex ? { ...msg, isStreaming: false } : msg));

                    return {
                        streamingMessageIndex: null,
                        isStreaming: false,
                        currentTempChat: {
                            ...state.currentTempChat,
                            messages: updatedMessages,
                        },
                    };
                }

                return {
                    streamingMessageIndex: null,
                    isStreaming: false,
                };
            }),

        // Utilities
        getTempChat: () => {
            const { currentTempChat } = get();
            return currentTempChat;
        },
    }))
);

// Selector hooks for better performance
export const useCurrentTempChat = () => useTempChatStore((state) => state.currentTempChat);
export const useTempChatIsStreaming = () => useTempChatStore((state) => state.isStreaming);
export const useTempChatStreamingMessage = () => useTempChatStore((state) => state.streamingMessage);
