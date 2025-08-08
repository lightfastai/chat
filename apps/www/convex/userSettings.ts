import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { internalMutation, mutation, query } from "./_generated/server";
import { getAuthenticatedClerkUserId } from "./lib/auth";

// Import proper encryption utilities
import { decrypt, encrypt } from "./lib/services/encryption";

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
	handler: async (ctx) => {
		let clerkUserId;
		try {
			clerkUserId = await getAuthenticatedClerkUserId(ctx);
		} catch {
			return null;
		}

		const settings = await ctx.db
			.query("userSettings")
			.withIndex("by_clerk_user", (q) => q.eq("clerkUserId", clerkUserId))
			.first();

		if (!settings) {
			return null;
		}

		return settings;
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
		const clerkUserId = await getAuthenticatedClerkUserId(ctx);

		const existingSettings = await ctx.db
			.query("userSettings")
			.withIndex("by_clerk_user", (q) => q.eq("clerkUserId", clerkUserId))
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
			// Create new settings with clerkUserId
			await ctx.db.insert("userSettings", {
				userId: "" as Id<"users">, // Placeholder for migration
				clerkUserId: clerkUserId,
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
		const clerkUserId = await getAuthenticatedClerkUserId(ctx);

		const existingSettings = await ctx.db
			.query("userSettings")
			.withIndex("by_clerk_user", (q) => q.eq("clerkUserId", clerkUserId))
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
			// Create new settings with clerkUserId
			await ctx.db.insert("userSettings", {
				userId: "" as Id<"users">, // Placeholder for migration
				clerkUserId: clerkUserId,
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
	handler: async (ctx, args) => {
		const provider = args.provider;
		const clerkUserId = await getAuthenticatedClerkUserId(ctx);

		const existingSettings = await ctx.db
			.query("userSettings")
			.withIndex("by_clerk_user", (q) => q.eq("clerkUserId", clerkUserId))
			.first();

		if (!existingSettings) {
			throw new ConvexError("Settings not found");
		}

		const apiKeys = { ...existingSettings.apiKeys };
		// TypeScript needs explicit type narrowing for the provider key
		const key = provider as keyof typeof apiKeys;
		delete apiKeys[key];

		await ctx.db.patch(existingSettings._id, {
			apiKeys,
			updatedAt: Date.now(),
		});

		return { success: true };
	},
});

// Internal function to get decrypted API keys (for use in other Convex functions)
export const getDecryptedApiKeys = internalMutation({
	args: { clerkUserId: v.string() },
	returns: v.union(
		v.null(),
		v.object({
			openai: v.optional(openaiApiKeyValidator),
			anthropic: v.optional(anthropicApiKeyValidator),
			openrouter: v.optional(openrouterApiKeyValidator),
		}),
	),
	handler: async (ctx, { clerkUserId }) => {
		// Try to find settings by Clerk user ID first
		const settings = await ctx.db
			.query("userSettings")
			.withIndex("by_clerk_user", (q) => q.eq("clerkUserId", clerkUserId))
			.first();

		// If not found by Clerk user ID, this might be a legacy record
		// For now, return null since we can't map without the clerkUserId field populated
		if (!settings) {
			console.warn(`No userSettings found for Clerk user ID: ${clerkUserId}`);
			return null;
		}

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
