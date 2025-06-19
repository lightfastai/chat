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
  readonly?: boolean
}

export function CodeBlock({ code, language = "", className }: CodeBlockProps) {
  const { theme } = useTheme()
  const [copied, setCopied] = useState(false)

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
    <div className={cn("relative group my-4", className)}>
      {/* Header with language and copy button */}
      <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border border-border rounded-t-md">
        <span className="text-xs text-muted-foreground font-mono">
          {language || "text"}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={copyToClipboard}
          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          {copied ? (
            <Check className="h-3 w-3" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
        </Button>
      </div>

      {/* Syntax Highlighter */}
      <div className="border border-t-0 border-border rounded-b-md overflow-hidden">
        <SyntaxHighlighter
          language={normalizedLanguage}
          style={theme === "dark" ? oneDark : oneLight}
          customStyle={{
            margin: 0,
            padding: "12px",
            fontSize: "13px",
            fontFamily:
              "ui-monospace, SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace",
            background: "transparent",
            borderRadius: 0,
          }}
          codeTagProps={{
            style: {
              fontFamily:
                "ui-monospace, SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace",
            },
          }}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  )
}
