"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Check, Copy } from "lucide-react"
import { useTheme } from "next-themes"
import { useState } from "react"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import {
  oneDark,
  oneLight,
} from "react-syntax-highlighter/dist/esm/styles/prism"

interface CodeBlockProps {
  code: string
  language?: string
  className?: string
}

export function CodeBlock({ code, language = "", className }: CodeBlockProps) {
  const { theme } = useTheme()
  const [copied, setCopied] = useState(false)
  // TODO: Re-enable scroll mode once overflow container issues are resolved
  // For now, we only support text wrapping to prevent overflow beyond message bounds
  // const [isWrapped, setIsWrapped] = useState(true)

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy text: ", err)
    }
  }

  // Map common language aliases to supported languages
  const normalizeLanguage = (lang: string): string => {
    const langMap: Record<string, string> = {
      js: "javascript",
      jsx: "jsx",
      ts: "typescript",
      tsx: "tsx",
      py: "python",
      rb: "ruby",
      sh: "bash",
      shell: "bash",
      zsh: "bash",
      yml: "yaml",
      md: "markdown",
      "c++": "cpp",
      rs: "rust",
    }
    return langMap[lang.toLowerCase()] || lang.toLowerCase()
  }

  const normalizedLanguage = normalizeLanguage(language)

  return (
    <div className={cn("relative group my-4 w-full", className)}>
      {/* Header with language and controls */}
      <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border border-border rounded-t-md">
        <span className="text-xs text-muted-foreground font-mono">
          {language || "text"}
        </span>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* TODO: Re-enable wrap toggle once scroll mode is properly implemented */}
          {/* <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsWrapped(!isWrapped)}
            className="h-6 w-6 p-0"
            title={isWrapped ? "Disable text wrapping" : "Enable text wrapping"}
          >
            {isWrapped ? (
              <Maximize2 className="h-3 w-3" />
            ) : (
              <WrapText className="h-3 w-3" />
            )}
          </Button> */}
          <Button
            variant="ghost"
            size="sm"
            onClick={copyToClipboard}
            className="h-6 w-6 p-0"
            title="Copy to clipboard"
          >
            {copied ? (
              <Check className="h-3 w-3" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </Button>
        </div>
      </div>

      {/* Syntax Highlighter - Text wrapping mode only */}
      {/* TODO: Re-implement horizontal scroll mode with proper container constraints */}
      <div className="border border-t-0 border-border rounded-b-md overflow-hidden">
        <div className="w-full">
          <SyntaxHighlighter
            language={normalizedLanguage}
            style={theme === "dark" ? oneDark : oneLight}
            wrapLines={true}
            wrapLongLines={true}
            customStyle={{
              margin: 0,
              padding: "12px",
              fontSize: "13px",
              fontFamily:
                "ui-monospace, SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace",
              background: "transparent",
              borderRadius: 0,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              overflowWrap: "break-word",
              width: "100%",
            }}
            codeTagProps={{
              style: {
                fontFamily:
                  "ui-monospace, SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                overflowWrap: "break-word",
                display: "block",
                width: "100%",
              },
            }}
          >
            {code}
          </SyntaxHighlighter>
        </div>
      </div>
    </div>
  )
}
