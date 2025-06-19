"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { css } from "@codemirror/lang-css"
import { html } from "@codemirror/lang-html"
import { javascript } from "@codemirror/lang-javascript"
import { json } from "@codemirror/lang-json"
import { python } from "@codemirror/lang-python"
import { EditorState } from "@codemirror/state"
import { oneDark } from "@codemirror/theme-one-dark"
import { EditorView } from "@codemirror/view"
import { Check, Copy } from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useRef, useState } from "react"

// Language mapping for syntax highlighting
const languageMap = {
  javascript: javascript(),
  js: javascript(),
  jsx: javascript({ jsx: true }),
  typescript: javascript({ typescript: true }),
  ts: javascript({ typescript: true }),
  tsx: javascript({ typescript: true, jsx: true }),
  python: python(),
  py: python(),
  css: css(),
  html: html(),
  json: json(),
}

interface CodeBlockProps {
  code: string
  language?: string
  className?: string
  readonly?: boolean
}

export function CodeBlock({
  code,
  language = "",
  className,
  readonly = true,
}: CodeBlockProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const { theme } = useTheme()
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!editorRef.current) return

    // Clean up existing editor
    if (viewRef.current) {
      viewRef.current.destroy()
    }

    // Get language extension
    const langExtension = language
      ? languageMap[language.toLowerCase() as keyof typeof languageMap]
      : undefined

    // Create extensions array
    const extensions = []

    if (langExtension) {
      extensions.push(langExtension)
    }

    if (theme === "dark") {
      extensions.push(oneDark)
    }

    // Create editor state
    const state = EditorState.create({
      doc: code,
      extensions: [
        ...extensions,
        EditorView.theme({
          "&": {
            fontSize: "13px",
            fontFamily:
              "ui-monospace, SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace",
          },
          ".cm-content": {
            padding: "12px",
            minHeight: "auto",
          },
          ".cm-focused": {
            outline: "none",
          },
          ".cm-editor": {
            borderRadius: "6px",
          },
          ".cm-scroller": {
            overflow: "auto",
          },
        }),
        EditorView.lineWrapping,
        EditorState.readOnly.of(readonly),
      ],
    })

    // Create editor view
    viewRef.current = new EditorView({
      state,
      parent: editorRef.current,
    })

    return () => {
      if (viewRef.current) {
        viewRef.current.destroy()
        viewRef.current = null
      }
    }
  }, [code, language, theme, readonly])

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy text: ", err)
    }
  }

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

      {/* CodeMirror editor */}
      <div
        ref={editorRef}
        className="border border-t-0 border-border rounded-b-md overflow-hidden bg-background"
      />
    </div>
  )
}
