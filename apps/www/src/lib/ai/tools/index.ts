/**
 * AI Tools System - Single source of truth for tool definitions
 *
 * Define a tool once and get:
 * - Type-safe tool instances for AI SDK
 * - Input/output types for TypeScript
 * - Automatic registry management
 */

import { tool } from "ai"
import { z } from "zod/v4"

// ============================================
// TOOL IMPLEMENTATIONS
// ============================================

const webSearchInputSchema = z.object({
  query: z.string().describe("The search query"),
  useAutoprompt: z
    .boolean()
    .default(true)
    .describe("Whether to enhance the query automatically"),
  numResults: z
    .number()
    .min(1)
    .max(10)
    .default(5)
    .describe("Number of results to return"),
})

const webSearchOutputSchema = z.object({
  results: z.array(
    z.object({
      title: z.string(),
      url: z.string(),
      snippet: z.string().optional(),
      score: z.number().optional(),
    })
  ),
  query: z.string(),
  enhancedQuery: z.string().optional(),
})

async function executeWebSearch(
  input: z.infer<typeof webSearchInputSchema>
): Promise<z.infer<typeof webSearchOutputSchema>> {
  const API_KEY = process.env.EXA_API_KEY
  if (!API_KEY) {
    throw new Error("EXA_API_KEY environment variable is not set")
  }

  try {
    const response = await fetch("https://api.exa.ai/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        query: input.query,
        useAutoprompt: input.useAutoprompt,
        numResults: input.numResults,
        type: "neural",
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Exa API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()

    // Define the expected result type from Exa API
    interface ExaResult {
      title: string
      url: string
      snippet?: string
      score?: number
    }

    return {
      results: data.results.map((result: ExaResult) => ({
        title: result.title,
        url: result.url,
        snippet: result.snippet,
        score: result.score,
      })),
      query: input.query,
      enhancedQuery: data.autopromptString,
    }
  } catch (error) {
    console.error("Web search error:", error)
    throw error
  }
}

// ============================================
// TOOL REGISTRY - Single source of truth
// ============================================

// Create AI SDK tools directly - this is the single source of truth
export const LIGHTFAST_TOOLS = {
  web_search: tool({
    description: "Search the web for information using Exa AI",
    inputSchema: webSearchInputSchema,
    execute: executeWebSearch,
  }),
  // Add more tools here:
  // calculator: tool({
  //   description: "Perform mathematical calculations",
  //   inputSchema: calculatorInputSchema,
  //   execute: executeCalculator,
  // }),
} as const

// ============================================
// TYPE EXPORTS - All derived from LIGHTFAST_TOOLS
// ============================================

export type LightfastToolSet = typeof LIGHTFAST_TOOLS
export type LightfastToolName = keyof LightfastToolSet

// Tool schemas type - for UI components
export type LightfastToolSchemas = {
  web_search: {
    input: z.infer<typeof webSearchInputSchema>
    output: z.infer<typeof webSearchOutputSchema>
  }
  // Add more tool types here when adding new tools
}

// Get specific tool types
export type LightfastToolInput<T extends LightfastToolName> =
  LightfastToolSchemas[T]["input"]

export type LightfastToolOutput<T extends LightfastToolName> =
  LightfastToolSchemas[T]["output"]

// ============================================
// RUNTIME HELPERS
// ============================================

export function isLightfastToolName(name: string): name is LightfastToolName {
  return name in LIGHTFAST_TOOLS
}

export function validateToolName(name: string): LightfastToolName {
  if (isLightfastToolName(name)) {
    return name
  }
  throw new Error(`Invalid tool name: ${name}`)
}

// Tool names array for Convex validators
export const TOOL_NAMES = Object.keys(LIGHTFAST_TOOLS) as LightfastToolName[]

// ============================================
// METADATA EXPORTS
// ============================================

// For UI components that need display names and descriptions
export const TOOL_METADATA = {
  web_search: {
    name: "web_search" as const,
    displayName: "Web Search",
    description: "Search the web for information using Exa AI",
  },
  // Add more tool metadata here when adding new tools
} as const

export function getToolMetadata(name: LightfastToolName) {
  return TOOL_METADATA[name]
}

// For getting tool schemas (e.g., for validation in other parts of the app)
export function getToolSchemas(name: LightfastToolName) {
  switch (name) {
    case "web_search":
      return {
        input: webSearchInputSchema,
        output: webSearchOutputSchema,
      }
    // Add more cases here when adding new tools
    default:
      throw new Error(`Unknown tool: ${name}`)
  }
}

// ============================================
// CONVEX TYPE EXPORTS
// ============================================

export type ToolInputValidators = LightfastToolSchemas
export type ToolOutputValidators = LightfastToolSchemas