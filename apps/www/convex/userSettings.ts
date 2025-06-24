import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";

// Import proper encryption utilities
import { decrypt, encrypt } from "./lib/encryption.js";

// Import validators
import {
	anthropicApiKeyValidator,
	modelIdValidator,
	modelProviderValidator,
	openaiApiKeyValidator,
	openrouterApiKeyValidator,
} from "./validators";

// Get user settings
export const getUserSettings = query({
	args: {},
	returns: v.union(
		v.null(),
		v.object({
			_id: v.id("userSettings"),
			userId: v.id("users"),
			preferences: v.optional(
				v.object({
					defaultModel: v.optional(modelIdValidator),
					preferredProvider: v.optional(modelProviderValidator),
				}),
			),
			createdAt: v.number(),
			updatedAt: v.number(),
			hasOpenAIKey: v.boolean(),
			hasAnthropicKey: v.boolean(),
			hasOpenRouterKey: v.boolean(),
		}),
	),
	handler: async (ctx) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) {
			return null;
		}

		const settings = await ctx.db
			.query("userSettings")
			.withIndex("by_user", (q) => q.eq("userId", userId))
			.first();

		if (!settings) {
			return null;
		}

		// Return settings without decrypted API keys for security
		return {
			_id: settings._id,
			userId: settings.userId,
			preferences: settings.preferences,
			createdAt: settings.createdAt,
			updatedAt: settings.updatedAt,
			hasOpenAIKey: !!settings.apiKeys?.openai,
			hasAnthropicKey: !!settings.apiKeys?.anthropic,
			hasOpenRouterKey: !!settings.apiKeys?.openrouter,
		};
	},
});

// Update user API keys
export const updateApiKeys = mutation({
	args: {
		openaiKey: v.optional(openaiApiKeyValidator),
		anthropicKey: v.optional(anthropicApiKeyValidator),
		openrouterKey: v.optional(openrouterApiKeyValidator),
	},
	returns: v.object({ success: v.boolean() }),
	handler: async (ctx, { openaiKey, anthropicKey, openrouterKey }) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) {
			throw new ConvexError("Unauthorized");
		}

		const existingSettings = await ctx.db
			.query("userSettings")
			.withIndex("by_user", (q) => q.eq("userId", userId))
			.first();

		const now = Date.now();

		// Prepare encrypted API keys
		const apiKeys: {
			openai?: string;
			anthropic?: string;
			openrouter?: string;
		} = {};

		if (openaiKey) {
			apiKeys.openai = await encrypt(openaiKey);
		} else if (existingSettings?.apiKeys?.openai) {
			// Keep existing key if not updating
			apiKeys.openai = existingSettings.apiKeys.openai;
		}

		if (anthropicKey) {
			apiKeys.anthropic = await encrypt(anthropicKey);
		} else if (existingSettings?.apiKeys?.anthropic) {
			// Keep existing key if not updating
			apiKeys.anthropic = existingSettings.apiKeys.anthropic;
		}

		if (openrouterKey) {
			apiKeys.openrouter = await encrypt(openrouterKey);
		} else if (existingSettings?.apiKeys?.openrouter) {
			// Keep existing key if not updating
			apiKeys.openrouter = existingSettings.apiKeys.openrouter;
		}

		if (existingSettings) {
			// Update existing settings
			await ctx.db.patch(existingSettings._id, {
				apiKeys,
				updatedAt: now,
			});
		} else {
			// Create new settings
			await ctx.db.insert("userSettings", {
				userId,
				apiKeys,
				createdAt: now,
				updatedAt: now,
			});
		}

		return { success: true };
	},
});

// Update user preferences
export const updatePreferences = mutation({
	args: {
		defaultModel: v.optional(modelIdValidator),
		preferredProvider: v.optional(modelProviderValidator),
	},
	returns: v.object({ success: v.boolean() }),
	handler: async (ctx, { defaultModel, preferredProvider }) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) {
			throw new ConvexError("Unauthorized");
		}

		const existingSettings = await ctx.db
			.query("userSettings")
			.withIndex("by_user", (q) => q.eq("userId", userId))
			.first();

		const now = Date.now();
		const preferences = {
			defaultModel,
			preferredProvider,
		};

		if (existingSettings) {
			// Update existing settings
			await ctx.db.patch(existingSettings._id, {
				preferences,
				updatedAt: now,
			});
		} else {
			// Create new settings
			await ctx.db.insert("userSettings", {
				userId,
				preferences,
				createdAt: now,
				updatedAt: now,
			});
		}

		return { success: true };
	},
});

// Remove specific API key
export const removeApiKey = mutation({
	args: {
		provider: modelProviderValidator,
	},
	returns: v.object({ success: v.boolean() }),
	handler: async (ctx, { provider }) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) {
			throw new ConvexError("Unauthorized");
		}

		const existingSettings = await ctx.db
			.query("userSettings")
			.withIndex("by_user", (q) => q.eq("userId", userId))
			.first();

		if (!existingSettings) {
			throw new ConvexError("Settings not found");
		}

		const apiKeys = { ...existingSettings.apiKeys };
		delete apiKeys[provider];

		await ctx.db.patch(existingSettings._id, {
			apiKeys,
			updatedAt: Date.now(),
		});

		return { success: true };
	},
});

// Internal function to get decrypted API keys (for use in other Convex functions)
export const getDecryptedApiKeys = internalMutation({
	args: { userId: v.id("users") },
	returns: v.union(
		v.null(),
		v.object({
			openai: v.optional(openaiApiKeyValidator),
			anthropic: v.optional(anthropicApiKeyValidator),
			openrouter: v.optional(openrouterApiKeyValidator),
		}),
	),
	handler: async (ctx, { userId }) => {
		const settings = await ctx.db
			.query("userSettings")
			.withIndex("by_user", (q) => q.eq("userId", userId))
			.first();

		if (!settings?.apiKeys) {
			return null;
		}

		return {
			openai: settings.apiKeys.openai
				? await decrypt(settings.apiKeys.openai)
				: undefined,
			anthropic: settings.apiKeys.anthropic
				? await decrypt(settings.apiKeys.anthropic)
				: undefined,
			openrouter: settings.apiKeys.openrouter
				? await decrypt(settings.apiKeys.openrouter)
				: undefined,
		};
	},
});
