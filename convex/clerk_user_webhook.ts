import type { WebhookEvent } from "@clerk/backend";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { Webhook } from "svix";

export const clerkUserWebhookHandler = httpAction(async (ctx, request) => {
    const event = await validateRequest(request);
    if (!event) {
        return new Response("Error occurred", { status: 400 });
    }
    switch (event.type) {
        case "user.created": // intentional fallthrough
        case "user.updated":
            await ctx.runMutation(internal.user.upsertFromClerk, {
                data: event.data,
            });
            break;

        case "user.deleted": {
            const clerkUserId = event.data.id!;
            await ctx.runMutation(internal.user.deleteFromClerk, { clerkUserId });
            break;
        }
        default:
            console.log("Ignored Clerk webhook event", event.type);
    }

    return new Response(null, { status: 200 });
});

async function validateRequest(req: Request): Promise<WebhookEvent | null> {
    const payloadString = await req.text();
    const svixHeaders = {
        "svix-id": req.headers.get("svix-id")!,
        "svix-timestamp": req.headers.get("svix-timestamp")!,
        "svix-signature": req.headers.get("svix-signature")!,
    };
    const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!);
    try {
        return wh.verify(payloadString, svixHeaders) as WebhookEvent;
    } catch (error) {
        console.error("Error verifying webhook event", error);
        return null;
    }
}
