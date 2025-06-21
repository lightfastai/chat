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
import type * as lib_ai_client from "../lib/ai_client.js";
import type * as lib_ai_tools from "../lib/ai_tools.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_database from "../lib/database.js";
import type * as lib_encryption from "../lib/encryption.js";
import type * as lib_errors from "../lib/errors.js";
import type * as lib_message_builder from "../lib/message_builder.js";
import type * as lib_message_service from "../lib/message_service.js";
import type * as messages from "../messages.js";
import type * as messages_actions from "../messages/actions.js";
import type * as messages_helpers from "../messages/helpers.js";
import type * as messages_mutations from "../messages/mutations.js";
import type * as messages_queries from "../messages/queries.js";
import type * as messages_tools from "../messages/tools.js";
import type * as messages_types from "../messages/types.js";
import type * as setup from "../setup.js";
import type * as share from "../share.js";
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
	"lib/ai_client": typeof lib_ai_client;
	"lib/ai_tools": typeof lib_ai_tools;
	"lib/auth": typeof lib_auth;
	"lib/database": typeof lib_database;
	"lib/encryption": typeof lib_encryption;
	"lib/errors": typeof lib_errors;
	"lib/message_builder": typeof lib_message_builder;
	"lib/message_service": typeof lib_message_service;
	"messages/actions": typeof messages_actions;
	"messages/helpers": typeof messages_helpers;
	"messages/mutations": typeof messages_mutations;
	"messages/queries": typeof messages_queries;
	"messages/tools": typeof messages_tools;
	"messages/types": typeof messages_types;
	messages: typeof messages;
	setup: typeof setup;
	share: typeof share;
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
