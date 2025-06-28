/**
 * Utility functions for preprocessing user messages before storage/display
 */

/**
 * Detects if text contains code that should be wrapped in markdown code blocks
 */
function detectCodeContent(text: string): boolean {
  const lines = text.split("\n")

  // Skip if already has markdown code blocks
  if (text.includes("```")) {
    return false
  }

  // Must have multiple lines (at least 3 lines for code block treatment)
  if (lines.length < 3) {
    return false
  }

  // Count lines that look like code
  let codeLines = 0
  const totalLines = lines.filter((line) => line.trim().length > 0).length

  // If less than 3 non-empty lines, don't treat as code
  if (totalLines < 3) {
    return false
  }

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.length === 0) continue

    // Code indicators
    const hasIndentation = line.startsWith("  ") || line.startsWith("\t")
    const hasCodeSymbols = /[{}();=><]/.test(trimmed)
    const hasImport = /^(import|from|export|#include|require\()/i.test(trimmed)
    const hasFunction =
      /^(function|def |class |public |private |const |let |var )/i.test(trimmed)
    const hasHtmlTags = /<[^>]+>/.test(trimmed)
    const hasCodeKeywords =
      /\b(if|else|for|while|return|async|await|try|catch|throw)\b/.test(trimmed)

    if (
      hasIndentation ||
      hasCodeSymbols ||
      hasImport ||
      hasFunction ||
      hasHtmlTags ||
      hasCodeKeywords
    ) {
      codeLines++
    }
  }

  // If 60% or more lines look like code, treat as code block
  return codeLines / totalLines >= 0.6
}

/**
 * Attempts to detect the programming language from code content
 */
function detectLanguage(text: string): string {
  const lowercaseText = text.toLowerCase()

  // JavaScript/TypeScript
  if (
    lowercaseText.includes("import ") ||
    lowercaseText.includes("export ") ||
    lowercaseText.includes("const ") ||
    lowercaseText.includes("let ") ||
    lowercaseText.includes("function") ||
    lowercaseText.includes("=>")
  ) {
    if (
      lowercaseText.includes("interface ") ||
      lowercaseText.includes("type ") ||
      (text.includes(":") && text.includes("{"))
    ) {
      return "typescript"
    }
    return "javascript"
  }

  // Python
  if (
    lowercaseText.includes("def ") ||
    lowercaseText.includes("import ") ||
    lowercaseText.includes("from ") ||
    lowercaseText.includes("class ") ||
    lowercaseText.includes("print(")
  ) {
    return "python"
  }

  // Java
  if (
    lowercaseText.includes("public class") ||
    lowercaseText.includes("private ") ||
    lowercaseText.includes("public static void main")
  ) {
    return "java"
  }

  // C/C++
  if (
    lowercaseText.includes("#include") ||
    lowercaseText.includes("int main") ||
    lowercaseText.includes("printf") ||
    lowercaseText.includes("iostream")
  ) {
    return "cpp"
  }

  // HTML
  if (
    lowercaseText.includes("<html") ||
    lowercaseText.includes("<!doctype") ||
    (lowercaseText.includes("<div") && lowercaseText.includes("</div>"))
  ) {
    return "html"
  }

  // CSS
  if (
    text.includes("{") &&
    text.includes("}") &&
    text.includes(":") &&
    /\.([\w-]+)\s*{/.test(text)
  ) {
    return "css"
  }

  // JSON
  if (
    (text.trim().startsWith("{") && text.trim().endsWith("}")) ||
    (text.trim().startsWith("[") && text.trim().endsWith("]"))
  ) {
    try {
      JSON.parse(text.trim())
      return "json"
    } catch {
      // Not valid JSON
    }
  }

  // SQL
  if (
    /\b(select|insert|update|delete|create|alter|drop)\b/i.test(lowercaseText)
  ) {
    return "sql"
  }

  // Shell/Bash
  if (
    lowercaseText.includes("#!/bin/bash") ||
    lowercaseText.includes("npm ") ||
    lowercaseText.includes("yarn ") ||
    text.includes("$ ")
  ) {
    return "bash"
  }

  // Default to no language specification
  return ""
}

/**
 * Preprocesses user message text to automatically wrap code blocks
 */
export function preprocessUserMessage(text: string): string {
  const trimmed = text.trim()

  // Don't process if empty or already has code blocks
  if (!trimmed || trimmed.includes("```")) {
    return text
  }

  // Check if this looks like code content
  if (detectCodeContent(trimmed)) {
    const language = detectLanguage(trimmed)
    const langSuffix = language ? language : ""

    return `\`\`\`${langSuffix}\n${trimmed}\n\`\`\``
  }

  return text
}
