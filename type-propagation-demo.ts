/**
 * Type Propagation Demo - Shows how types update when adding a new tool version
 */

import { TOOL_VERSIONS, ToolVersions, getToolMetadata, getToolSchemas } from "./apps/www/src/lib/ai/tools";
import type { z } from "zod/v4";

// 1. TOOL_VERSIONS now automatically includes both versions
const webSearchVersions = TOOL_VERSIONS.web_search;
// Type: readonly ["1.0.0", "2.0.0"]
console.log("Available web_search versions:", webSearchVersions);

// 2. ToolVersions type is updated
type WebSearchVersions = ToolVersions<"web_search">;
// Type: "1.0.0" | "2.0.0"

// 3. getToolMetadata returns updated version info
const metadata = getToolMetadata("web_search");
// metadata.defaultVersion is now "2.0.0"
// metadata.availableVersions is ["1.0.0", "2.0.0"]
console.log("Tool metadata:", metadata);

// 4. Version-specific schemas
const v1Schemas = getToolSchemas("web_search", "1.0.0");
const v2Schemas = getToolSchemas("web_search", "2.0.0");

// Type inference for v1 input
type V1Input = z.infer<typeof v1Schemas.input>;
// {
//   query: string;
//   useAutoprompt?: boolean;
//   numResults?: number; // max 10
// }

// Type inference for v2 input  
type V2Input = z.infer<typeof v2Schemas.input>;
// {
//   query: string;
//   useAutoprompt?: boolean;
//   numResults?: number; // max 20
//   searchType?: "neural" | "keyword";
//   domain?: string;
//   startDate?: string;
//   endDate?: string;
//   includeText?: boolean;
// }

// 5. Convex validators automatically update
// In convex/validators.ts:
// webSearchVersionValidator = v.union(v.literal("1.0.0"), v.literal("2.0.0"))

// 6. Type-safe version checking
function processWebSearch(version: WebSearchVersions) {
  switch (version) {
    case "1.0.0":
      console.log("Using basic web search");
      break;
    case "2.0.0":
      console.log("Using advanced web search with filters");
      break;
    // TypeScript ensures this is exhaustive
  }
}

// 7. Default version usage (LIGHTFAST_TOOLS uses default version)
// Since defaultVersion is now "2.0.0", the tool exposed to AI SDK
// will use v2.0.0's input/output schemas

console.log("\n=== Type Propagation Summary ===");
console.log("1. TOOL_VERSIONS.web_search:", webSearchVersions);
console.log("2. Default version changed to:", metadata.defaultVersion);
console.log("3. Convex validators auto-updated to accept both versions");
console.log("4. Type-safe version handling throughout the system");
console.log("5. AI SDK tools use new default version (2.0.0)");