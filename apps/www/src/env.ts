import { createEnv } from "@t3-oss/env-nextjs";
import { vercel } from "@t3-oss/env-nextjs/presets-zod";
import { z } from "zod";

export const env = createEnv({
	extends: [vercel()],
	/*
	 * Server-side environment variables, not available on the client.
	 * Will throw if you access these variables on the client.
	 */
	server: {
		// Convex handles deployment vs deploy key automatically
		// In development: CONVEX_DEPLOYMENT is used
		// In production: CONVEX_DEPLOY_KEY is used
		// We only need to validate what we actually use in our app

		// AI API Keys for Convex backend
		OPENAI_API_KEY: z.string().min(1, "OpenAI API key is required"),
		ANTHROPIC_API_KEY: z
			.string()
			.min(1, "Anthropic API key is required for Claude Sonnet 4"),
		OPENROUTER_API_KEY: z.string().min(1, "OpenRouter API key is required"),
		EXA_API_KEY: z.string().min(1, "Exa API key is required for web search"),

		// GitHub OAuth for Convex Auth
		AUTH_GITHUB_ID: z.string().optional(),
		AUTH_GITHUB_SECRET: z.string().optional(),
		// DEPRECATED: SITE_URL is no longer used - was previously for OpenRouter HTTP headers
		SITE_URL: z.string().url().optional(),
		// JWT private key for authentication tokens
		JWT_PRIVATE_KEY: z.string(),
		// JWKS for JWT verification
		JWKS: z.string(),
		// Docs deployment URL for rewrites
		DOCS_URL: z.string().url().default("https://lightfast-docs.vercel.app"),

		// Sentry configuration (optional for server-side source map uploads)
		SENTRY_ORG: z.string().default("lightfast"),
		SENTRY_PROJECT: z.string().default("lightfast-chat"),
		SENTRY_AUTH_TOKEN: z.string().optional(),
	},
	/*
	 * Environment variables available on the client (and server).
	 * 💡 You'll get type errors if these are not prefixed with NEXT_PUBLIC_.
	 */
	client: {
		// Convex URL for client-side connections
		// This is the only Convex variable our app actually needs
		NEXT_PUBLIC_CONVEX_URL: z.string().url(),
		// Vercel environment for client-side deployment detection
		NEXT_PUBLIC_VERCEL_ENV: z
			.enum(["production", "preview", "development"])
			.optional(),

		// Sentry client configuration
		NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
		NEXT_PUBLIC_SENTRY_ENVIRONMENT: z
			.enum(["development", "production"])
			.default("development"),

		// PostHog analytics configuration
		NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
		NEXT_PUBLIC_POSTHOG_HOST: z.string().url().optional(),
	},
	/*
	 * Shared environment variables, available on both client and server.
	 */
	shared: {
		NODE_ENV: z
			.enum(["development", "test", "production"])
			.default("development"),
	},
	/*
	 * You can't destruct `process.env` as a regular object in the Next.js Edge Runtime (e.g.
	 * Vercel Edge Functions) or Node.js < 20.4.0 (e.g. Vercel Serverless Functions).
	 * This is because only explicitly accessed variables are replaced by webpack/edge.
	 */
	runtimeEnv: {
		// Server-side
		OPENAI_API_KEY: process.env.OPENAI_API_KEY,
		ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
		OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
		EXA_API_KEY: process.env.EXA_API_KEY,
		AUTH_GITHUB_ID: process.env.AUTH_GITHUB_ID,
		AUTH_GITHUB_SECRET: process.env.AUTH_GITHUB_SECRET,
		SITE_URL: process.env.SITE_URL,
		JWT_PRIVATE_KEY: process.env.JWT_PRIVATE_KEY,
		JWKS: process.env.JWKS,
		DOCS_URL: process.env.DOCS_URL,
		SENTRY_ORG: process.env.SENTRY_ORG,
		SENTRY_PROJECT: process.env.SENTRY_PROJECT,
		SENTRY_AUTH_TOKEN: process.env.SENTRY_AUTH_TOKEN,
		// Client-side
		NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL,
		NEXT_PUBLIC_VERCEL_ENV: process.env.NEXT_PUBLIC_VERCEL_ENV,
		NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
		NEXT_PUBLIC_SENTRY_ENVIRONMENT: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT,
		NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
		NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
		// Shared
		NODE_ENV: process.env.NODE_ENV,
	},
	/*
	 * Run `build` or `dev` with SKIP_ENV_VALIDATION to skip env validation.
	 * This is especially useful for Docker builds.
	 */
	skipValidation: !!process.env.SKIP_ENV_VALIDATION,
	/*
	 * Makes it so that empty strings are treated as undefined.
	 * `SOME_VAR: z.string()` and `SOME_VAR=''` will throw an error.
	 */
	emptyStringAsUndefined: true,
});

// Convex URL helpers
export const getConvexUrl = () => env.NEXT_PUBLIC_CONVEX_URL;
export const isLocalConvex = () =>
	env.NEXT_PUBLIC_CONVEX_URL.includes("127.0.0.1");

// Environment helpers
export const isDevelopment = () => env.NODE_ENV === "development";
export const isProduction = () => env.NODE_ENV === "production";
export const isTest = () => env.NODE_ENV === "test";
export const isNonProduction = () => env.NODE_ENV !== "production";
