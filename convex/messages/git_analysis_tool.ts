import { tool } from "ai"
import { z } from "zod"
import type { Id } from "../_generated/dataModel.js"
import { env } from "../env.js"
// import { internal } from "../_generated/api.js" // TODO: Re-enable for computer status tracking
import { ComputerInstanceManager } from "./computer_instance_manager.js"

/**
 * Creates a computer tool that allows AI to perform git operations,
 * file analysis, and code exploration in an isolated environment
 */
export function createGitAnalysisTool(
  threadId: Id<"threads">,
  existingInstanceId?: string,
) {
  const instanceManager = new ComputerInstanceManager({
    threadId,
    flyApiToken: env.FLY_API_TOKEN,
    flyAppName: env.FLY_APP_NAME,
  })

  return tool({
    description:
      "Clone git repositories and analyze their structure, code, and contents. Use this to examine codebases, understand project architecture, review implementation patterns, or search for specific functionality.",
    parameters: z.object({
      operation: z
        .enum(["clone", "analyze", "search"])
        .describe("The operation to perform"),
      repoUrl: z
        .string()
        .describe(
          "Git repository URL (required for clone operation, optional for others)",
        )
        .default(""),
      path: z
        .string()
        .describe("File or directory path to analyze (relative to repo root)")
        .default(""),
      pattern: z
        .string()
        .describe("Search pattern or file extension filter")
        .default(""),
      depth: z
        .number()
        .min(1)
        .max(10)
        .describe("Directory traversal depth for analysis")
        .default(3),
    }),
    execute: async ({ operation, repoUrl, path, pattern, depth }) => {
      console.log("Git analysis tool called:", {
        operation,
        repoUrl,
        path,
        pattern,
        depth,
        threadId,
        existingInstanceId,
        timestamp: new Date().toISOString(),
      })

      // Note: This is a mock implementation showing the interface
      // The actual implementation would use the Computer SDK

      try {
        // Get or create an instance using the instance manager
        const instance =
          await instanceManager.getOrCreateInstance(existingInstanceId)
        const sdk = await instanceManager.getSDK()

        console.log("Git analysis tool - Instance acquired:", {
          instanceId: instance.id,
          instanceStatus: instance.status,
          threadId,
          existingInstanceId,
        })

        switch (operation) {
          case "clone": {
            if (!repoUrl || repoUrl.trim() === "") {
              return {
                success: false,
                operation,
                error: "Repository URL is required for clone operation",
              }
            }

            // Validate URL format
            try {
              new URL(repoUrl)
            } catch {
              return {
                success: false,
                operation,
                error: "Invalid repository URL format",
              }
            }

            // Update status to show cloning
            // TODO: Re-enable once types regenerate
            // await ctx.runMutation(internal.messages.updateComputerOperation, {
            //   threadId: threadId as any,
            //   operation: `Cloning ${repoUrl}`,
            // })

            // First, verify git is available
            console.log("Checking git availability...")
            const gitCheckResult = await sdk.commands.execute({
              instanceId: instance.id,
              command: "which",
              args: ["git"],
              timeout: 5000,
            })

            if (gitCheckResult.isErr()) {
              console.error("Git availability check failed:", {
                error: gitCheckResult.error,
                errorMessage: gitCheckResult.error.message,
                instanceId: instance.id,
              })
              return {
                success: false,
                operation,
                error: `Git is not available on the instance: ${gitCheckResult.error.message}`,
              }
            }

            console.log("Git found at:", gitCheckResult.value.output.trim())

            // Check current directory
            console.log("Checking current directory...")
            const pwdResult = await sdk.commands.execute({
              instanceId: instance.id,
              command: "pwd",
              args: [],
              timeout: 5000,
            })

            if (pwdResult.isOk()) {
              console.log("Current directory:", pwdResult.value.output.trim())
            }

            // Execute git clone directly
            console.log("Starting git clone:", {
              repoUrl,
              instanceId: instance.id,
            })

            // Extract repo name from URL for the destination
            const repoName =
              repoUrl.split("/").pop()?.replace(".git", "") || "repo"

            const result = await sdk.commands.execute({
              instanceId: instance.id,
              command: "git",
              args: ["clone", "--depth", "1", repoUrl, `/tmp/${repoName}`],
              timeout: 60000,
            })

            if (result.isErr()) {
              console.error("Git clone failed:", {
                repoUrl,
                instanceId: instance.id,
                error: result.error,
                errorMessage: result.error.message,
                errorType: result.error.constructor.name,
                errorDetails: JSON.stringify(result.error),
              })

              // Try to get more info about the failure
              const lsResult = await sdk.commands.execute({
                instanceId: instance.id,
                command: "ls",
                args: ["-la", "/tmp"],
                timeout: 5000,
              })

              const dfResult = await sdk.commands.execute({
                instanceId: instance.id,
                command: "df",
                args: ["-h"],
                timeout: 5000,
              })

              const whoamiResult = await sdk.commands.execute({
                instanceId: instance.id,
                command: "whoami",
                args: [],
                timeout: 5000,
              })

              if (lsResult.isOk()) {
                console.log("Directory listing /tmp:", lsResult.value.output)
              }
              if (dfResult.isOk()) {
                console.log("Disk space:", dfResult.value.output)
              }
              if (whoamiResult.isOk()) {
                console.log("Current user:", whoamiResult.value.output.trim())
              }

              return {
                success: false,
                operation,
                error: `Failed to clone repository: ${result.error.message}`,
              }
            }

            console.log("Git clone successful:", {
              output: result.value.output?.substring(0, 500),
              exitCode: result.value.exitCode,
            })

            // Update status to show analysis
            // TODO: Re-enable once types regenerate
            // await ctx.runMutation(internal.messages.updateComputerOperation, {
            //   threadId: threadId as any,
            //   operation: "Analyzing repository structure",
            // })

            return {
              success: true,
              operation,
              repoUrl,
              message: "Repository cloned successfully",
              path: `/tmp/${repoName}`,
              // Include basic repo info
              stats: {
                filesAnalyzed: 0,
                totalSize: "0 MB",
                languages: [],
              },
            }
          }

          case "analyze": {
            const targetPath = path && path.trim() !== "" ? path : "/tmp"

            // Update status
            // TODO: Re-enable once types regenerate
            // await ctx.runMutation(internal.messages.updateComputerOperation, {
            //   threadId: threadId as any,
            //   operation: `Analyzing ${targetPath}`,
            // })

            // Analyze directory structure using find
            const treeResult = await sdk.commands.execute({
              instanceId: instance.id,
              command: "find",
              args: [targetPath, "-type", "f", "-maxdepth", String(depth)],
              timeout: 15000,
            })

            // Get file statistics
            const statsResult = await sdk.commands.execute({
              instanceId: instance.id,
              command: "du",
              args: ["-sh", targetPath],
              timeout: 10000,
            })

            if (treeResult.isErr() || statsResult.isErr()) {
              return {
                success: false,
                operation,
                error: "Failed to analyze directory structure",
              }
            }

            return {
              success: true,
              operation,
              path: targetPath,
              analysis: {
                structure: treeResult.value.output,
                fileCount: treeResult.value.output
                  .split("\n")
                  .filter((line: string) => line.trim()).length,
                totalSize: statsResult.value.output.trim(),
                topLanguages: ["TypeScript", "JavaScript", "JSON"], // TODO: Analyze file extensions
                keyFiles: treeResult.value.output
                  .split("\n")
                  .filter(
                    (f: string) =>
                      f.includes("package.json") || f.includes("README"),
                  )
                  .slice(0, 5),
              },
            }
          }

          case "search": {
            if (!pattern || pattern.trim() === "") {
              return {
                success: false,
                operation,
                error: "Search pattern is required",
              }
            }

            const searchPath = path && path.trim() !== "" ? path : "/tmp"

            // Update status
            // TODO: Re-enable once types regenerate
            // await ctx.runMutation(internal.messages.updateComputerOperation, {
            //   threadId: threadId as any,
            //   operation: `Searching for "${pattern}"`,
            // })

            // Search for pattern in files or find files by name
            const searchResult = await sdk.commands.execute({
              instanceId: instance.id,
              command: "find",
              args: [searchPath, "-name", `*${pattern}*`, "-type", "f"],
              timeout: 30000,
            })

            if (searchResult.isErr()) {
              return {
                success: false,
                operation,
                error: `Search failed: ${searchResult.error.message}`,
              }
            }

            return {
              success: true,
              operation,
              pattern,
              path: searchPath,
              results: searchResult.value.output
                .split("\n")
                .filter((line: string) => line.trim())
                .map((line: string) => {
                  const match = line.match(/^([^:]+):(\d+):(.*)$/)
                  if (match) {
                    return {
                      file: match[1],
                      line: Number.parseInt(match[2]),
                      content: match[3].trim(),
                    }
                  }
                  return null
                })
                .filter(Boolean)
                .slice(0, 50), // Limit to first 50 matches
              totalMatches: searchResult.value.output
                .split("\n")
                .filter((line: string) => line.trim()).length,
            }
          }

          default:
            return {
              success: false,
              operation,
              error: `Unknown operation: ${operation}`,
            }
        }
      } catch (error) {
        console.error("Git analysis tool error:", error)
        return {
          success: false,
          operation,
          error: error instanceof Error ? error.message : "Unknown error",
          repoUrl,
          path,
        }
      }
    },
  })
}
