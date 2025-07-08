"use client";

import { Check, Copy } from "lucide-react";
import { memo, useEffect, useState } from "react";
import {
  type BundledLanguage,
  type BundledTheme,
  type Highlighter,
  createHighlighter,
} from "shiki";
import { cn } from "../../lib/utils";
import { Button } from "./button";

// Shared highlighter instance to avoid recreating it
let sharedHighlighter: Highlighter | null = null;
let highlighterPromise: Promise<Highlighter> | null = null;

const getHighlighter = async (): Promise<Highlighter> => {
	if (sharedHighlighter) {
		return sharedHighlighter;
	}

	if (!highlighterPromise) {
		highlighterPromise = createHighlighter({
			themes: ["github-dark-default"],
			langs: [
				"javascript",
				"typescript",
				"jsx",
				"tsx",
				"python",
				"bash",
				"json",
				"markdown",
				"css",
				"html",
				"yaml",
				"sql",
				"rust",
				"go",
				"java",
				"cpp",
				"c",
				"php",
				"ruby",
				"xml",
				"haskell",
			],
		});
	}

	sharedHighlighter = await highlighterPromise;
	return sharedHighlighter;
};

interface CodeBlockProps {
	code: string;
	language?: string;
	className?: string;
}

// Map common language aliases to supported languages
const normalizeLanguage = (lang: string): string => {
	if (!lang) return "";

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
		hs: "haskell",
		text: "text",
		plaintext: "text",
	};
	return langMap[lang.toLowerCase()] || lang.toLowerCase();
};

function CodeBlockComponent({
	code,
	language = "",
	className,
}: CodeBlockProps) {
	const [copied, setCopied] = useState(false);
	const [highlightedCode, setHighlightedCode] = useState<string | null>(null);
	// TODO: Re-enable scroll mode once overflow container issues are resolved
	// For now, we only support text wrapping to prevent overflow beyond message bounds
	// const [isWrapped, setIsWrapped] = useState(true)

	const copyToClipboard = async () => {
		try {
			await navigator.clipboard.writeText(code);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch (err) {
			console.error("Failed to copy text: ", err);
		}
	};

	const normalizedLanguage = normalizeLanguage(language);

	// Shiki highlighting effect
	useEffect(() => {
		let isMounted = true;

		async function highlightCode() {
			try {
				const highlighter = await getHighlighter();

				if (!isMounted) return;

				const currentTheme = "github-dark-default";
				const langToUse = normalizedLanguage || "text";

				// Handle plaintext/text specially
				if (!normalizedLanguage || langToUse === "text") {
					const escapedCode = code
						.replace(/&/g, "&amp;")
						.replace(/</g, "&lt;")
						.replace(/>/g, "&gt;")
						.replace(/"/g, "&quot;")
						.replace(/'/g, "&#39;");

					const html = `<pre class="shiki ${currentTheme}"><code>${escapedCode}</code></pre>`;
					if (isMounted) {
						setHighlightedCode(html);
					}
					return;
				}

				try {
					const highlighted = highlighter.codeToHtml(code, {
						lang: langToUse as BundledLanguage,
						theme: currentTheme as BundledTheme,
					});
					if (isMounted) {
						setHighlightedCode(highlighted);
					}
				} catch (langError) {
					// Fallback to plaintext if language is not supported
					const escapedCode = code
						.replace(/&/g, "&amp;")
						.replace(/</g, "&lt;")
						.replace(/>/g, "&gt;")
						.replace(/"/g, "&quot;")
						.replace(/'/g, "&#39;");

					const html = `<pre class="shiki ${currentTheme}"><code>${escapedCode}</code></pre>`;
					if (isMounted) {
						setHighlightedCode(html);
					}
				}
			} catch (error) {
				console.error("Failed to highlight code:", error);
				// Don't set highlightedCode on error, keep showing plain code
			}
		}

		highlightCode();

		return () => {
			isMounted = false;
		};
	}, [code, normalizedLanguage]);

	return (
		<div className={cn("relative group my-4 w-full", className)}>
			{/* Header with language and controls */}
			<div className="flex items-center justify-between px-3 py-2 border-l border-r border-t border-border rounded-t-md">
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

			{/* Code content - show immediately, apply syntax highlighting when ready */}
			<div className="border border-t-0 border-border rounded-b-md overflow-hidden">
				<div className="w-full">
					{highlightedCode ? (
						<div
							className="[&>pre]:!m-0 [&>pre]:!p-3 [&>pre]:!bg-transparent [&>pre]:!border-none [&>pre]:!rounded-none [&>pre]:text-sm [&>pre]:leading-relaxed [&>pre]:whitespace-pre-wrap [&>pre]:break-words [&>pre]:overflow-wrap-anywhere [&_code]:whitespace-pre-wrap [&_code]:break-words [&_code]:overflow-wrap-anywhere [&_code]:font-mono animate-in fade-in duration-150"
							// biome-ignore lint/security/noDangerouslySetInnerHtml: Shiki output is safe
							dangerouslySetInnerHTML={{ __html: highlightedCode }}
						/>
					) : (
						<pre className="m-0 p-3 bg-transparent border-none rounded-none text-sm leading-relaxed whitespace-pre-wrap break-words overflow-wrap-anywhere">
							<code className="whitespace-pre-wrap break-words overflow-wrap-anywhere font-mono text-foreground/80">
								{code}
							</code>
						</pre>
					)}
				</div>
			</div>
		</div>
	);
}

// Memoize the component to prevent unnecessary re-renders
// Only re-render if code, language, or className changes
export const CodeBlock = memo(CodeBlockComponent, (prevProps, nextProps) => {
	return (
		prevProps.code === nextProps.code &&
		prevProps.language === nextProps.language &&
		prevProps.className === nextProps.className
	);
});
