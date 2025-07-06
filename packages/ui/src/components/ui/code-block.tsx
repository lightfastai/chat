"use client";

import { Check, Copy } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
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
			themes: ["github-light", "github-dark"],
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
				"plaintext",
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

export function CodeBlock({ code, language = "", className }: CodeBlockProps) {
	const { theme } = useTheme();
	const [copied, setCopied] = useState(false);
	const [highlightedCode, setHighlightedCode] = useState<string>(
		`<pre><code>${code}</code></pre>`,
	);
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
		};
		return langMap[lang.toLowerCase()] || lang.toLowerCase();
	};

	const normalizedLanguage = normalizeLanguage(language) as BundledLanguage;

	// Shiki highlighting effect
	useEffect(() => {
		let isMounted = true;

		async function highlightCode() {
			try {
				const highlighter = await getHighlighter();

				if (!isMounted) return;

				const currentTheme = theme === "dark" ? "github-dark" : "github-light";
				const langToUse = normalizedLanguage || "plaintext";

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
					const highlighted = highlighter.codeToHtml(code, {
						lang: "plaintext",
						theme: currentTheme as BundledTheme,
					});
					if (isMounted) {
						setHighlightedCode(highlighted);
					}
				}
			} catch (error) {
				console.error("Failed to highlight code:", error);
				if (isMounted) {
					setHighlightedCode(`<pre><code>${code}</code></pre>`);
				}
			}
		}

		highlightCode();

		return () => {
			isMounted = false;
		};
	}, [code, theme, normalizedLanguage]);

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

			{/* Shiki Syntax Highlighter - Text wrapping mode only */}
			{/* TODO: Re-implement horizontal scroll mode with proper container constraints */}
			<div className="border border-t-0 border-border rounded-b-md overflow-hidden">
				<div className="w-full">
					<div
						className="[&>pre]:!m-0 [&>pre]:!p-3 [&>pre]:!bg-transparent [&>pre]:!border-none [&>pre]:!rounded-none [&>pre]:text-sm [&>pre]:leading-relaxed [&>pre]:whitespace-pre-wrap [&>pre]:break-words [&>pre]:overflow-wrap-anywhere [&_code]:whitespace-pre-wrap [&_code]:break-words [&_code]:overflow-wrap-anywhere [&_code]:font-mono"
						// biome-ignore lint/security/noDangerouslySetInnerHtml: Shiki output is safe
						dangerouslySetInnerHTML={{ __html: highlightedCode }}
					/>
				</div>
			</div>
		</div>
	);
}
