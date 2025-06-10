import type { UserJSON } from "@clerk/backend";
import type { Doc } from "./_generated/dataModel";
import { internalMutation, query } from "./functions";
import { ConvexError, v, type Validator } from "convex/values";
import type { MutationCtx, QueryCtx } from "./types";

type UserInsert = Omit<Doc<"users">, "_id" | "_creationTime">;

export const current = query({
  args: {
    throwIfNotFound: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    if (args.throwIfNotFound) {
      return await getCurrentUserOrThrow(ctx);
    }
    return await getCurrentUser(ctx);
  },
});

export const upsertFromClerk = internalMutation({
  args: { data: v.any() as Validator<UserJSON> }, // no runtime validation, trust Clerk
  async handler(ctx, { data }) {
    console.log("upsertFromClerk");
    const primaryEmail = data.email_addresses.find(
      (email) => email.id === data.primary_email_address_id,
    );
    if (!primaryEmail) {
      throw new Error("Primary email not found");
    }

    const name = `${data.first_name} ${data.last_name ?? ""}`.trim();

    const userAttributes: UserInsert = {
      name,
      clerkId: data.id,
      email: primaryEmail.email_address,
      imageUrl: data.image_url,
      username: data.username!,
    };

    const user = await userByClerkId(ctx, data.id);
    if (user === null) {
      const userId = await ctx.table("users").insert(userAttributes);
      // Wait for the user to be fully created
      await ctx.table("users").getX(userId);
    } else {
      await ctx.table("users").getX(user._id).patch(userAttributes);
    }
  },
});

export const deleteFromClerk = internalMutation({
  args: { clerkUserId: v.string() },
  async handler(ctx, { clerkUserId }) {
    const user = await userByClerkId(ctx, clerkUserId);

    if (user !== null) {
      await ctx.table("users").getX(user._id).delete();
    } else {
      console.warn(
        `Can't delete user, there is none for Clerk user ID: ${clerkUserId}`,
      );
    }
  },
});

export async function getCurrentUserOrThrow(ctx: QueryCtx) {
  const userRecord = await getCurrentUser(ctx);
  if (!userRecord) throw new Error("Can't get current user");
  return userRecord;
}

export async function getCurrentUser(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (identity === null) {
    return null;
  }
  return await userByClerkId(ctx, identity.subject);
}

async function userByClerkId(ctx: QueryCtx, clerkId: string) {
  return await ctx
    .table("users", "clerkId", (q) => q.eq("clerkId", clerkId))
    .unique();
}

export async function userByClerkIdOrThrow(ctx: QueryCtx, clerkId: string) {
  const user = await userByClerkId(ctx, clerkId);
  if (!user) {
    throw new ConvexError("User not found");
  }
  return user;
}

export async function getUserOrThrow(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError("Unauthorized");
  }
  return await userByClerkIdOrThrow(ctx, identity.subject);
}
