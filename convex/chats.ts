import { v } from "convex/values";
import { mutation, query } from "./functions";
import { ConvexError } from "convex/values";

// Get all chats for a user
export const getUserChats = query({
    args: { userId: v.id("users") },
    handler: async (ctx, { userId }) => {
        const chats = await ctx
            .table("chats")
            .filter((q) => q.eq(q.field("userId"), userId))
            .order("desc")
            .take(50); // Limit to 50 most recent chats

        return chats;
    },
});

// Get a specific chat with messages
export const getChat = query({
    args: { chatId: v.id("chats") },
    handler: async (ctx, { chatId }) => {
        const chat = await ctx.table("chats").get(chatId);
        return chat;
    },
});

// Create a new chat
export const createChat = mutation({
    args: {
        userId: v.id("users"),
        title: v.string(),
    },
    handler: async (ctx, { userId, title }) => {
        const chatId = await ctx.table("chats").insert({
            userId,
            title,
            messages: [],
        });

        return chatId;
    },
});

// Add a message to a chat
export const addMessage = mutation({
    args: {
        chatId: v.id("chats"),
        role: v.union(v.literal("user"), v.literal("assistant")),
        content: v.string(),
    },
    handler: async (ctx, { chatId, role, content }) => {
        const chat = await ctx.table("chats").get(chatId);
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
        const chat = await ctx.table("chats").get(chatId);
        if (!chat) {
            throw new ConvexError("Chat not found");
        }

        await ctx.table("chats").getX(chatId).delete();
        return { success: true };
    },
});

// Update messages in a chat (for streaming updates)
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
