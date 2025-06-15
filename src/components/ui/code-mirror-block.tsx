"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { basicSetup } from "@codemirror/basic-setup"
import { css } from "@codemirror/lang-css"
import { html } from "@codemirror/lang-html"
import { javascript } from "@codemirror/lang-javascript"
import { json } from "@codemirror/lang-json"
import { markdown } from "@codemirror/lang-markdown"
import { python } from "@codemirror/lang-python"
import { EditorState } from "@codemirror/state"
import { oneDark } from "@codemirror/theme-one-dark"
import { EditorView } from "@codemirror/view"
import { Check, Copy } from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useRef, useState } from "react"

// Language map for detecting the appropriate language extension
const languageMap = {
  javascript: javascript,
  js: javascript,
  jsx: javascript,
  typescript: javascript,
  ts: javascript,
  tsx: javascript,
  python: python,
  py: python,
  html: html,
  css: css,
  json: json,
  markdown: markdown,
  md: markdown,
  text: () => [],
  txt: () => [],
  bash: () => [],
  shell: () => [],
  sh: () => [],
}

type Language = keyof typeof languageMap

interface CodeMirrorBlockProps {
  code: string
  language?: string
  className?: string
  showCopyButton?: boolean
}

export function CodeMirrorBlock({
  code,
  language = "text",
  className,
  showCopyButton = true,
}: CodeMirrorBlockProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const { theme, systemTheme } = useTheme()
  const [copied, setCopied] = useState(false)

  // Determine if we should use dark theme
  const isDark =
    theme === "dark" || (theme === "system" && systemTheme === "dark")

  // Get the language extension
  const getLanguageExtension = (lang: string) => {
    const normalizedLang = lang.toLowerCase() as Language
    const langExtension = languageMap[normalizedLang]
    return langExtension ? langExtension() : []
  }

  // Copy to clipboard functionality
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy text: ", err)
    }
  }

  useEffect(() => {
    if (!editorRef.current) return

    // Clean up existing editor
    if (viewRef.current) {
      viewRef.current.destroy()
    }

    // Create extensions array
    const extensions = [
      basicSetup,
      getLanguageExtension(language),
      EditorView.theme({
        "&": {
          fontSize: "0.875rem",
          fontFamily:
            "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        },
        ".cm-editor": {
          borderRadius: "0.375rem",
        },
        ".cm-scroller": {
          fontFamily: "inherit",
        },
        ".cm-focused": {
          outline: "none",
        },
      }),
      EditorView.editable.of(false), // Make read-only
    ]

    // Add dark theme if needed
    if (isDark) {
      extensions.push(oneDark)
    }

    // Create editor state
    const state = EditorState.create({
      doc: code,
      extensions,
    })

    // Create editor view
    const view = new EditorView({
      state,
      parent: editorRef.current,
    })

    viewRef.current = view

    return () => {
      view.destroy()
    }
  }, [code, language, isDark])

  return (
    <div className={cn("relative group", className)}>
      {showCopyButton && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
          onClick={copyToClipboard}
        >
          {copied ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      )}
      <div
        ref={editorRef}
        className={cn(
          "overflow-hidden rounded-md border border-border",
          "bg-background", // Light theme background
          isDark && "bg-[#263238]", // Dark theme background to match oneDark
        )}
      />
    </div>
  )
}
