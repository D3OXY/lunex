import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useChatStore, type Chat } from "../stores/chat-store";

type Role = "user" | "assistant";

const isRole = (value: unknown): value is Role =>
    value === "user" || value === "assistant";

interface Message {
    role: Role;
    content: string;
}

interface Usage {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
}

interface StreamingResponse {
    type: "start" | "delta" | "complete" | "error";
    content?: string;
    chatId?: string;
    usage?: Usage;
    error?: string;
}

interface OpenAIStreamResponse {
    choices?: Array<{
        delta?: {
            content?: string;
        };
    }>;
}

interface CompletionResponse {
    message: string;
    usage?: Usage;
}

export class ChatService {
    private static instance: ChatService;

    static getInstance(): ChatService {
        if (!ChatService.instance) {
            ChatService.instance = new ChatService();
        }
        return ChatService.instance;
    }

    async sendMessage(
        messages: Message[],
        chatId: Id<"chats">,
        onStream?: (content: string) => void,
        onComplete?: (fullResponse: string) => void,
        onError?: (error: string) => void
    ): Promise<void> {
        try {
            const response = await fetch("/api/chat/stream", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ messages, chatId }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error("Response body is not readable");
            }

            const decoder = new TextDecoder();
            let fullResponse = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split("\n").filter((line) => line.trim());

                for (const line of lines) {
                    if (line.startsWith("data: ")) {
                        const data = line.slice(6);
                        if (data === "[DONE]") {
                            onComplete?.(fullResponse);
                            return;
                        }

                        try {
                            const parsed: OpenAIStreamResponse = JSON.parse(data);
                            if (parsed.choices?.[0]?.delta?.content) {
                                const content = parsed.choices[0].delta.content;
                                fullResponse += content;
                                onStream?.(content);
                            }
                        } catch (e) {
                            // Ignore parsing errors for individual chunks
                        }
                    }
                }
            }

            onComplete?.(fullResponse);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Unknown error";
            console.error("Streaming error:", message);
            onError?.(message);
        }
    }

    async sendMessageCustomStream(
        messages: Message[],
        chatId: Id<"chats">,
        onStream?: (content: string) => void,
        onComplete?: (fullResponse: string) => void,
        onError?: (error: string) => void
    ): Promise<void> {
        try {
            const response = await fetch("/api/chat/custom-stream", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ messages, chatId }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error("Response body is not readable");
            }

            const decoder = new TextDecoder();
            let fullResponse = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split("\n").filter((line) => line.trim());

                for (const line of lines) {
                    try {
                        const data: StreamingResponse = JSON.parse(line);

                        switch (data.type) {
                            case "start":
                                // Initialize streaming
                                break;
                            case "delta":
                                if (data.content) {
                                    fullResponse += data.content;
                                    onStream?.(data.content);
                                }
                                break;
                            case "complete":
                                onComplete?.(fullResponse);
                                return;
                            case "error":
                                onError?.(data.error ?? "Unknown error");
                                return;
                        }
                    } catch (e) {
                        // Ignore parsing errors for individual chunks
                    }
                }
            }
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Unknown error";
            console.error("Custom streaming error:", message);
            onError?.(message);
        }
    }

    async sendMessageNonStreaming(messages: Message[], chatId: Id<"chats">): Promise<string> {
        try {
            const response = await fetch("/api/chat/completion", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ messages, chatId }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data: CompletionResponse = await response.json();
            return data.message;
        } catch (error: unknown) {
            const err = error instanceof Error ? error : new Error("Unknown error");
            console.error("Non-streaming error:", err.message);
            throw err;
        }
    }
}

// Hook for using chat service with Convex integration
export function useChatService() {
    const createChat = useMutation(api.chats.createChat);
    const addMessage = useMutation(api.chats.addMessage);
    const updateMessages = useMutation(api.chats.updateMessages);
    const deleteChat = useMutation(api.chats.deleteChat);
    const updateChatTitle = useMutation(api.chats.updateChatTitle);

    const chatService = ChatService.getInstance();
    const {
        setIsStreaming,
        setStreamingMessage,
        clearStreamingMessage,
        addMessage: addMessageToStore,
        addChat: addChatToStore,
        getCurrentChat,
    } = useChatStore();

    const sendMessage = async (
        content: string,
        chatId?: Id<"chats">,
        userId?: Id<"users">
    ): Promise<Id<"chats">> => {
        try {
            let currentChatId = chatId;

            // Create new chat if needed
            if (!currentChatId && userId) {
                const title = content.length > 50 ? content.substring(0, 50) + "..." : content;
                currentChatId = await createChat({ userId, title });

                // Optimistically add chat to local store so it appears immediately in sidebar
                if (currentChatId) {
                    const newChat: Chat = {
                        _id: currentChatId,
                        userId,
                        title,
                        messages: [],
                        _creationTime: Date.now(),
                    };
                    addChatToStore(newChat);
                }
            }

            if (!currentChatId) {
                throw new Error("Chat ID not available");
            }

            // Add user message to Convex
            await addMessage({
                chatId: currentChatId,
                role: "user",
                content,
            });

            // Add user message to store
            addMessageToStore(currentChatId, { role: "user", content });

            const currentChat = getCurrentChat();
            const messages: Message[] = currentChat ? [...currentChat.messages, { role: "user", content }] : [{ role: "user", content }];

            setIsStreaming(true);
            clearStreamingMessage();

            let fullResponse = "";

            let attempt = 0;
            const maxAttempts = 3;

            const executeStream = async (): Promise<void> => {
                try {
                    await chatService.sendMessageCustomStream(
                        messages as Message[],
                        currentChatId,
                        (chunk) => {
                            setStreamingMessage(fullResponse + chunk);
                            fullResponse += chunk;

                            // Persist partial content
                            const sanitized: Message[] = messages.map((m) => ({ role: m.role, content: m.content }));
                            void updateMessages({
                                chatId: currentChatId,
                                messages: [...sanitized, { role: "assistant", content: fullResponse }],
                            });
                        },
                        (response) => {
                            setIsStreaming(false);
                            clearStreamingMessage();
                            void addMessage({ chatId: currentChatId, role: "assistant", content: response });
                            addMessageToStore(currentChatId, { role: "assistant", content: response });
                        },
                        (error: string) => {
                            console.error("Stream error:", error);
                            attempt += 1;
                            if (attempt < maxAttempts) {
                                console.info(`Retrying stream (attempt ${attempt + 1}/${maxAttempts})...`);
                                void executeStream();
                            } else {
                                setIsStreaming(false);
                                clearStreamingMessage();
                                addMessageToStore(currentChatId, {
                                    role: "assistant",
                                    content: `Error after ${maxAttempts} attempts: ${error}`,
                                });
                            }
                        }
                    );
                } catch (err: unknown) {
                    console.error(
                        "executeStream error",
                        err instanceof Error ? err.message : err
                    );
                }
            };

            await executeStream();

            return currentChatId;
        } catch (error: unknown) {
            setIsStreaming(false);
            clearStreamingMessage();
            const message = error instanceof Error ? error.message : "Unknown error";
            console.error("Send message error:", message);
            throw new Error(message);
        }
    };

    return {
        sendMessage,
        createChat,
        deleteChat,
        updateChatTitle,
        chatService,
    };
}
