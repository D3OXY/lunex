/* eslint-disable @typescript-eslint/no-unused-vars */
import { useTempChatStore } from "../stores/temp-chat-store";
import { useChatStore } from "../stores/chat-store";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

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

const UPDATE_INTERVAL_MS = 25;

const isStreamingResponse = (value: unknown): value is StreamingResponse => {
    if (typeof value !== "object" || value === null) return false;
    const t = (value as StreamingResponse).type;
    return t === "start" || t === "delta" || t === "reasoning" || t === "complete" || t === "error";
};

const streamChatResponse = async (
    messages: Message[],
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
        body: JSON.stringify({
            messages,
            chatId: null, // No chat ID for temporary chats
            modelId,
            authToken,
            webSearchEnabled,
            isTemporary: true, // Flag to indicate this is a temporary chat
        }),
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

export function useTempChatService() {
    const {
        createTempChat,
        addMessage: addTempMessage,
        updateMessage: updateTempMessage,
        updateMessageReasoning: updateTempMessageReasoning,
        startStreaming: startTempStreaming,
        stopStreaming: stopTempStreaming,
        getTempChat,
        clearTempChat,
    } = useTempChatStore();

    const { selectedModel, webSearchEnabled, attachments, clearAttachments } = useChatStore();

    const saveTempChatBackend = useMutation(api.chats.saveTempChat);

    const sendMessage = async (content: string, authToken: string, onComplete?: () => void): Promise<string> => {
        let tempChat = getTempChat();

        // Create temporary chat if it doesn't exist
        if (!tempChat) {
            createTempChat();
            tempChat = getTempChat();
            if (!tempChat) {
                throw new Error("Failed to create temporary chat");
            }
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
                    contentParts.push({
                        type: "file",
                        data: attachment.url,
                        mimeType: "application/pdf",
                    });
                }
            });

            userMessageContent = contentParts;
        } else {
            userMessageContent = content;
        }

        // Add user message to the temporary chat (display version)
        const displayContent = content + (attachments.length > 0 ? `\n${attachments.map((att) => `📎 ${att.name}`).join("\n")}` : "");
        addTempMessage({ role: "user", content: displayContent });

        // Get updated temp chat after adding user message
        tempChat = getTempChat();
        if (!tempChat) {
            throw new Error("Temporary chat lost after adding user message");
        }

        // Prepare messages for API (use the messages we already have in temp chat)
        const apiMessages: Message[] = tempChat.messages.map((msg) => ({ role: msg.role, content: msg.content }));

        // Add assistant placeholder and start streaming tracking
        addTempMessage({ role: "assistant", content: "", isStreaming: true });

        // Get the correct assistant index after adding the assistant placeholder
        const updatedTempChat = getTempChat();
        const assistantIndex = updatedTempChat ? updatedTempChat.messages.length - 1 : 0;

        // Start stream priority tracking
        startTempStreaming(assistantIndex);

        // Clear attachments after preparing the message
        clearAttachments();

        let fullResponse = "";
        let lastUpdate = Date.now();

        try {
            await streamChatResponse(
                apiMessages,
                selectedModel,
                authToken,
                webSearchEnabled,
                (chunk: string) => {
                    fullResponse += chunk;
                    const now = Date.now();

                    // Always update on first chunk for immediate visual feedback
                    const isFirstChunk = fullResponse === chunk;

                    if (isFirstChunk || now - lastUpdate >= UPDATE_INTERVAL_MS) {
                        updateTempMessage(assistantIndex, fullResponse);
                        lastUpdate = now;
                    }
                },
                (reasoning: string) => {
                    updateTempMessageReasoning(assistantIndex, reasoning);
                },
                (response) => {
                    // Stop streaming tracking first
                    stopTempStreaming();
                    updateTempMessage(assistantIndex, response);
                    onComplete?.();
                },
                (error: string) => {
                    console.error("Stream error:", error);
                    stopTempStreaming();
                    updateTempMessage(assistantIndex, error);
                }
            );
            return tempChat.id;
        } catch (error: unknown) {
            stopTempStreaming();
            const message = error instanceof Error ? error.message : "Unknown error";
            console.error("Send message error:", message);
            updateTempMessage(assistantIndex, message);
            return tempChat.id;
        }
    };

    const regenerateMessage = async (authToken: string): Promise<void> => {
        const tempChat = getTempChat();
        if (!tempChat || tempChat.messages.length === 0) return;

        // Add assistant placeholder and start streaming tracking
        addTempMessage({ role: "assistant", content: "", isStreaming: true });

        // Get the correct assistant index after adding the assistant placeholder
        const updatedTempChat = getTempChat();
        const assistantIndex = updatedTempChat ? updatedTempChat.messages.length - 1 : 0;

        // Start stream priority tracking
        startTempStreaming(assistantIndex);

        // Prepare messages for API (all existing messages)
        const apiMessages: Message[] = tempChat.messages
            .filter((msg) => !msg.isStreaming) // Exclude the streaming placeholder
            .map((msg) => ({ role: msg.role, content: msg.content }));

        let fullResponse = "";
        let lastUpdate = Date.now();

        try {
            await streamChatResponse(
                apiMessages,
                selectedModel,
                authToken,
                webSearchEnabled,
                (chunk: string) => {
                    fullResponse += chunk;
                    const now = Date.now();

                    // Always update on first chunk for immediate visual feedback
                    const isFirstChunk = fullResponse === chunk;

                    if (isFirstChunk || now - lastUpdate >= UPDATE_INTERVAL_MS) {
                        updateTempMessage(assistantIndex, fullResponse);
                        lastUpdate = now;
                    }
                },
                (reasoning: string) => {
                    updateTempMessageReasoning(assistantIndex, reasoning);
                },
                (response) => {
                    // Stop streaming tracking first
                    stopTempStreaming();
                    updateTempMessage(assistantIndex, response);
                },
                (error: string) => {
                    console.error("Stream error:", error);
                    stopTempStreaming();
                    updateTempMessage(assistantIndex, error);
                }
            );
        } catch (error: unknown) {
            stopTempStreaming();
            const message = error instanceof Error ? error.message : "Unknown error";
            console.error("Regenerate message error:", message);
            updateTempMessage(assistantIndex, message);
        }
    };

    const saveTempChat = async (): Promise<string> => {
        const tempChat = getTempChat();
        if (!tempChat) throw new Error("No temporary chat to save");

        // Ensure there is at least one non-streaming message
        const filteredMessages = tempChat.messages.filter((m) => !m.isStreaming);
        if (filteredMessages.length === 0) {
            throw new Error("No completed messages to save");
        }

        const simpleMessages = filteredMessages.map(({ role, content }) => ({ role, content }));

        const chatId = await saveTempChatBackend({ messages: simpleMessages });

        // Clear temp chat after saving
        clearTempChat();

        return chatId;
    };

    return {
        sendMessage,
        regenerateMessage,
        createTempChat,
        saveTempChat,
    };
}
