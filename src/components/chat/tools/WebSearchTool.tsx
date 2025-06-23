"use client"

import { ExternalLink, Loader2, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ToolInvocationPart } from "./ToolInvocation"

export interface WebSearchToolProps {
  part: ToolInvocationPart
}

interface SearchResult {
  title: string
  url: string
  snippet?: string
  score?: number
}

export function WebSearchTool({ part }: WebSearchToolProps) {
  const isLoading = part.state === "partial-call" || part.state === "call"
  const hasError = part.state === "error"
  const searchQuery = part.args?.query as string | undefined

  // Extract search results from the tool result
  const searchResults = part.result?.results as SearchResult[] | undefined

  return (
    <div
      className={cn(
        "my-3 rounded-lg border p-4",
        isLoading && "border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20",
        hasError && "border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20",
        !isLoading && !hasError && "border-border bg-muted/30"
      )}
    >
      <div className="flex items-center gap-2">
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
        ) : hasError ? (
          <Search className="h-4 w-4 text-red-500" />
        ) : (
          <Search className="h-4 w-4 text-green-500" />
        )}
        <span className="text-sm font-medium">
          {isLoading
            ? "Searching the web..."
            : hasError
            ? "Search failed"
            : "Web Search Results"}
        </span>
      </div>

      {searchQuery && (
        <p className="mt-2 text-sm text-muted-foreground">
          Query: "{searchQuery}"
        </p>
      )}

      {hasError && part.error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">
          {part.error}
        </p>
      )}

      {searchResults && searchResults.length > 0 && (
        <div className="mt-3 space-y-3">
          {searchResults.map((result, index) => (
            <div
              key={index}
              className="rounded-md border border-border/50 bg-background/50 p-3"
            >
              <a
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-start gap-2"
              >
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-blue-600 group-hover:underline dark:text-blue-400">
                    {result.title}
                  </h4>
                  {result.snippet && (
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                      {result.snippet}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground/70">
                    {new URL(result.url).hostname}
                  </p>
                </div>
                <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground/50" />
              </a>
            </div>
          ))}
        </div>
      )}

      {searchResults && searchResults.length === 0 && (
        <p className="mt-3 text-sm text-muted-foreground">
          No results found.
        </p>
      )}
    </div>
  )
}