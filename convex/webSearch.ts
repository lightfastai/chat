import { getAuthUserId } from "@convex-dev/auth/server"
import { v } from "convex/values"
import Exa from "exa-js"
import { action } from "./_generated/server.js"

export const search = action({
  args: {
    query: v.string(),
    numResults: v.optional(v.number()),
    includeDomains: v.optional(v.array(v.string())),
    excludeDomains: v.optional(v.array(v.string())),
    startCrawlDate: v.optional(v.string()),
    endCrawlDate: v.optional(v.string()),
    includeText: v.optional(v.boolean()),
    textLength: v.optional(v.number()),
  },
  returns: v.object({
    success: v.boolean(),
    results: v.optional(
      v.array(
        v.object({
          id: v.string(),
          url: v.string(),
          title: v.string(),
          text: v.optional(v.string()),
          highlights: v.optional(v.array(v.string())),
          publishedDate: v.optional(v.string()),
          author: v.optional(v.string()),
          score: v.optional(v.number()),
        }),
      ),
    ),
    autopromptString: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      return {
        success: false,
        error: "User must be authenticated to perform web search",
      }
    }

    try {
      const exaApiKey = process.env.EXA_API_KEY
      if (!exaApiKey) {
        return {
          success: false,
          error: "EXA_API_KEY not configured",
        }
      }

      const exa = new Exa(exaApiKey)

      const searchOptions = {
        numResults: args.numResults || 10,
        includeDomains: args.includeDomains,
        excludeDomains: args.excludeDomains,
        startCrawlDate: args.startCrawlDate,
        endCrawlDate: args.endCrawlDate,
      } as any

      if (args.includeText) {
        searchOptions.text = {
          maxCharacters: args.textLength || 1000,
          includeHtmlTags: false,
        }
        searchOptions.highlights = {
          numSentences: 3,
          highlightsPerUrl: 2,
        }
      }

      console.log("Performing web search with query:", args.query)
      console.log("Search options:", searchOptions)

      const response = await exa.search(args.query, searchOptions)

      const results = response.results.map((result) => ({
        id: result.id,
        url: result.url,
        title: result.title || "",
        text: result.text,
        highlights: (result as any).highlights,
        publishedDate: result.publishedDate,
        author: result.author,
        score: result.score,
      }))

      console.log(`Web search completed: ${results.length} results found`)

      return {
        success: true,
        results,
        autopromptString: response.autopromptString,
      }
    } catch (error) {
      console.error("Web search error:", error)
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      }
    }
  },
})

export const findSimilar = action({
  args: {
    url: v.string(),
    numResults: v.optional(v.number()),
    includeDomains: v.optional(v.array(v.string())),
    excludeDomains: v.optional(v.array(v.string())),
    includeText: v.optional(v.boolean()),
    textLength: v.optional(v.number()),
  },
  returns: v.object({
    success: v.boolean(),
    results: v.optional(
      v.array(
        v.object({
          id: v.string(),
          url: v.string(),
          title: v.string(),
          text: v.optional(v.string()),
          highlights: v.optional(v.array(v.string())),
          publishedDate: v.optional(v.string()),
          author: v.optional(v.string()),
          score: v.optional(v.number()),
        }),
      ),
    ),
    autopromptString: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      return {
        success: false,
        error: "User must be authenticated to perform web search",
      }
    }

    try {
      const exaApiKey = process.env.EXA_API_KEY
      if (!exaApiKey) {
        return {
          success: false,
          error: "EXA_API_KEY not configured",
        }
      }

      const exa = new Exa(exaApiKey)

      const searchOptions = {
        numResults: args.numResults || 10,
        includeDomains: args.includeDomains,
        excludeDomains: args.excludeDomains,
      } as any

      if (args.includeText) {
        searchOptions.text = {
          maxCharacters: args.textLength || 1000,
          includeHtmlTags: false,
        }
        searchOptions.highlights = {
          numSentences: 3,
          highlightsPerUrl: 2,
        }
      }

      console.log("Finding similar content for URL:", args.url)
      console.log("Search options:", searchOptions)

      const response = await exa.findSimilar(args.url, searchOptions)

      const results = response.results.map((result) => ({
        id: result.id,
        url: result.url,
        title: result.title || "",
        text: result.text,
        highlights: (result as any).highlights,
        publishedDate: result.publishedDate,
        author: result.author,
        score: result.score,
      }))

      console.log(
        `Similar content search completed: ${results.length} results found`,
      )

      return {
        success: true,
        results,
        autopromptString: response.autopromptString,
      }
    } catch (error) {
      console.error("Similar content search error:", error)
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      }
    }
  },
})

export const getContents = action({
  args: {
    urls: v.array(v.string()),
    textLength: v.optional(v.number()),
  },
  returns: v.object({
    success: v.boolean(),
    results: v.optional(
      v.array(
        v.object({
          id: v.string(),
          url: v.string(),
          title: v.string(),
          text: v.optional(v.string()),
          highlights: v.optional(v.array(v.string())),
          publishedDate: v.optional(v.string()),
          author: v.optional(v.string()),
        }),
      ),
    ),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      return {
        success: false,
        error: "User must be authenticated to get content",
      }
    }

    try {
      const exaApiKey = process.env.EXA_API_KEY
      if (!exaApiKey) {
        return {
          success: false,
          error: "EXA_API_KEY not configured",
        }
      }

      const exa = new Exa(exaApiKey)

      const contentOptions = {
        text: {
          maxCharacters: args.textLength || 2000,
          includeHtmlTags: false,
        },
        highlights: {
          numSentences: 3,
          highlightsPerUrl: 2,
        },
      } as any

      console.log("Getting content for URLs:", args.urls)
      console.log("Content options:", contentOptions)

      const response = await exa.getContents(args.urls, contentOptions)

      const results = response.results.map((result) => ({
        id: result.id,
        url: result.url,
        title: result.title || "",
        text: result.text,
        highlights: (result as any).highlights,
        publishedDate: result.publishedDate,
        author: result.author,
      }))

      console.log(
        `Content retrieval completed: ${results.length} results processed`,
      )

      return {
        success: true,
        results,
      }
    } catch (error) {
      console.error("Content retrieval error:", error)
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      }
    }
  },
})
