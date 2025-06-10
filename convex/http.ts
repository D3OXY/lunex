import { clerkUserWebhookHandler } from "./clerk_user_webhook";
import { httpRouter } from "convex/server";

const http = httpRouter();

http.route({
  path: "/clerk-users-webhook",
  method: "POST",
  handler: clerkUserWebhookHandler,
});

export default http;
