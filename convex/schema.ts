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
        messages: v.array(
            v.object({
                role: v.union(v.literal("user"), v.literal("assistant")),
                content: v.string(),
            })
        ),
    }),
});

export default schema;

export const entDefinitions = getEntDefinitions(schema);
