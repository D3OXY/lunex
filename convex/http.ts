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

// HTTP action to update chat messages with authentication
http.route({
    path: "/update-chat-messages",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        try {
            // Get the authorization header
            const authHeader = request.headers.get("Authorization");
            if (!authHeader?.startsWith("Bearer ")) {
                return new Response(JSON.stringify({ error: "Missing or invalid authorization header" }), {
                    status: 401,
                    headers: { "Content-Type": "application/json" },
                });
            }

            // Verify the user identity using the JWT token
            const identity = await ctx.auth.getUserIdentity();
            if (!identity) {
                return new Response(JSON.stringify({ error: "Unauthorized" }), {
                    status: 401,
                    headers: { "Content-Type": "application/json" },
                });
            }

            // Parse the request body
            const { chatId, messages } = (await request.json()) as { chatId: Id<"chats">; messages: CoreMessage[] };

            if (!chatId || !messages) {
                return new Response(JSON.stringify({ error: "Missing chatId or messages" }), {
                    status: 400,
                    headers: { "Content-Type": "application/json" },
                });
            }

            // Verify that the user owns the chat by running a query
            const chat = await ctx.runQuery(internal.chats.getChatForUser, {
                chatId,
                userId: identity.subject,
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

export default http;
