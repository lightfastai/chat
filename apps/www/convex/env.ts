import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
	server: {
		// AI API Keys
		ANTHROPIC_API_KEY: z
			.string()
			.min(1)
			.describe("Anthropic API key for Claude models"),
		OPENAI_API_KEY: z.string().min(1).describe("OpenAI API key for GPT models"),
		OPENROUTER_API_KEY: z
			.string()
			.min(1)
			.describe("OpenRouter API key for AI models"),
		EXA_API_KEY: z.string().min(1).describe("Exa API key for web search"),

		// Authentication & Encryption
		CLERK_JWT_ISSUER_DOMAIN: z
			.string()
			.min(1)
			.describe("Clerk JWT issuer domain for authentication"),
		JWT_PRIVATE_KEY: z
			.string()
			.min(1)
			.optional()
			.describe("JWT private key for authentication"),
		ENCRYPTION_KEY: z
			.string()
			.min(1)
			.describe("Required encryption key for API key encryption"),
		CONVEX_SITE_URL: z
			.string()
			.url()
			.optional()
			.describe("Site URL for authentication configuration"),

		// Environment
		NODE_ENV: z
			.enum(["development", "test", "production"])
			.default("development")
			.describe("Node environment"),
	},
	runtimeEnv: process.env,
	emptyStringAsUndefined: true,
	onValidationError: (error) => {
		console.error("❌ Invalid environment variables in Convex:", error);
		throw new Error("Invalid environment variables");
	},
	onInvalidAccess: (variable) => {
		throw new Error(
			`❌ Attempted to access a server-side environment variable on the client: ${variable}`,
		);
	},
});

// Type-safe environment variable access
export type ConvexEnv = typeof env;
