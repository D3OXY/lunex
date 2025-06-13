import { Hono } from "hono";
import { handle } from "hono/vercel";
import { stream } from "hono/streaming";
import { cors } from "hono/cors";
import { streamText, type CoreMessage } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

const app = new Hono().basePath("/api");

// Configure OpenRouter client with environment variable
const openrouter = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY ?? "",
});

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

// Chat streaming endpoint with OpenRouter
app.post("/chat/stream", async (c) => {
    try {
        const body: { messages?: Array<{ role: string; content: string }>; chatId?: string } = await c.req.json();
        const { messages, chatId } = body;

        if (!messages || !Array.isArray(messages)) {
            return c.json({ error: "Messages array is required" }, 400);
        }

        // Transform messages to CoreMessage format
        const coreMessages: CoreMessage[] = messages.map((msg) => ({
            role: msg.role as "user" | "assistant" | "system",
            content: msg.content,
        }));

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

        // Transform messages to CoreMessage format
        const coreMessages: CoreMessage[] = messages.map((msg) => ({
            role: msg.role as "user" | "assistant" | "system",
            content: msg.content,
        }));

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

            // Transform messages to CoreMessage format
            const coreMessages: CoreMessage[] = messages.map((msg) => ({
                role: msg.role as "user" | "assistant" | "system",
                content: msg.content,
            }));

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

export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const DELETE = handle(app);
export const OPTIONS = handle(app);
