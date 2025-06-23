/**
 * AI Tools Library
 *
 * Centralized location for all AI tool definitions used across the application.
 * These tools extend AI capabilities with external services and functionalities.
 */

export { createWebSearchTool } from "../messages/tools.js"
export { createGitAnalysisTool } from "../messages/git_analysis_tool.js"

// Future tools can be added here:
// - createImageGenerationTool
// - createCodeExecutionTool
// - createDatabaseQueryTool
// - createFileSystemTool
// etc.
