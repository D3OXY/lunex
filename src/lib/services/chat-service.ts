import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useChatStore, type Chat } from "../stores/chat-store";

interface Message {
    role: "user" | "assistant";
    content: string;
}

interface StreamingResponse {
    type: "start" | "delta" | "reasoning" | "complete" | "error";
    content?: string;
    error?: string;
    supportsReasoning?: boolean;
}

const UPDATE_INTERVAL_MS = 50;
const MAX_RETRY_ATTEMPTS = 3;

const isStreamingResponse = (value: unknown): value is StreamingResponse => {
    if (typeof value !== "object" || value === null) return false;
    const t = (value as StreamingResponse).type;
    return t === "start" || t === "delta" || t === "reasoning" || t === "complete" || t === "error";
};

const streamChatResponse = async (
    messages: Message[],
    chatId: Id<"chats">,
    modelId: string,
    onStream?: (content: string) => void,
    onReasoning?: (content: string) => void,
    onComplete?: (fullResponse: string) => void,
    onError?: (error: string) => void
): Promise<void> => {
    const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages, chatId, modelId }),
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
    let supportsReasoning = false;

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter((line) => line.trim());

        for (const line of lines) {
            try {
                const parsed = JSON.parse(line) as unknown;
                if (!isStreamingResponse(parsed)) continue;

                switch (parsed.type) {
                    case "start":
                        supportsReasoning = Boolean(parsed.supportsReasoning);
                        break;
                    case "delta":
                        if (parsed.content) {
                            fullResponse += parsed.content;
                            onStream?.(parsed.content);
                        }
                        break;
                    case "reasoning":
                        if (parsed.content && supportsReasoning) {
                            onReasoning?.(parsed.content);
                        }
                        break;
                    case "complete":
                        onComplete?.(fullResponse);
                        return;
                    case "error":
                        onError?.(parsed.error ?? "Unknown error");
                        return;
                }
            } catch {
                // Ignore parsing errors for individual chunks
            }
        }
    }
};

export function useChatService() {
    const createChat = useMutation(api.chats.createChat);
    const updateMessages = useMutation(api.chats.updateMessages);
    const updateChatTitle = useMutation(api.chats.updateChatTitle);
    const deleteChat = useMutation(api.chats.deleteChat);

    const { setIsStreaming, addMessage: addMessageToStore, updateMessage, updateMessageReasoning, addChat: addChatToStore, getCurrentChat, setCurrentChatId } = useChatStore();

    const sendMessage = async (
        content: string,
        modelId: string,
        chatId?: Id<"chats">,
        userId?: Id<"users">,
        onChatCreated?: (chatId: Id<"chats">) => void
    ): Promise<Id<"chats">> => {
        let currentChatId = chatId;

        // Create new chat if needed
        if (!currentChatId && userId) {
            currentChatId = await createChat({
                title: "New Chat",
                userMessage: content, // Pass user message for background title generation
            });

            if (currentChatId) {
                const newChat: Chat = {
                    _id: currentChatId,
                    userId,
                    title: "New Chat",
                    messages: [],
                    _creationTime: Date.now(),
                };
                addChatToStore(newChat);
                setCurrentChatId(currentChatId); // Set as current chat immediately

                // Call the callback if provided (for immediate navigation)
                onChatCreated?.(currentChatId);
            }
        }

        if (!currentChatId) {
            throw new Error("Chat ID not available");
        }

        // Add user message to the chat
        addMessageToStore(currentChatId, { role: "user", content });

        // For new chats, we know the messages are just the user message we added
        // For existing chats, get the current messages
        const isNewChat = !chatId;
        const baseMessages: Message[] = isNewChat ? [{ role: "user", content }] : (getCurrentChat()?.messages ?? [{ role: "user", content }]);

        // Add assistant placeholder
        addMessageToStore(currentChatId, { role: "assistant", content: "", isStreaming: true });

        const assistantIndex = baseMessages.length;
        const messages: Message[] = [...baseMessages];

        setIsStreaming(true);

        let fullResponse = "";
        let lastUpdate = Date.now();
        let attempt = 0;

        const executeStream = async (): Promise<void> => {
            try {
                await streamChatResponse(
                    messages,
                    currentChatId,
                    modelId,
                    (chunk: string) => {
                        fullResponse += chunk;
                        const now = Date.now();
                        if (now - lastUpdate >= UPDATE_INTERVAL_MS) {
                            updateMessage(currentChatId, assistantIndex, fullResponse);
                            lastUpdate = now;
                        }
                    },
                    (reasoning: string) => {
                        updateMessageReasoning(currentChatId, assistantIndex, reasoning);
                    },
                    (response) => {
                        setIsStreaming(false);
                        updateMessage(currentChatId, assistantIndex, response);

                        // Persist to database
                        const sanitized: Message[] = baseMessages.map((m) => ({ role: m.role, content: m.content }));
                        void updateMessages({
                            chatId: currentChatId,
                            messages: [...sanitized, { role: "assistant", content: response }],
                        });
                    },
                    (error: string) => {
                        console.error("Stream error:", error);
                        attempt += 1;
                        if (attempt < MAX_RETRY_ATTEMPTS) {
                            const backoffMs = 1000 * attempt;
                            console.info(`Retrying stream in ${backoffMs}ms (attempt ${attempt + 1}/${MAX_RETRY_ATTEMPTS})...`);
                            setTimeout(() => void executeStream(), backoffMs);
                        } else {
                            setIsStreaming(false);
                            updateMessage(currentChatId, assistantIndex, `Error after ${MAX_RETRY_ATTEMPTS} attempts: ${error}`);
                        }
                    }
                );
            } catch (err: unknown) {
                console.error("executeStream error", err instanceof Error ? err.message : err);
                setIsStreaming(false);
                updateMessage(currentChatId, assistantIndex, "An error occurred while streaming the response");
            }
        };

        try {
            await executeStream();
            return currentChatId;
        } catch (error: unknown) {
            setIsStreaming(false);
            const message = error instanceof Error ? error.message : "Unknown error";
            console.error("Send message error:", message);
            throw new Error(message);
        }
    };

    return {
        sendMessage,
        createChat,
        updateChatTitle,
        deleteChat,
    };
}
