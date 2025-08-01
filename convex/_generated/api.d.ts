/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as chats from "../chats.js";
import type * as clerk_user_webhook from "../clerk_user_webhook.js";
import type * as functions from "../functions.js";
import type * as http from "../http.js";
import type * as migrations from "../migrations.js";
import type * as types from "../types.js";
import type * as user from "../user.js";
import type * as user_preferences from "../user_preferences.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  chats: typeof chats;
  clerk_user_webhook: typeof clerk_user_webhook;
  functions: typeof functions;
  http: typeof http;
  migrations: typeof migrations;
  types: typeof types;
  user: typeof user;
  user_preferences: typeof user_preferences;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
