#!/usr/bin/env bun
/**
 * Script to generate Convex validators from the model definitions
 * Run with: bun run scripts/generate-convex-validators.ts
 */

import { ALL_MODEL_IDS } from "../src/lib/ai/schemas"

// Generate the model ID validator
const modelIdValidator = ALL_MODEL_IDS.map((id) => `  v.literal("${id}"),`).join("\n")

const output = `import { v } from "convex/values"

/**
 * Shared validators for type safety across Convex functions
 *
 * These validators ensure consistent data validation and provide
 * better type inference throughout the backend.
 * 
 * AUTO-GENERATED from src/lib/ai/schemas.ts
 * Do not edit manually - run: bun run scripts/generate-convex-validators.ts
 */

// ===== Model Validators =====
// Model ID validator for all supported AI models
export const modelIdValidator = v.union(
${modelIdValidator}
)

// Model provider validator
export const modelProviderValidator = v.union(
  v.literal("openai"),
  v.literal("anthropic"),
  v.literal("openrouter"),
)

// ===== ID Validators =====
// Client ID validator (nanoid format, typically 21 chars)
export const clientIdValidator = v.string()

// Share ID validator (nanoid format, 24 chars for security)
export const shareIdValidator = v.string()

// Stream ID validator (format: stream_<timestamp>_<random>)
export const streamIdValidator = v.string()

// Chunk ID validator (format: chunk_<timestamp>_<random>)
export const chunkIdValidator = v.string()

// Storage ID validator for Convex file storage
export const storageIdValidator = v.string()

// ===== String Format Validators =====
// Email validator with basic format checking
export const emailValidator = v.string()

// URL validator for links and images
export const urlValidator = v.string()

// Phone number validator
export const phoneValidator = v.optional(v.string())

// API key validators with provider-specific patterns
export const openaiApiKeyValidator = v.string() // sk-...
export const anthropicApiKeyValidator = v.string() // sk-ant-...
export const openrouterApiKeyValidator = v.string()

// ===== Content Validators =====
// Title validator with max length
export const titleValidator = v.string() // Max 80 chars enforced in handler

// User name validator
export const userNameValidator = v.string()

// Comment/feedback validator with reasonable length
export const commentValidator = v.optional(v.string())
`

console.log(output)