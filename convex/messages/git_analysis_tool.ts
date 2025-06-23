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
      console.log(`Git analysis tool: ${operation}`, {
        repoUrl,
        path,
        pattern,
        depth,
      })

      // Note: This is a mock implementation showing the interface
      // The actual implementation would use the Computer SDK

      try {
        // Get or create an instance using the instance manager
        const instance =
          await instanceManager.getOrCreateInstance(existingInstanceId)
        const sdk = await instanceManager.getSDK()

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

            // Prepare working directory and clone
            const setupResult = await sdk.commands.execute({
              instanceId: instance.id,
              command: "bash",
              args: ["-c", "cd /home && rm -rf repo && mkdir -p repo"],
              timeout: 10000,
            })

            if (setupResult.isErr()) {
              return {
                success: false,
                operation,
                error: `Failed to setup working directory: ${setupResult.error.message}`,
              }
            }

            // Execute git clone
            const result = await sdk.commands.execute({
              instanceId: instance.id,
              command: "bash",
              args: ["-c", `cd /home && git clone --depth 1 "${repoUrl}" repo`],
              timeout: 60000,
            })

            if (result.isErr()) {
              return {
                success: false,
                operation,
                error: `Failed to clone repository: ${result.error.message}`,
              }
            }

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
              path: "/home/repo",
              // Include basic repo info
              stats: {
                filesAnalyzed: 0,
                totalSize: "0 MB",
                languages: [],
              },
            }
          }

          case "analyze": {
            const targetPath = path && path.trim() !== "" ? path : "/home/repo"

            // Update status
            // TODO: Re-enable once types regenerate
            // await ctx.runMutation(internal.messages.updateComputerOperation, {
            //   threadId: threadId as any,
            //   operation: `Analyzing ${targetPath}`,
            // })

            // Analyze directory structure using ls -la for better output
            const treeResult = await sdk.commands.execute({
              instanceId: instance.id,
              command: "bash",
              args: [
                "-c",
                `cd "${targetPath}" && find . -type f -maxdepth ${depth} | head -100`,
              ],
              timeout: 15000,
            })

            // Get file statistics
            const statsResult = await sdk.commands.execute({
              instanceId: instance.id,
              command: "bash",
              args: [
                "-c",
                `cd "${targetPath}" && du -sh . 2>/dev/null || echo "Size unknown"`,
              ],
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

            const searchPath = path && path.trim() !== "" ? path : "/home/repo"

            // Update status
            // TODO: Re-enable once types regenerate
            // await ctx.runMutation(internal.messages.updateComputerOperation, {
            //   threadId: threadId as any,
            //   operation: `Searching for "${pattern}"`,
            // })

            // Search for pattern in files or find files by name
            const searchResult = await sdk.commands.execute({
              instanceId: instance.id,
              command: "bash",
              args: [
                "-c",
                `cd "${searchPath}" && find . -name "*${pattern}*" -type f | head -50`,
              ],
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
