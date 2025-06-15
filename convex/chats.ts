import { v } from "convex/values";
import { mutation, query, action, internalMutation, internalQuery } from "./functions";
import { ConvexError } from "convex/values";
import { getUserOrThrow } from "./user";
import { api, internal } from "./_generated/api";

// Get all chats for a user
export const getUserChats = query({
    args: {},
    handler: async (ctx) => {
        const currentUser = await getUserOrThrow(ctx);
        const chats = await ctx
            .table("chats")
            .filter((q) => q.eq(q.field("userId"), currentUser._id))
            .order("desc")
            .take(50); // Limit to 50 most recent chats

        return chats;
    },
});

// Get a specific chat with messages
export const getChat = query({
    args: { chatId: v.id("chats") },
    handler: async (ctx, { chatId }) => {
        const currentUser = await getUserOrThrow(ctx);
        const chat = await ctx.table("chats").get(chatId);
        if (!chat) {
            throw new ConvexError("Chat not found");
        }
        if (chat.userId !== currentUser._id) {
            throw new ConvexError("Forbidden");
        }
        return chat;
    },
});

// Create a new chat with optional background title generation
export const createChat = mutation({
    args: {
        title: v.string(),
        userMessage: v.optional(v.string()), // For title generation
    },
    handler: async (ctx, { title, userMessage }) => {
        const currentUser = await getUserOrThrow(ctx);

        const chatId = await ctx.table("chats").insert({
            userId: currentUser._id,
            title,
            messages: [],
        });

        // If userMessage is provided, schedule background title generation
        if (userMessage?.trim()) {
            void ctx.scheduler.runAfter(0, api.chats.generateAndUpdateTitle, {
                chatId,
                userMessage: userMessage.trim(),
            });
        }

        return chatId;
    },
});

// Background action to generate and update chat title
export const generateAndUpdateTitle = action({
    args: {
        chatId: v.id("chats"),
        userMessage: v.string(),
    },
    handler: async (ctx, { chatId, userMessage }) => {
        try {
            // Use a small, fast model for title generation
            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model: "google/gemini-2.0-flash-001",
                    messages: [
                        {
                            role: "system",
                            content:
                                "Generate a concise, descriptive title (max 6 words) for this conversation based on the user's first message. Return only the title, no quotes or extra text.",
                        },
                        {
                            role: "user",
                            content: userMessage,
                        },
                    ],
                    max_tokens: 20,
                    temperature: 0.7,
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
            const generatedTitle = data.choices?.[0]?.message?.content?.trim();

            if (generatedTitle && generatedTitle !== "New Chat") {
                // Update the chat title
                await ctx.runMutation(internal.chats.internalUpdateChatTitle, {
                    chatId,
                    title: generatedTitle,
                });
            }
        } catch (error) {
            console.error("Title generation failed:", error);
            // Silently fail - keep the default title
        }
    },
});

// Action to update chat messages (called from backend)
export const updateChatMessages = action({
    args: {
        chatId: v.id("chats"),
        messages: v.array(
            v.object({
                role: v.union(v.literal("user"), v.literal("assistant")),
                content: v.string(),
            })
        ),
    },
    handler: async (ctx, { chatId, messages }) => {
        try {
            await ctx.runMutation(internal.chats.internalUpdateMessages, {
                chatId,
                messages,
            });
            return { success: true };
        } catch (error) {
            console.error("Failed to update chat messages:", error);
            throw error;
        }
    },
});

// Add a message to a chat
// TODO: Remove this
export const addMessage = mutation({
    args: {
        chatId: v.id("chats"),
        role: v.union(v.literal("user"), v.literal("assistant")),
        content: v.string(),
    },
    handler: async (ctx, { chatId, role, content }) => {
        const currentUser = await getUserOrThrow(ctx);
        const chat = await ctx.table("chats").get(chatId);
        if (!chat) {
            throw new ConvexError("Chat not found");
        }
        if (chat.userId !== currentUser._id) {
            throw new ConvexError("Forbidden");
        }
        if (!chat) {
            throw new ConvexError("Chat not found");
        }

        const newMessage = { role, content };
        const updatedMessages = [...chat.messages, newMessage];

        await ctx.table("chats").getX(chatId).patch({
            messages: updatedMessages,
        });

        return newMessage;
    },
});

// Update chat title
export const updateChatTitle = mutation({
    args: {
        chatId: v.id("chats"),
        title: v.string(),
    },
    handler: async (ctx, { chatId, title }) => {
        const currentUser = await getUserOrThrow(ctx);
        const chat = await ctx.table("chats").get(chatId);
        if (!chat) {
            throw new ConvexError("Chat not found");
        }
        if (chat.userId !== currentUser._id) {
            throw new ConvexError("Forbidden");
        }

        await ctx.table("chats").getX(chatId).patch({
            title,
        });

        return { success: true };
    },
});

export const internalUpdateChatTitle = internalMutation({
    args: {
        chatId: v.id("chats"),
        title: v.string(),
    },
    handler: async (ctx, { chatId, title }) => {
        const chat = await ctx.table("chats").get(chatId);
        if (!chat) {
            throw new ConvexError("Chat not found");
        }

        await ctx.table("chats").getX(chatId).patch({
            title,
        });

        return { success: true };
    },
});

// Delete a chat
export const deleteChat = mutation({
    args: { chatId: v.id("chats") },
    handler: async (ctx, { chatId }) => {
        const currentUser = await getUserOrThrow(ctx);
        const chat = await ctx.table("chats").get(chatId);
        if (!chat) {
            throw new ConvexError("Chat not found");
        }

        if (chat.userId !== currentUser._id) {
            throw new ConvexError("Forbidden");
        }

        await ctx.table("chats").getX(chatId).delete();
        return { success: true };
    },
});

// Internal query to get chat for a specific user (for authentication)
export const getChatForUser = internalQuery({
    args: {
        chatId: v.id("chats"),
        userId: v.string(), // Clerk user ID
    },
    handler: async (ctx, { chatId, userId }) => {
        const chat = await ctx.table("chats").get(chatId);
        if (!chat) {
            return null;
        }

        // Get the Convex user by Clerk ID
        const user = await ctx
            .table("users")
            .filter((q) => q.eq(q.field("clerkId"), userId))
            .first();

        if (!user || chat.userId !== user._id) {
            return null;
        }

        return chat;
    },
});

// Internal mutation to update messages (called from backend)
export const internalUpdateMessages = internalMutation({
    args: {
        chatId: v.id("chats"),
        messages: v.array(
            v.object({
                role: v.union(v.literal("user"), v.literal("assistant")),
                content: v.string(),
            })
        ),
    },
    handler: async (ctx, { chatId, messages }) => {
        const chat = await ctx.table("chats").get(chatId);
        if (!chat) {
            throw new ConvexError("Chat not found");
        }

        await ctx.table("chats").getX(chatId).patch({
            messages,
        });

        return { success: true };
    },
});

// Update messages in a chat (for streaming updates) - DEPRECATED
// This will be removed once backend handles all updates
export const updateMessages = mutation({
    args: {
        chatId: v.id("chats"),
        messages: v.array(
            v.object({
                role: v.union(v.literal("user"), v.literal("assistant")),
                content: v.string(),
            })
        ),
    },
    handler: async (ctx, { chatId, messages }) => {
        const currentUser = await getUserOrThrow(ctx);
        const chat = await ctx.table("chats").get(chatId);
        if (!chat) {
            throw new ConvexError("Chat not found");
        }
        if (chat.userId !== currentUser._id) {
            throw new ConvexError("Forbidden");
        }

        await ctx.table("chats").getX(chatId).patch({
            messages,
        });

        return { success: true };
    },
});
