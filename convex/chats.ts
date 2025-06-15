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
            visibility: "private",
            branched: false,
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

// Internal mutation to update chat title (called from actions)
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

// Internal mutation to update messages (called from HTTP actions)
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

// Update chat visibility
export const updateChatVisibility = mutation({
    args: {
        chatId: v.id("chats"),
        visibility: v.union(v.literal("public"), v.literal("private")),
    },
    handler: async (ctx, { chatId, visibility }) => {
        const currentUser = await getUserOrThrow(ctx);
        const chat = await ctx.table("chats").get(chatId);
        if (!chat) {
            throw new ConvexError("Chat not found");
        }
        if (chat.userId !== currentUser._id) {
            throw new ConvexError("Forbidden");
        }

        await ctx.table("chats").getX(chatId).patch({
            visibility,
        });

        return { success: true };
    },
});

// Edit a user message and truncate conversation from that point
export const editMessage = mutation({
    args: {
        chatId: v.id("chats"),
        messageIndex: v.number(),
        newContent: v.string(),
    },
    handler: async (ctx, { chatId, messageIndex, newContent }) => {
        const currentUser = await getUserOrThrow(ctx);
        const chat = await ctx.table("chats").get(chatId);
        if (!chat) {
            throw new ConvexError("Chat not found");
        }
        if (chat.userId !== currentUser._id) {
            throw new ConvexError("Forbidden");
        }

        // Validate message index
        if (messageIndex < 0 || messageIndex >= chat.messages.length) {
            throw new ConvexError("Invalid message index");
        }

        // Ensure we're only editing user messages
        const targetMessage = chat.messages[messageIndex];
        if (targetMessage.role !== "user") {
            throw new ConvexError("Can only edit user messages");
        }

        // Validate content
        if (!newContent?.trim()) {
            throw new ConvexError("Message content cannot be empty");
        }

        // Truncate messages up to and including the edited message, then update the content
        const truncatedMessages = chat.messages.slice(0, messageIndex);
        const editedMessage = { ...targetMessage, content: newContent.trim() };
        const updatedMessages = [...truncatedMessages, editedMessage];

        await ctx.table("chats").getX(chatId).patch({
            messages: updatedMessages,
        });

        return { success: true };
    },
});

// Branch a chat from a specific assistant message
export const branchChat = mutation({
    args: {
        chatId: v.id("chats"),
        messageIndex: v.number(), // Index of the assistant message to branch from
        title: v.optional(v.string()),
    },
    handler: async (ctx, { chatId, messageIndex, title }) => {
        const currentUser = await getUserOrThrow(ctx);
        const originalChat = await ctx.table("chats").get(chatId);
        if (!originalChat) {
            throw new ConvexError("Chat not found");
        }
        if (originalChat.userId !== currentUser._id) {
            throw new ConvexError("Forbidden");
        }

        // Validate message index
        if (messageIndex < 0 || messageIndex >= originalChat.messages.length) {
            throw new ConvexError("Invalid message index");
        }

        // Ensure we're branching from an assistant message
        const targetMessage = originalChat.messages[messageIndex];
        if (targetMessage.role !== "assistant") {
            throw new ConvexError("Can only branch from assistant messages");
        }

        // Include messages up to and including the target assistant message
        const branchMessages = originalChat.messages.slice(0, messageIndex + 1);

        // Create a new chat as a branch
        const branchedChatId = await ctx.table("chats").insert({
            userId: currentUser._id,
            title: title ?? `${originalChat.title} (Branch)`,
            messages: branchMessages,
            visibility: "private", // Branches are always private by default
            branched: true,
        });

        return branchedChatId;
    },
});

// Get public chats (for discovery)
export const getPublicChats = query({
    args: {
        limit: v.optional(v.number()),
    },
    handler: async (ctx, { limit = 20 }) => {
        const publicChats = await ctx
            .table("chats")
            .filter((q) => q.eq(q.field("visibility"), "public"))
            .order("desc")
            .take(limit);

        // Include user information for public chats
        const chatsWithUsers = await Promise.all(
            publicChats.map(async (chat) => {
                const user = await ctx.table("users").get(chat.userId);
                return {
                    ...chat,
                    user: user
                        ? {
                              name: user.name,
                              username: user.username,
                              imageUrl: user.imageUrl,
                          }
                        : null,
                };
            })
        );

        return chatsWithUsers;
    },
});

// Get available branch points (assistant messages) in a chat
export const getChatBranchPoints = query({
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

        // Find all assistant messages that can be used as branch points
        const branchPoints = chat.messages
            .map((message, index) => ({
                index,
                message,
            }))
            .filter(({ message }) => message.role === "assistant")
            .map(({ index, message }) => ({
                messageIndex: index,
                content: message.content.slice(0, 100) + (message.content.length > 100 ? "..." : ""), // Preview
                timestamp: index, // Use index as a simple timestamp
            }));

        return branchPoints;
    },
});

// Get all branches created by the current user
export const getUserBranches = query({
    args: {},
    handler: async (ctx) => {
        const currentUser = await getUserOrThrow(ctx);

        // Find all branched chats by this user
        const branches = await ctx
            .table("chats")
            .filter((q) => q.eq(q.field("userId"), currentUser._id))
            .filter((q) => q.eq(q.field("branched"), true))
            .order("desc")
            .take(50);

        return branches.map((branch) => ({
            _id: branch._id,
            title: branch.title,
            messageCount: branch.messages.length,
            _creationTime: branch._creationTime,
        }));
    },
});
