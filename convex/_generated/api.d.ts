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
import type * as env from "../env.js";
import type * as feedback from "../feedback.js";
import type * as files from "../files.js";
import type * as http from "../http.js";
import type * as lib_encryption from "../lib/encryption.js";
import type * as lib_errors from "../lib/errors.js";
import type * as messages from "../messages.js";
import type * as setup from "../setup.js";
import type * as share from "../share.js";
import type * as streaming_DeltaStreamer from "../streaming/DeltaStreamer.js";
import type * as streaming_index from "../streaming/index.js";
import type * as streaming_queries from "../streaming/queries.js";
import type * as streaming_validators from "../streaming/validators.js";
import type * as streaming from "../streaming.js";
import type * as threads from "../threads.js";
import type * as titles from "../titles.js";
import type * as userSettings from "../userSettings.js";
import type * as users from "../users.js";
import type * as validators from "../validators.js";

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
  env: typeof env;
  feedback: typeof feedback;
  files: typeof files;
  http: typeof http;
  "lib/encryption": typeof lib_encryption;
  "lib/errors": typeof lib_errors;
  messages: typeof messages;
  setup: typeof setup;
  share: typeof share;
  "streaming/DeltaStreamer": typeof streaming_DeltaStreamer;
  "streaming/index": typeof streaming_index;
  "streaming/queries": typeof streaming_queries;
  "streaming/validators": typeof streaming_validators;
  streaming: typeof streaming;
  threads: typeof threads;
  titles: typeof titles;
  userSettings: typeof userSettings;
  users: typeof users;
  validators: typeof validators;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
