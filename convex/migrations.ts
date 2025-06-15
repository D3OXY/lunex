import { internalMutation } from "./_generated/server";
import { DEFAULT_MODEL } from "../src/lib/models";

// Migration to backfill existing chats with new fields
export const backfillChatFields = internalMutation({
    args: {},
    handler: async (ctx) => {
        const chats = await ctx.db.query("chats").collect();
        let updated = 0;

        for (const chat of chats) {
            // Only update if the fields don't exist
            if (chat.visibility === undefined || chat.branched === undefined) {
                await ctx.db.patch(chat._id, {
                    visibility: "private" as const, // Default to private for existing chats
                    branched: false, // Default to not branched
                });
                updated++;
            }
        }

        return { updated };
    },
});

// Migration to create default user preferences for existing users
export const createDefaultUserPreferences = internalMutation({
    args: {},
    handler: async (ctx) => {
        const users = await ctx.db.query("users").collect();
        let created = 0;

        for (const user of users) {
            // Check if user preferences already exist
            const existingPrefs = await ctx.db
                .query("userPreferences")
                .filter((q) => q.eq(q.field("userId"), user._id))
                .first();

            if (!existingPrefs) {
                await ctx.db.insert("userPreferences", {
                    userId: user._id,
                    defaultModel: DEFAULT_MODEL, // Default model
                    userModels: [], // Default available models
                });
                created++;
            }
        }

        return { created };
    },
});

// Combined migration to run both backfills
export const runMigrations = internalMutation({
    args: {},
    handler: async (ctx) => {
        // Run chat backfill
        const chats = await ctx.db.query("chats").collect();
        let chatsUpdated = 0;

        for (const chat of chats) {
            // Only update if the fields don't exist
            if (chat.visibility === undefined || chat.branched === undefined) {
                await ctx.db.patch(chat._id, {
                    visibility: "private" as const,
                    branched: false,
                });
                chatsUpdated++;
            }
        }

        // Run user preferences creation
        const users = await ctx.db.query("users").collect();
        let userPreferencesCreated = 0;

        for (const user of users) {
            // Check if user preferences already exist
            const existingPrefs = await ctx.db
                .query("userPreferences")
                .filter((q) => q.eq(q.field("userId"), user._id))
                .first();

            if (!existingPrefs) {
                await ctx.db.insert("userPreferences", {
                    userId: user._id,
                    defaultModel: DEFAULT_MODEL,
                    userModels: [],
                });
                userPreferencesCreated++;
            }
        }

        return {
            chatsUpdated,
            userPreferencesCreated,
        };
    },
});
