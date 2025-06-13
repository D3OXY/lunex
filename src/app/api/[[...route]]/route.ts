/* eslint-disable @typescript-eslint/await-thenable */
import { Hono } from "hono";
import { handle } from "hono/vercel";
import { stream } from "hono/streaming";
import { cors } from "hono/cors";
import { streamText, type CoreMessage } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { ConvexHttpClient } from "convex/browser";
import { api as convexApi } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

const app = new Hono().basePath("/api");

// Configure OpenRouter client with environment variable
const openrouter = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY ?? "",
});

// Initialize Convex HTTP client for server-side use
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL ?? "");

// Helper to ensure Convex URL is configured
const requireConvex = () => {
    if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
        throw new Error("NEXT_PUBLIC_CONVEX_URL environment variable is not set");
    }
};

// Enable CORS for all routes
app.use(
    "*",
    cors({
        origin: ["http://localhost:3000"],
        allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowHeaders: ["Content-Type", "Authorization"],
    })
);

// Health check endpoint
app.get("/health", (c) => {
    return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Simple chat endpoint for testing
app.post("/chat/test", async (c) => {
    try {
        const body: { message?: string } = await c.req.json();

        if (!body || typeof body !== "object" || !("message" in body) || typeof body.message !== "string") {
            return c.json({ error: "Message is required" }, 400);
        }

        const message = body.message;

        // Mock response for now
        return c.json({
            response: `You said: ${message}. This is a test response.`,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error("Chat test error:", error);
        return c.json({ error: "Internal server error" }, 500);
    }
});

// System prompt to ensure responses include properly fenced code blocks with language identifiers.
const SYSTEM_PROMPT =
    "You are Lunex AI. When providing code, always wrap it in fenced markdown blocks with the appropriate language tag (e.g., ```tsx). Do not include extra commentary inside the fences." as const;

// Chat streaming endpoint with OpenRouter
app.post("/chat/stream", async (c) => {
    try {
        const body: { messages?: Array<{ role: string; content: string }>; chatId?: string } = await c.req.json();
        const { messages, chatId } = body;

        if (!messages || !Array.isArray(messages)) {
            return c.json({ error: "Messages array is required" }, 400);
        }

        // Prepend system prompt to guide response formatting
        const coreMessages: CoreMessage[] = [
            { role: "system", content: SYSTEM_PROMPT },
            ...messages.map((msg) => ({
                role: msg.role as "user" | "assistant" | "system",
                content: msg.content,
            })),
        ];

        const result = await streamText({
            model: openrouter("google/gemini-2.0-flash-001"),
            messages: coreMessages,
            onFinish({ text, usage }) {
                console.log("Stream finished:", { text, usage, chatId });
            },
        });

        return result.toDataStreamResponse();
    } catch (error) {
        console.error("Chat streaming error:", error);
        return c.json({ error: "Internal server error" }, 500);
    }
});

// Chat completion endpoint (non-streaming)
app.post("/chat/completion", async (c) => {
    try {
        const body: { messages?: Array<{ role: string; content: string }>; chatId?: string } = await c.req.json();
        const { messages } = body;

        if (!messages || !Array.isArray(messages)) {
            return c.json({ error: "Messages array is required" }, 400);
        }

        // Prepend system prompt
        const coreMessages: CoreMessage[] = [
            { role: "system", content: SYSTEM_PROMPT },
            ...messages.map((msg) => ({
                role: msg.role as "user" | "assistant" | "system",
                content: msg.content,
            })),
        ];

        const result = await streamText({
            model: openrouter("google/gemini-2.0-flash-001"),
            messages: coreMessages,
        });

        const completion = await result.text;

        return c.json({
            message: completion,
            usage: result.usage,
        });
    } catch (error) {
        console.error("Chat completion error:", error);
        return c.json({ error: "Internal server error" }, 500);
    }
});

// Custom streaming endpoint for more control
app.post("/chat/custom-stream", async (c) => {
    const body: { messages?: Array<{ role: string; content: string }>; chatId?: string } = await c.req.json();
    const { messages, chatId } = body;

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

            const result = await streamText({
                model: openrouter("google/gemini-2.0-flash-001"),
                messages: coreMessages,
            });

            // Send initial response
            await stream.write(JSON.stringify({ type: "start", chatId }) + "\n");

            // Stream the response
            for await (const delta of result.textStream) {
                await stream.write(
                    JSON.stringify({
                        type: "delta",
                        content: delta,
                    }) + "\n"
                );
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

// Create chat
app.post("/chat", async (c) => {
    try {
        requireConvex();
        const body: { userId?: string; title?: string } = await c.req.json();
        if (!body.userId || !body.title) {
            return c.json({ error: "userId and title required" }, 400);
        }

        const chatId = await (convex.mutation(convexApi.chats.createChat, {
            userId: body.userId as Id<"users">,
            title: body.title,
        }) as Promise<Id<"chats">>);

        return c.json({ chatId });
    } catch (error) {
        console.error("Create chat error", error);
        return c.json({ error: (error as Error).message ?? "Internal error" }, 500);
    }
});

// Get chat by id
app.get("/chat/:id", async (c) => {
    try {
        requireConvex();
        const id = c.req.param("id");
        const chat = await (convex.query(convexApi.chats.getChat, { chatId: id as Id<"chats"> }) as Promise<Record<string, unknown> | null>);
        if (!chat) return c.json({ error: "Chat not found" }, 404);
        return c.json(chat);
    } catch (error) {
        console.error("Get chat error", error);
        return c.json({ error: (error as Error).message ?? "Internal error" }, 500);
    }
});

// Add message to chat
app.post("/chat/:id/message", async (c) => {
    try {
        requireConvex();
        const id = c.req.param("id");
        const body: { role?: "user" | "assistant"; content?: string } = await c.req.json();
        if (!body.role || !body.content) {
            return c.json({ error: "role and content required" }, 400);
        }

        await (convex.mutation(convexApi.chats.addMessage, {
            chatId: id as Id<"chats">,
            role: body.role,
            content: body.content,
        }) as Promise<unknown>);

        return c.json({ success: true });
    } catch (error) {
        console.error("Add message error", error);
        return c.json({ error: (error as Error).message ?? "Internal error" }, 500);
    }
});

export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const DELETE = handle(app);
export const OPTIONS = handle(app);
