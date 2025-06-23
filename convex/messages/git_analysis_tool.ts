import {
  type CreateInstanceOptions,
  type Instance,
  type LightfastComputerSDK,
  createLightfastComputer,
} from "@lightfastai/computer"
import { tool } from "ai"
import { z } from "zod"
// import { internal } from "../_generated/api.js" // TODO: Re-enable for computer status tracking
import { env } from "../env.js"

/**
 * Creates a git analysis tool that allows AI to clone repositories
 * and analyze their contents in an isolated environment with status tracking
 */
export function createGitAnalysisTool(ctx: any, threadId: string) {
  return tool({
    description:
      "Clone git repositories and analyze their structure, code, and contents. Use this to examine codebases, understand project architecture, review implementation patterns, or search for specific functionality.",
    parameters: z.object({
      operation: z
        .enum(["clone", "analyze", "search"])
        .describe("The operation to perform"),
      repoUrl: z
        .string()
        .optional()
        .describe("Git repository URL (for clone operation)"),
      path: z
        .string()
        .optional()
        .describe("File or directory path to analyze (relative to repo root)"),
      pattern: z
        .string()
        .optional()
        .describe("Search pattern or file extension filter"),
      depth: z
        .number()
        .min(1)
        .max(10)
        .optional()
        .default(3)
        .describe("Directory traversal depth for analysis"),
    }),
    execute: async ({ operation, repoUrl, path, pattern, depth }) => {
      console.log(`Git analysis tool: ${operation}`, { repoUrl, path, pattern, depth })

      // Note: This is a mock implementation showing the interface
      // The actual implementation would use the Computer SDK

      try {
        // Check if FLY_API_TOKEN is configured
        if (!env.FLY_API_TOKEN) {
          return {
            success: false,
            operation,
            error:
              "Git analysis tool is not configured. FLY_API_TOKEN is required.",
            repoUrl,
            path,
            pattern,
          }
        }

        // Check that Computer SDK environment variables are available
        if (!env.FLY_API_TOKEN || !env.FLY_APP_NAME) {
          return {
            success: false,
            operation,
            error: "Computer SDK requires FLY_API_TOKEN and FLY_APP_NAME environment variables",
          }
        }

        // Initialize Computer SDK with Fly API token and app name
        const sdk = createLightfastComputer({
          flyApiToken: env.FLY_API_TOKEN,
          appName: env.FLY_APP_NAME,
        })

        // Get or create an instance for this session
        const instance = await getOrCreateInstance(sdk, ctx, threadId as any)

        switch (operation) {
          case "clone": {
            if (!repoUrl) {
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
            // })

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
            // })

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
            const targetPath = path || "/home/repo"

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
              args: ["-c", `cd "${targetPath}" && find . -type f -maxdepth ${depth} | head -100`],
              timeout: 15000,
            // })

            // Get file statistics
            const statsResult = await sdk.commands.execute({
              instanceId: instance.id,
              command: "bash",
              args: ["-c", `cd "${targetPath}" && du -sh . 2>/dev/null || echo "Size unknown"`],
              timeout: 10000,
            // })

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
            if (!pattern) {
              return {
                success: false,
                operation,
                error: "Search pattern is required",
              }
            }

            const searchPath = path || "/home/repo"

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
              args: ["-c", `cd "${searchPath}" && find . -name "*${pattern}*" -type f | head -50`],
              timeout: 30000,
            // })

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
                // })
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

// Helper to manage Computer instances with status tracking
async function getOrCreateInstance(
  sdk: LightfastComputerSDK,
  ctx: any,
  threadId: string,
): Promise<Instance> {
  // Check for existing running instances
  const listResult = await sdk.instances.list()

  if (listResult.isOk()) {
    const runningInstances = listResult.value.filter(
      (i) => i.status === "running",
    )
    if (runningInstances.length > 0) {
      console.log(`Using existing instance: ${runningInstances[0].id}`)
      return runningInstances[0]
    }
  }

  // Create new instance if none exist
  console.log("Creating new Computer instance...")
  
  // Update computer status to show creation
  // TODO: Re-enable once types regenerate
  // await ctx.runMutation(internal.messages.updateComputerStatus, {
  //   threadId: threadId as any,
  //   status: {
  //     isRunning: true,
  //     instanceId: undefined,
  //     currentOperation: "Creating instance",
  //     startedAt: Date.now(),
  //   },
  // })

  const createOptions: CreateInstanceOptions = {
    name: `git-analysis-${Date.now()}`,
    region: "iad", // US East (Washington DC)
    size: "shared-cpu-2x",
    memoryMb: 512,
    metadata: {
      purpose: "git-analysis",
      createdBy: "chat-app",
    },
  }

  const createResult = await sdk.instances.create(createOptions)

  if (createResult.isErr()) {
    throw new Error(`Failed to create instance: ${createResult.error.message}`)
  }

  // Wait for instance to be running
  let instance = createResult.value
  let attempts = 0
  
  // Update status with instance ID
  // TODO: Re-enable once types regenerate
  // await ctx.runMutation(internal.messages.updateComputerStatus, {
  //   threadId: threadId as any,
  //   status: {
  //     isRunning: true,
  //     instanceId: instance.id,
  //     currentOperation: "Starting instance",
  //     startedAt: Date.now(),
  //   },
  // })

  while (instance.status !== "running" && attempts < 30) {
    await new Promise((resolve) => setTimeout(resolve, 2000))
    const getResult = await sdk.instances.get(instance.id)
    if (getResult.isOk()) {
      instance = getResult.value
    }
    attempts++
  }

  if (instance.status !== "running") {
    throw new Error(`Instance failed to start: ${instance.status}`)
  }

  // Update status to show instance is ready
  // TODO: Re-enable once types regenerate
  // await ctx.runMutation(internal.messages.updateComputerOperation, {
  //   threadId: threadId as any,
  //   operation: "Instance ready",
  // })

  console.log(`Created new instance: ${instance.id}`)
  return instance
}
