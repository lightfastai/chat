"use client"

import { cn } from "@/lib/utils"
import { memo } from "react"
import ReactMarkdown, { type Components } from "react-markdown"
import remarkGfm from "remark-gfm"

// Properly typed component props based on react-markdown's actual types
type MarkdownComponentProps = React.HTMLAttributes<HTMLElement> & {
  node?: unknown // Using unknown instead of any for better type safety
  children?: React.ReactNode
}

// Code component specific props
interface CodeComponentProps extends MarkdownComponentProps {
  inline?: boolean
}

/**
 * Custom components for react-markdown with Next.js optimizations
 * All components are properly typed and styled with Tailwind CSS
 */
const components: Partial<Components> = {
  // Code components - handles both inline and block code
  code({ inline, className, children, ...props }: CodeComponentProps) {
    // Inline code styling
    if (inline) {
      return (
        <code
          className={cn(
            "bg-muted/50 rounded-md px-1 py-0.5 text-xs font-mono",
            className,
          )}
          {...props}
        >
          {children}
        </code>
      )
    }
    // This shouldn't be reached for code blocks (handled by pre)
    return (
      <code className={className} {...props}>
        {children}
      </code>
    )
  },

  // Pre component for code blocks
  pre({ children, className, ...props }: MarkdownComponentProps) {
    return (
      <div className="flex flex-col my-4">
        <pre
          className={cn(
            "text-foreground bg-muted/50 dark:bg-muted/20 border border-border",
            "w-full overflow-x-auto rounded-md p-3",
            "text-xs font-mono leading-relaxed",
            className,
          )}
          {...props}
        >
          {children}
        </pre>
      </div>
    )
  },

  // Typography components
  strong({ children, ...props }: MarkdownComponentProps) {
    return (
      <strong className="font-semibold" {...props}>
        {children}
      </strong>
    )
  },

  em({ children, ...props }: MarkdownComponentProps) {
    return (
      <em className="italic" {...props}>
        {children}
      </em>
    )
  },

  // Link component with Next.js best practices
  a({ href, children, ...props }: MarkdownComponentProps & { href?: string }) {
    const isExternal = href?.startsWith("http")
    return (
      <a
        href={href}
        className="text-blue-500 hover:text-blue-600 underline underline-offset-2 transition-colors"
        target={isExternal ? "_blank" : undefined}
        rel={isExternal ? "noopener noreferrer" : undefined}
        {...props}
      >
        {children}
      </a>
    )
  },

  // Heading components with consistent styling
  h1({ children, ...props }: MarkdownComponentProps) {
    return (
      <h1
        className="scroll-m-20 text-2xl font-bold tracking-tight mb-4 mt-6 first:mt-0"
        {...props}
      >
        {children}
      </h1>
    )
  },

  h2({ children, ...props }: MarkdownComponentProps) {
    return (
      <h2
        className="scroll-m-20 text-xl font-semibold tracking-tight mb-3 mt-5"
        {...props}
      >
        {children}
      </h2>
    )
  },

  h3({ children, ...props }: MarkdownComponentProps) {
    return (
      <h3
        className="scroll-m-20 text-lg font-semibold tracking-tight mb-2 mt-4"
        {...props}
      >
        {children}
      </h3>
    )
  },

  h4({ children, ...props }: MarkdownComponentProps) {
    return (
      <h4
        className="scroll-m-20 text-base font-semibold tracking-tight mb-2 mt-3"
        {...props}
      >
        {children}
      </h4>
    )
  },

  h5({ children, ...props }: MarkdownComponentProps) {
    return (
      <h5
        className="scroll-m-20 text-sm font-semibold tracking-tight mb-1 mt-2"
        {...props}
      >
        {children}
      </h5>
    )
  },

  h6({ children, ...props }: MarkdownComponentProps) {
    return (
      <h6
        className="scroll-m-20 text-xs font-semibold tracking-tight mb-1 mt-2"
        {...props}
      >
        {children}
      </h6>
    )
  },

  // Paragraph with proper spacing
  p({ children, ...props }: MarkdownComponentProps) {
    return (
      <p
        className="leading-7 [&:not(:first-child)]:mt-3 break-words"
        {...props}
      >
        {children}
      </p>
    )
  },

  // List components
  ul({ className, children, ...props }: MarkdownComponentProps) {
    return (
      <ul
        className={cn("my-3 ml-6 list-disc [&>li]:mt-1", className)}
        {...props}
      >
        {children}
      </ul>
    )
  },

  ol({ className, children, ...props }: MarkdownComponentProps) {
    return (
      <ol
        className={cn("my-3 ml-6 list-decimal [&>li]:mt-1", className)}
        {...props}
      >
        {children}
      </ol>
    )
  },

  li({ className, children, ...props }: MarkdownComponentProps) {
    return (
      <li className={cn("leading-7 break-words", className)} {...props}>
        {children}
      </li>
    )
  },

  // Horizontal rule
  hr({ ...props }: MarkdownComponentProps) {
    return <hr className="my-6 border-border" {...props} />
  },

  // Blockquote
  blockquote({ className, children, ...props }: MarkdownComponentProps) {
    return (
      <blockquote
        className={cn(
          "mt-3 border-l-4 border-border pl-4 italic text-muted-foreground",
          className,
        )}
        {...props}
      >
        {children}
      </blockquote>
    )
  },

  // Table components with better styling
  table({ className, children, ...props }: MarkdownComponentProps) {
    return (
      <div className="my-3 w-full overflow-y-auto">
        <table className={cn("w-full border-collapse", className)} {...props}>
          {children}
        </table>
      </div>
    )
  },

  thead({ className, children, ...props }: MarkdownComponentProps) {
    return (
      <thead className={cn("border-b", className)} {...props}>
        {children}
      </thead>
    )
  },

  tbody({ className, children, ...props }: MarkdownComponentProps) {
    return (
      <tbody className={cn("[&_tr:last-child]:border-0", className)} {...props}>
        {children}
      </tbody>
    )
  },

  tr({ className, children, ...props }: MarkdownComponentProps) {
    return (
      <tr
        className={cn(
          "border-b transition-colors hover:bg-muted/50",
          className,
        )}
        {...props}
      >
        {children}
      </tr>
    )
  },

  th({ className, children, ...props }: MarkdownComponentProps) {
    return (
      <th
        className={cn(
          "h-10 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0",
          className,
        )}
        {...props}
      >
        {children}
      </th>
    )
  },

  td({ className, children, ...props }: MarkdownComponentProps) {
    return (
      <td
        className={cn(
          "p-2 align-middle [&:has([role=checkbox])]:pr-0 break-words",
          className,
        )}
        {...props}
      >
        {children}
      </td>
    )
  },
}

// Configure remark plugins
const remarkPlugins = [remarkGfm]

// Props for the Markdown component
export interface MarkdownProps {
  children: string
  className?: string
}

/**
 * Non-memoized Markdown component
 * Renders markdown content with custom styling
 */
const NonMemoizedMarkdown = ({ children, className }: MarkdownProps) => {
  return (
    <div className={cn("w-full break-words", className)}>
      <ReactMarkdown remarkPlugins={remarkPlugins} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  )
}

/**
 * Memoized Markdown component for better performance
 * Only re-renders when the markdown content changes
 */
export const Markdown = memo(
  NonMemoizedMarkdown,
  (prevProps, nextProps) => prevProps.children === nextProps.children,
)

// Export the non-memoized version for cases where memoization isn't needed
export { NonMemoizedMarkdown }
