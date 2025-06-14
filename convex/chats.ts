import { v } from "convex/values";
import { mutation, query } from "./functions";
import { ConvexError } from "convex/values";
import { getUserOrThrow } from "./user";

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

// Create a new chat
export const createChat = mutation({
    args: {
        title: v.string(),
    },
    handler: async (ctx, { title }) => {
        const currentUser = await getUserOrThrow(ctx);

        const chatId = await ctx.table("chats").insert({
            userId: currentUser._id,
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
