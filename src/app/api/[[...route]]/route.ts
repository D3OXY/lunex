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
//     "You are Lunex AI. When providing code, always wrap it in fenced markdown blocks with the appropriate language tag (e.g., ```tsx). Do not include extra commentary inside the fences." as const;
const SYSTEM_PROMPT =
    "You are Lunex AI. When providing code, always wrap it in fenced markdown blocks with the appropriate language tag (e.g., ```tsx). Do not include extra commentary inside the fences. Do not put markdown inside the fences, its rendering is already handled by the markdown renderer." as const;

// Chat streaming endpoint with OpenRouter
app.post("/chat/stream", async (c) => {
    const body: { messages?: Array<{ role: string; content: string }>; chatId?: string; modelId?: string } = await c.req.json();
    const { messages, chatId, modelId } = body;

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

            // Stream the response using AI SDK's built-in reasoning support
            for await (const part of result.fullStream) {
                switch (part.type) {
                    case "text-delta":
                        await stream.write(
                            JSON.stringify({
                                type: "delta",
                                content: part.textDelta,
                            }) + "\n"
                        );
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
                        // Stream is complete
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
