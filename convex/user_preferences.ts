import { v } from "convex/values";
import { mutation, query, internalMutation } from "./functions";
import { ConvexError } from "convex/values";
import { getUserOrThrow } from "./user";
import { DEFAULT_MODEL } from "../src/lib/models";

// Get user preferences
export const getUserPreferences = query({
    args: {},
    handler: async (ctx) => {
        const currentUser = await getUserOrThrow(ctx);

        const preferences = await ctx
            .table("userPreferences")
            .filter((q) => q.eq(q.field("userId"), currentUser._id))
            .first();

        // Return default preferences if none exist
        if (!preferences) {
            return {
                userId: currentUser._id,
                defaultModel: DEFAULT_MODEL,
                userModels: [],
                openRouterApiKey: undefined,
            };
        }

        return preferences;
    },
});

// Create or update user preferences
export const upsertUserPreferences = mutation({
    args: {
        defaultModel: v.optional(v.string()),
        openRouterApiKey: v.optional(v.string()),
        userModels: v.optional(v.array(v.string())),
    },
    handler: async (ctx, args) => {
        const currentUser = await getUserOrThrow(ctx);

        const existingPreferences = await ctx
            .table("userPreferences")
            .filter((q) => q.eq(q.field("userId"), currentUser._id))
            .first();

        if (existingPreferences) {
            // Update existing preferences
            const updates: Record<string, unknown> = {};
            if (args.defaultModel !== undefined) updates.defaultModel = args.defaultModel;
            if (args.openRouterApiKey !== undefined) updates.openRouterApiKey = args.openRouterApiKey;
            if (args.userModels !== undefined) updates.userModels = args.userModels;

            await ctx.table("userPreferences").getX(existingPreferences._id).patch(updates);
            return existingPreferences._id;
        } else {
            // Create new preferences
            const preferencesId = await ctx.table("userPreferences").insert({
                userId: currentUser._id,
                defaultModel: args.defaultModel ?? DEFAULT_MODEL,
                userModels: args.userModels ?? [],
                openRouterApiKey: args.openRouterApiKey,
            });
            return preferencesId;
        }
    },
});

// Internal mutation to create default user preferences (called from user webhook)
export const createDefaultPreferences = internalMutation({
    args: {
        userId: v.id("users"),
    },
    handler: async (ctx, { userId }) => {
        // Check if preferences already exist
        const existingPrefs = await ctx
            .table("userPreferences")
            .filter((q) => q.eq(q.field("userId"), userId))
            .first();

        if (!existingPrefs) {
            await ctx.table("userPreferences").insert({
                userId,
                defaultModel: DEFAULT_MODEL,
                userModels: [],
            });
        }
    },
});

// Update default model
export const updateDefaultModel = mutation({
    args: {
        defaultModel: v.string(),
    },
    handler: async (ctx, { defaultModel }) => {
        const currentUser = await getUserOrThrow(ctx);

        const preferences = await ctx
            .table("userPreferences")
            .filter((q) => q.eq(q.field("userId"), currentUser._id))
            .first();

        if (!preferences) {
            throw new ConvexError("User preferences not found");
        }

        await ctx.table("userPreferences").getX(preferences._id).patch({
            defaultModel,
        });

        return { success: true };
    },
});

// Update OpenRouter API key
export const updateOpenRouterApiKey = mutation({
    args: {
        openRouterApiKey: v.optional(v.string()),
    },
    handler: async (ctx, { openRouterApiKey }) => {
        const currentUser = await getUserOrThrow(ctx);

        const preferences = await ctx
            .table("userPreferences")
            .filter((q) => q.eq(q.field("userId"), currentUser._id))
            .first();

        if (!preferences) {
            throw new ConvexError("User preferences not found");
        }

        await ctx.table("userPreferences").getX(preferences._id).patch({
            openRouterApiKey,
        });

        return { success: true };
    },
});

// Update user models
export const updateUserModels = mutation({
    args: {
        userModels: v.array(v.string()),
    },
    handler: async (ctx, { userModels }) => {
        const currentUser = await getUserOrThrow(ctx);

        const preferences = await ctx
            .table("userPreferences")
            .filter((q) => q.eq(q.field("userId"), currentUser._id))
            .first();

        if (!preferences) {
            throw new ConvexError("User preferences not found");
        }

        await ctx.table("userPreferences").getX(preferences._id).patch({
            userModels,
        });

        return { success: true };
    },
});
