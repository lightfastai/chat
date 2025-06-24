"use client"

import { cn } from "@/lib/utils"
import { ExternalLink, Loader2, Search } from "lucide-react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
export interface WebSearchToolProps {
  toolInvocation: {
    state: "partial-call" | "call" | "result" | "error"
    toolCallId: string
    toolName: string
    args?: any
    result?: any
    error?: string
  }
}

interface SearchResult {
  title: string
  url: string
  snippet?: string
  score?: number
}

export function WebSearchTool({ toolInvocation }: WebSearchToolProps) {
  const isLoading =
    toolInvocation.state === "partial-call" || toolInvocation.state === "call"
  const hasError = toolInvocation.state === "error"
  const searchQuery = toolInvocation.args?.query as string | undefined

  // Extract search results from the tool result
  const searchResults = toolInvocation.result?.results as
    | SearchResult[]
    | undefined

  const resultCount = searchResults?.length || 0
  const accordionValue = `search-${toolInvocation.toolCallId}`

  return (
    <div className="my-2 border rounded-lg p-4">
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value={accordionValue}>
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
              ) : hasError ? (
                <Search className="h-4 w-4 text-red-500" />
              ) : (
                <Search className="h-4 w-4 text-green-500" />
              )}
              <div className="text-left">
                <div className="font-medium">
                  {isLoading
                    ? "Searching the web..."
                    : hasError
                      ? "Search failed"
                      : `Web Search Results (${resultCount})`}
                </div>
                {searchQuery && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Query: "{searchQuery}"
                  </p>
                )}
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            {hasError && toolInvocation.error && (
              <p className="text-sm text-red-600 dark:text-red-400 mb-3">
                {toolInvocation.error}
              </p>
            )}

            {searchResults && searchResults.length > 0 && (
              <div className="divide-y">
                {searchResults.map((result, index) => {
                  if (!result) return null
                  return (
                    <div key={index} className="py-3 first:pt-0 last:pb-0">
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
                  )
                })}
              </div>
            )}

            {searchResults && searchResults.length === 0 && (
              <p className="text-sm text-muted-foreground">No results found.</p>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}

