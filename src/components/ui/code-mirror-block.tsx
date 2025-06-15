"use client"

import "./codemirror.css"
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
import { Check, Copy } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { basicSetup } from "codemirror"

// Simplified for testing - will expand later

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

  // Debug what we're receiving
  console.log("CodeMirrorBlock received:", {
    language,
    codeLength: code.length,
    codePreview: code.substring(0, 50) + (code.length > 50 ? "..." : "")
  })

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

    // Test with exact Vercel pattern - hardcode javascript for now
    let extensions
    
    if (language === "javascript" || language === "js") {
      extensions = [basicSetup, javascript(), oneDark]
      console.log("Using JavaScript highlighting")
    } else if (language === "python" || language === "py") {
      extensions = [basicSetup, python(), oneDark]
      console.log("Using Python highlighting")
    } else {
      extensions = [basicSetup, oneDark]
      console.log("Using plain text (no language extension)")
    }
    
    // Add our custom settings
    extensions.push(
      EditorView.theme({
        "&": {
          fontSize: "0.875rem",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        },
        ".cm-focused": {
          outline: "none",
        },
      }),
      EditorView.editable.of(false)
    )
    
    console.log("Final extensions:", extensions)

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
  }, [code, language])

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
          "codemirror-container", // CSS class for theme integration
        )}
      />
    </div>
  )
}
