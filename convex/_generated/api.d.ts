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
import type * as auth from "../auth.js";
import type * as feedback from "../feedback.js";
import type * as files from "../files.js";
import type * as http from "../http.js";
import type * as lib_encryption from "../lib/encryption.js";
import type * as messages from "../messages.js";
import type * as polar_checkout from "../polar/checkout.js";
import type * as polar_customers from "../polar/customers.js";
import type * as polar_usage from "../polar/usage.js";
import type * as polar_webhooks from "../polar/webhooks.js";
import type * as setup from "../setup.js";
import type * as threads from "../threads.js";
import type * as titles from "../titles.js";
import type * as userSettings from "../userSettings.js";
import type * as users from "../users.js";
import type * as webSearch from "../webSearch.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  feedback: typeof feedback;
  files: typeof files;
  http: typeof http;
  "lib/encryption": typeof lib_encryption;
  messages: typeof messages;
  "polar/checkout": typeof polar_checkout;
  "polar/customers": typeof polar_customers;
  "polar/usage": typeof polar_usage;
  "polar/webhooks": typeof polar_webhooks;
  setup: typeof setup;
  threads: typeof threads;
  titles: typeof titles;
  userSettings: typeof userSettings;
  users: typeof users;
  webSearch: typeof webSearch;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
