import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useChatStore, type Chat } from "../stores/chat-store";
import { useAuth } from "@clerk/nextjs";

interface Message {
    role: "user" | "assistant";
    content:
        | string
        | Array<{
              type: "text" | "image_url" | "file";
              text?: string;
              image_url?: {
                  url: string;
              };
              data?: string;
              mimeType?: string;
          }>;
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
    authToken: string,
    webSearchEnabled: boolean,
    onStream?: (content: string) => void,
    onReasoning?: (content: string) => void,
    onComplete?: (fullResponse: string) => void,
    onError?: (error: string) => void
): Promise<void> => {
    const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages, chatId, modelId, authToken, webSearchEnabled }),
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
    const updateChatTitle = useMutation(api.chats.updateChatTitle);
    const deleteChat = useMutation(api.chats.deleteChat);
    const { getToken } = useAuth();

    const {
        addMessage: addMessageToStore,
        updateMessage,
        updateMessageReasoning,
        addChat: addChatToStore,
        getCurrentChat,
        setCurrentChatId,
        startStreaming,
        stopStreaming,
        webSearchEnabled,
        attachments,
        clearAttachments,
    } = useChatStore();

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

        // Get auth token for API calls with Convex audience
        const authToken = await getToken({ template: "convex" });
        if (!authToken) {
            throw new Error("Authentication token not available");
        }

        // Prepare user message content with attachments
        let userMessageContent:
            | string
            | Array<{
                  type: "text" | "image_url" | "file";
                  text?: string;
                  image_url?: { url: string };
                  data?: string;
                  mimeType?: string;
              }>;

        if (attachments.length > 0) {
            // Multi-modal message with text and attachments
            const contentParts: Array<{
                type: "text" | "image_url" | "file";
                text?: string;
                image_url?: { url: string };
                data?: string;
                mimeType?: string;
            }> = [];

            // Add text content if present
            if (content.trim()) {
                contentParts.push({
                    type: "text",
                    text: content.trim(),
                });
            }

            // Add attachments
            attachments.forEach((attachment) => {
                if (attachment.type === "image") {
                    contentParts.push({
                        type: "image_url",
                        image_url: {
                            url: attachment.url,
                        },
                    });
                } else if (attachment.type === "pdf") {
                    // For PDFs, use the file type with URL reference
                    contentParts.push({
                        type: "file",
                        data: attachment.url, // UploadThing URL
                        mimeType: "application/pdf",
                    });
                }
            });

            userMessageContent = contentParts;
        } else {
            // Simple text message
            userMessageContent = content;
        }

        // Add user message to the chat (display version)
        const displayContent = content + (attachments.length > 0 ? `\n${attachments.map((att) => `📎 ${att.name}`).join("\n")}` : "");

        addMessageToStore(currentChatId, { role: "user", content: displayContent });

        // For new chats, we know the messages are just the user message we added
        // For existing chats, get the current messages and convert to API format
        const isNewChat = !chatId;
        let baseMessages: Message[];

        if (isNewChat) {
            baseMessages = [{ role: "user", content: userMessageContent }];
        } else {
            const currentChat = getCurrentChat();
            const chatMessages = currentChat?.messages ?? [];

            // Convert existing messages to API format (keeping last few for context)
            const recentMessages = chatMessages.slice(-10); // Keep last 10 messages for context
            baseMessages = recentMessages.map((msg) => ({
                role: msg.role,
                content: msg.content,
            }));

            // Add the new user message
            baseMessages.push({ role: "user", content: userMessageContent });
        }

        // Add assistant placeholder and start streaming tracking
        addMessageToStore(currentChatId, { role: "assistant", content: "", isStreaming: true });
        const assistantIndex = isNewChat ? 1 : (getCurrentChat()?.messages.length ?? 1);

        // Start stream priority tracking
        startStreaming(currentChatId, assistantIndex);

        // Clear attachments after preparing the message
        clearAttachments();

        let fullResponse = "";
        let lastUpdate = Date.now();
        let attempt = 0;

        const executeStream = async (): Promise<void> => {
            try {
                await streamChatResponse(
                    baseMessages,
                    currentChatId,
                    modelId,
                    authToken,
                    webSearchEnabled,
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
                        // Stop streaming tracking first
                        stopStreaming();
                        updateMessage(currentChatId, assistantIndex, response);
                        // Database update is now handled by the backend
                        // No need to call updateMessages from frontend
                    },
                    (error: string) => {
                        console.error("Stream error:", error);
                        attempt += 1;
                        if (attempt < MAX_RETRY_ATTEMPTS) {
                            const backoffMs = 1000 * attempt;
                            console.info(`Retrying stream in ${backoffMs}ms (attempt ${attempt + 1}/${MAX_RETRY_ATTEMPTS})...`);
                            setTimeout(() => void executeStream(), backoffMs);
                        } else {
                            stopStreaming();
                            updateMessage(currentChatId, assistantIndex, `Error after ${MAX_RETRY_ATTEMPTS} attempts: ${error}`);
                        }
                    }
                );
            } catch (err: unknown) {
                console.error("executeStream error", err instanceof Error ? err.message : err);
                stopStreaming();
                updateMessage(currentChatId, assistantIndex, "An error occurred while streaming the response");
            }
        };

        try {
            await executeStream();
            return currentChatId;
        } catch (error: unknown) {
            stopStreaming();
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
