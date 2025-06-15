import { defineEntSchema, defineEnt, getEntDefinitions } from "convex-ents";
import { v } from "convex/values";

const schema = defineEntSchema({
    // Users
    users: defineEnt({
        email: v.string(),
        name: v.string(),
        imageUrl: v.optional(v.string()),
    })
        .field("clerkId", v.string(), { unique: true })
        .field("username", v.string(), { unique: true })
        .index("by_email", ["email"]),
    // AI
    chats: defineEnt({
        userId: v.id("users"),
        title: v.string(),
        visibility: v.union(v.literal("public"), v.literal("private")),
        branched: v.boolean(),
        messages: v.array(
            v.object({
                role: v.union(v.literal("user"), v.literal("assistant")),
                content: v.string(),
            })
        ),
    }).index("by_user", ["userId"]),
    userPreferences: defineEnt({
        userId: v.id("users"),
        defaultModel: v.string(),
        openRouterApiKey: v.optional(v.string()),
        userModels: v.array(v.string()),
    }).index("by_user", ["userId"]),
});

export default schema;

export const entDefinitions = getEntDefinitions(schema);
