/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as cleanupDeprecatedFields from "../cleanupDeprecatedFields.js";
import type * as env from "../env.js";
import type * as feedback from "../feedback.js";
import type * as files from "../files.js";
import type * as http from "../http.js";
import type * as httpStreaming from "../httpStreaming.js";
import type * as lib_ai_client from "../lib/ai/client.js";
import type * as lib_ai_writer_message_part_writer from "../lib/ai/writer/message_part_writer.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_capability_guards from "../lib/capability_guards.js";
import type * as lib_create_system_prompt from "../lib/create_system_prompt.js";
import type * as lib_database from "../lib/database.js";
import type * as lib_error_handling from "../lib/error_handling.js";
import type * as lib_errors from "../lib/errors.js";
import type * as lib_services_encryption from "../lib/services/encryption.js";
import type * as messages from "../messages.js";
import type * as migrationRunners from "../migrationRunners.js";
import type * as migrationStatus from "../migrationStatus.js";
import type * as migrations from "../migrations.js";
import type * as setup from "../setup.js";
import type * as share from "../share.js";
import type * as threads from "../threads.js";
import type * as titles from "../titles.js";
import type * as types from "../types.js";
import type * as userSettings from "../userSettings.js";
import type * as users from "../users.js";
import type * as validators from "../validators.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

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
  cleanupDeprecatedFields: typeof cleanupDeprecatedFields;
  env: typeof env;
  feedback: typeof feedback;
  files: typeof files;
  http: typeof http;
  httpStreaming: typeof httpStreaming;
  "lib/ai/client": typeof lib_ai_client;
  "lib/ai/writer/message_part_writer": typeof lib_ai_writer_message_part_writer;
  "lib/auth": typeof lib_auth;
  "lib/capability_guards": typeof lib_capability_guards;
  "lib/create_system_prompt": typeof lib_create_system_prompt;
  "lib/database": typeof lib_database;
  "lib/error_handling": typeof lib_error_handling;
  "lib/errors": typeof lib_errors;
  "lib/services/encryption": typeof lib_services_encryption;
  messages: typeof messages;
  migrationRunners: typeof migrationRunners;
  migrationStatus: typeof migrationStatus;
  migrations: typeof migrations;
  setup: typeof setup;
  share: typeof share;
  threads: typeof threads;
  titles: typeof titles;
  types: typeof types;
  userSettings: typeof userSettings;
  users: typeof users;
  validators: typeof validators;
}>;
declare const fullApiWithMounts: typeof fullApi;

export declare const api: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "internal">
>;

export declare const components: {
  migrations: {
    lib: {
      cancel: FunctionReference<
        "mutation",
        "internal",
        { name: string },
        {
          batchSize?: number;
          cursor?: string | null;
          error?: string;
          isDone: boolean;
          latestEnd?: number;
          latestStart: number;
          name: string;
          next?: Array<string>;
          processed: number;
          state: "inProgress" | "success" | "failed" | "canceled" | "unknown";
        }
      >;
      cancelAll: FunctionReference<
        "mutation",
        "internal",
        { sinceTs?: number },
        Array<{
          batchSize?: number;
          cursor?: string | null;
          error?: string;
          isDone: boolean;
          latestEnd?: number;
          latestStart: number;
          name: string;
          next?: Array<string>;
          processed: number;
          state: "inProgress" | "success" | "failed" | "canceled" | "unknown";
        }>
      >;
      clearAll: FunctionReference<
        "mutation",
        "internal",
        { before?: number },
        null
      >;
      getStatus: FunctionReference<
        "query",
        "internal",
        { limit?: number; names?: Array<string> },
        Array<{
          batchSize?: number;
          cursor?: string | null;
          error?: string;
          isDone: boolean;
          latestEnd?: number;
          latestStart: number;
          name: string;
          next?: Array<string>;
          processed: number;
          state: "inProgress" | "success" | "failed" | "canceled" | "unknown";
        }>
      >;
      migrate: FunctionReference<
        "mutation",
        "internal",
        {
          batchSize?: number;
          cursor?: string | null;
          dryRun: boolean;
          fnHandle: string;
          name: string;
          next?: Array<{ fnHandle: string; name: string }>;
        },
        {
          batchSize?: number;
          cursor?: string | null;
          error?: string;
          isDone: boolean;
          latestEnd?: number;
          latestStart: number;
          name: string;
          next?: Array<string>;
          processed: number;
          state: "inProgress" | "success" | "failed" | "canceled" | "unknown";
        }
      >;
    };
  };
};
