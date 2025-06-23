import { tool } from "ai"
import { z } from "zod"

/**
 * GitHub API tool to verify repository existence and get basic information
 * This helps validate repositories before attempting to clone them
 */
export function createGitHubAPITool() {
  return tool({
    description:
      "Verify GitHub repository existence and get repository information using GitHub's public API. Use this before attempting to clone repositories.",
    parameters: z.object({
      owner: z.string().describe("Repository owner (username or organization)"),
      repo: z.string().describe("Repository name"),
    }),
    execute: async ({ owner, repo }) => {
      try {
        // Use GitHub's public API to verify repository existence
        const url = `https://api.github.com/repos/${owner}/${repo}`

        const response = await fetch(url, {
          headers: {
            Accept: "application/vnd.github.v3+json",
            "User-Agent": "lightfast-chat-app",
          },
        })

        if (!response.ok) {
          if (response.status === 404) {
            return {
              success: false,
              exists: false,
              error: `Repository ${owner}/${repo} not found or is private`,
              statusCode: 404,
            }
          }

          return {
            success: false,
            exists: false,
            error: `GitHub API error: ${response.status} ${response.statusText}`,
            statusCode: response.status,
          }
        }

        const repoData = await response.json()

        return {
          success: true,
          exists: true,
          repository: {
            name: repoData.name,
            fullName: repoData.full_name,
            description: repoData.description,
            language: repoData.language,
            size: repoData.size, // in KB
            stars: repoData.stargazers_count,
            forks: repoData.forks_count,
            isPrivate: repoData.private,
            cloneUrl: repoData.clone_url,
            htmlUrl: repoData.html_url,
            defaultBranch: repoData.default_branch,
            topics: repoData.topics || [],
            license: repoData.license?.name || null,
            createdAt: repoData.created_at,
            updatedAt: repoData.updated_at,
            hasIssues: repoData.has_issues,
            hasWiki: repoData.has_wiki,
            hasPages: repoData.has_pages,
          },
          message: `Repository ${owner}/${repo} exists and is accessible`,
        }
      } catch (error) {
        console.error("GitHub API tool error:", error)
        return {
          success: false,
          exists: false,
          error:
            error instanceof Error ? error.message : "Unknown error occurred",
        }
      }
    },
  })
}
