"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { css } from "@codemirror/lang-css"
import { html } from "@codemirror/lang-html"
import { javascript } from "@codemirror/lang-javascript"
import { json } from "@codemirror/lang-json"
import { markdown } from "@codemirror/lang-markdown"
import { python } from "@codemirror/lang-python"
import { EditorState } from "@codemirror/state"
import { oneDark } from "@codemirror/theme-one-dark"
import { EditorView } from "@codemirror/view"
import { basicSetup } from "codemirror"
import { Check, Copy } from "lucide-react"
import { useEffect, useRef, useState } from "react"

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
  const [copied, setCopied] = useState(false)

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

    if (!editorRef.current) {
      return
    }

    let view: EditorView | undefined
    try {
      // Vercel's approach: clean extension array
      const extensions = [basicSetup]

      // Add language extension based on detected language
      switch (language.toLowerCase()) {
        case "javascript":
        case "js":
        case "jsx":
        case "typescript":
        case "ts":
        case "tsx":
          extensions.push(javascript({ jsx: true, typescript: true }))
          break
        case "python":
        case "py":
          extensions.push(python())
          break
        case "css":
          extensions.push(css())
          break
        case "html":
          extensions.push(html())
          break
        case "json":
          extensions.push(json())
          break
        case "markdown":
        case "md":
          extensions.push(markdown())
          break
        // Add more languages as needed
      }

      // Add theme last
      extensions.push(oneDark)

      const startState = EditorState.create({
        doc: code,
        extensions: extensions,
      })

      view = new EditorView({
        state: startState,
        parent: editorRef.current,
      })

      viewRef.current = view
    } catch (error) {
      console.error("Error creating view:", error)
      return
    }

    return () => {
      if (view) {
        view.destroy()
      }
    }
  }, [code, language])

  return (
    <div className={cn("relative group not-prose", className)}>
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
        className="relative w-full text-sm overflow-hidden rounded-md border border-border"
      />
    </div>
  )
}
