import { clerkUserWebhookHandler } from "./clerk_user_webhook";
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { CoreMessage } from "ai";
import type { Id } from "./_generated/dataModel";

const http = httpRouter();

http.route({
    path: "/clerk-users-webhook",
    method: "POST",
    handler: clerkUserWebhookHandler,
});

// HTTP action to update chat messages with authentication and authorization
// This is called from the backend streaming API to persist chat messages
// after the AI response is complete, ensuring proper user ownership verification
http.route({
    path: "/update-chat-messages",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        try {
            // Verify authorization header is present
            const authHeader = request.headers.get("Authorization");
            if (!authHeader?.startsWith("Bearer ")) {
                return new Response(JSON.stringify({ error: "Missing or invalid authorization header" }), {
                    status: 401,
                    headers: { "Content-Type": "application/json" },
                });
            }

            // Verify the user identity using the JWT token from Clerk
            const identity = await ctx.auth.getUserIdentity();
            if (!identity) {
                return new Response(JSON.stringify({ error: "Unauthorized" }), {
                    status: 401,
                    headers: { "Content-Type": "application/json" },
                });
            }

            // Parse and validate request body
            const { chatId, messages } = (await request.json()) as { chatId: Id<"chats">; messages: CoreMessage[] };

            if (!chatId || !messages) {
                return new Response(JSON.stringify({ error: "Missing chatId or messages" }), {
                    status: 400,
                    headers: { "Content-Type": "application/json" },
                });
            }

            // Verify that the authenticated user owns the chat
            const chat = await ctx.runQuery(internal.chats.getChatForUser, {
                chatId,
                userId: identity.subject, // Clerk user ID
            });

            if (!chat) {
                return new Response(JSON.stringify({ error: "Chat not found or access denied" }), {
                    status: 403,
                    headers: { "Content-Type": "application/json" },
                });
            }

            // Update the chat messages using internal mutation
            await ctx.runMutation(internal.chats.internalUpdateMessages, {
                chatId,
                messages: messages as { role: "user" | "assistant"; content: string }[],
            });

            return new Response(JSON.stringify({ success: true }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            });
        } catch (error) {
            console.error("Error updating chat messages:", error);
            return new Response(JSON.stringify({ error: "Internal server error" }), {
                status: 500,
                headers: { "Content-Type": "application/json" },
            });
        }
    }),
});

http.route({
    path: "/get-chat-messages",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        try {
            // Verify authorization header is present
            const authHeader = request.headers.get("Authorization");
            if (!authHeader?.startsWith("Bearer ")) {
                return new Response(JSON.stringify({ error: "Missing or invalid authorization header" }), {
                    status: 401,
                    headers: { "Content-Type": "application/json" },
                });
            }

            // Verify the user identity using the JWT token from Clerk
            const identity = await ctx.auth.getUserIdentity();
            if (!identity) {
                return new Response(JSON.stringify({ error: "Unauthorized" }), {
                    status: 401,
                    headers: { "Content-Type": "application/json" },
                });
            }

            // Parse and validate request body
            const { chatId } = (await request.json()) as { chatId: Id<"chats"> };

            if (!chatId) {
                return new Response(JSON.stringify({ error: "Missing chatId" }), {
                    status: 400,
                    headers: { "Content-Type": "application/json" },
                });
            }

            // Verify that the authenticated user owns the chat
            const chat = await ctx.runQuery(internal.chats.getChatForUser, {
                chatId,
                userId: identity.subject, // Clerk user ID
            });

            if (!chat) {
                return new Response(JSON.stringify({ error: "Chat not found or access denied" }), {
                    status: 403,
                    headers: { "Content-Type": "application/json" },
                });
            }

            return new Response(JSON.stringify({ messages: chat.messages }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            });
        } catch (error) {
            console.error("Error fetching chat messages:", error);
            return new Response(JSON.stringify({ error: "Internal server error" }), {
                status: 500,
                headers: { "Content-Type": "application/json" },
            });
        }
    }),
});

http.route({
    path: "/get-user-preferences",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        try {
            // Verify authorization header is present
            const authHeader = request.headers.get("Authorization");
            if (!authHeader?.startsWith("Bearer ")) {
                return new Response(JSON.stringify({ error: "Missing or invalid authorization header" }), {
                    status: 401,
                    headers: { "Content-Type": "application/json" },
                });
            }

            // Verify the user identity using the JWT token from Clerk
            const identity = await ctx.auth.getUserIdentity();
            if (!identity) {
                return new Response(JSON.stringify({ error: "Unauthorized" }), {
                    status: 401,
                    headers: { "Content-Type": "application/json" },
                });
            }

            // Get user preferences
            const preferences = await ctx.runQuery(internal.user_preferences.getUserPreferencesForUser, {
                userId: identity.subject, // Clerk user ID
            });

            if (!preferences) {
                return new Response(JSON.stringify({ error: "User preferences not found" }), {
                    status: 404,
                    headers: { "Content-Type": "application/json" },
                });
            }

            return new Response(JSON.stringify({ preferences }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            });
        } catch (error) {
            console.error("Error fetching user preferences:", error);
            return new Response(JSON.stringify({ error: "Internal server error" }), {
                status: 500,
                headers: { "Content-Type": "application/json" },
            });
        }
    }),
});

export default http;
