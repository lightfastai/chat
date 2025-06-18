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
import type * as setup from "../setup.js";
import type * as share from "../share.js";
import type * as threads from "../threads.js";
import type * as titles from "../titles.js";
import type * as userSettings from "../userSettings.js";
import type * as users from "../users.js";

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
  setup: typeof setup;
  share: typeof share;
  threads: typeof threads;
  titles: typeof titles;
  userSettings: typeof userSettings;
  users: typeof users;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
