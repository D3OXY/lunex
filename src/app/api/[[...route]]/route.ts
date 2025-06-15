/* eslint-disable @typescript-eslint/await-thenable */
import { env } from "@/env";
import { MODELS, type ModelFeatures } from "@/lib/models";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { streamText, type CoreMessage } from "ai";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { stream } from "hono/streaming";
import { handle } from "hono/vercel";

const openrouter = createOpenRouter({
    apiKey: env.OPENROUTER_API_KEY,
});

const app = new Hono().basePath("/api");

// Configuration for incremental updates
const CHUNK_UPDATE_THRESHOLD = 50; // Update backend every 50 characters
const UPDATE_INTERVAL_MS = 1000; // Or every 1 second, whichever comes first

// Enable CORS for all routes
app.use(
    "*",
    cors({
        origin: ["http://localhost:3000"],
        allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowHeaders: ["Content-Type", "Authorization"],
    })
);

// const SYSTEM_PROMPT =
//     "You are Lunex Chat. When providing code, always wrap it in fenced markdown blocks with the appropriate language tag (e.g., ```tsx). Do not include extra commentary inside the fences." as const;
const SYSTEM_PROMPT =
    "You are Lunex Chat. When providing code, always wrap it in fenced markdown blocks with the appropriate language tag (e.g., ```tsx). Do not include extra commentary inside the fences. Do not put markdown inside the fences, its rendering is already handled by the markdown renderer." as const;

// Helper function to update chat messages in backend
const updateChatInBackend = async (chatId: string, messages: Array<{ role: "user" | "assistant"; content: string }>, authToken: string): Promise<boolean> => {
    try {
        const convexSiteUrl = env.NEXT_PUBLIC_CONVEX_URL.replace(".convex.cloud", ".convex.site");

        const updateResponse = await fetch(`${convexSiteUrl}/update-chat-messages`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify({
                chatId,
                messages,
            }),
        });

        if (!updateResponse.ok) {
            const errorData = (await updateResponse.json()) as { error?: string };
            console.error("Failed to update chat in database:", errorData);
            return false;
        }
        return true;
    } catch (error) {
        console.error("Error updating chat in backend:", error);
        return false;
    }
};

// Chat streaming endpoint with OpenRouter
app.post("/chat/stream", async (c) => {
    const body: { messages?: Array<{ role: string; content: string }>; chatId?: string; modelId?: string; authToken?: string } = await c.req.json();
    const { messages, chatId, modelId, authToken } = body;

    return stream(c, async (stream) => {
        try {
            if (!messages || !Array.isArray(messages)) {
                await stream.write(
                    JSON.stringify({
                        type: "error",
                        error: "Messages array is required",
                    }) + "\n"
                );
                return;
            }

            if (!chatId) {
                await stream.write(
                    JSON.stringify({
                        type: "error",
                        error: "Chat ID is required",
                    }) + "\n"
                );
                return;
            }

            if (!authToken) {
                await stream.write(
                    JSON.stringify({
                        type: "error",
                        error: "Authentication token is required",
                    }) + "\n"
                );
                return;
            }

            // Prepend system prompt to enforce code block formatting
            const coreMessages: CoreMessage[] = [
                { role: "system", content: SYSTEM_PROMPT },
                ...messages.map((msg) => ({
                    role: msg.role as "user" | "assistant" | "system",
                    content: msg.content,
                })),
            ];

            // check if modelId is a valid model id
            if (!modelId || !Object.keys(MODELS).includes(modelId)) {
                throw new Error("Invalid model id");
            }

            // Check if model supports reasoning
            const modelConfig = MODELS[modelId as keyof typeof MODELS];
            const supportsReasoning = Boolean((modelConfig?.features as ModelFeatures)?.reasoning);

            const result = await streamText({
                model: openrouter(modelId, supportsReasoning ? { includeReasoning: true } : {}),
                messages: coreMessages,
            });

            // Send initial response
            await stream.write(JSON.stringify({ type: "start", chatId, supportsReasoning }) + "\n");

            let fullResponse = "";
            let lastUpdateLength = 0;
            let lastUpdateTime = Date.now();
            let isUpdating = false;

            // Prepare base messages for incremental updates
            const baseMessages = messages.map((msg) => ({ role: msg.role as "user" | "assistant", content: msg.content }));

            // Stream the response using AI SDK's built-in reasoning support
            for await (const part of result.fullStream) {
                switch (part.type) {
                    case "text-delta":
                        fullResponse += part.textDelta;
                        await stream.write(
                            JSON.stringify({
                                type: "delta",
                                content: part.textDelta,
                            }) + "\n"
                        );

                        // Check if we should update the backend incrementally
                        const now = Date.now();
                        const shouldUpdateByLength = fullResponse.length - lastUpdateLength >= CHUNK_UPDATE_THRESHOLD;
                        const shouldUpdateByTime = now - lastUpdateTime >= UPDATE_INTERVAL_MS;

                        if ((shouldUpdateByLength || shouldUpdateByTime) && !isUpdating && fullResponse.trim()) {
                            isUpdating = true;
                            lastUpdateLength = fullResponse.length;
                            lastUpdateTime = now;

                            // Update backend asynchronously without blocking the stream
                            const updatedMessages = [...baseMessages, { role: "assistant" as const, content: fullResponse }];

                            // Fire and forget - don't await to avoid blocking the stream
                            void updateChatInBackend(chatId, updatedMessages, authToken).finally(() => {
                                isUpdating = false;
                            });
                        }
                        break;
                    case "reasoning":
                        if (supportsReasoning) {
                            await stream.write(
                                JSON.stringify({
                                    type: "reasoning",
                                    content: part.textDelta,
                                }) + "\n"
                            );
                        }
                        break;
                    case "finish":
                        // Final update to ensure we have the complete response
                        if (fullResponse.trim()) {
                            const finalMessages = [...baseMessages, { role: "assistant" as const, content: fullResponse }];

                            // Final update - this one we can await since streaming is done
                            await updateChatInBackend(chatId, finalMessages, authToken);
                        }
                        break;
                }
            }

            // Send completion
            await stream.write(
                JSON.stringify({
                    type: "complete",
                    usage: await result.usage,
                }) + "\n"
            );
        } catch (error) {
            await stream.write(
                JSON.stringify({
                    type: "error",
                    error: error instanceof Error ? error.message : "Unknown error",
                }) + "\n"
            );
        }
    });
});

export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const DELETE = handle(app);
export const OPTIONS = handle(app);
