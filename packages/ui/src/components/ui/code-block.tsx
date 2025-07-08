"use client";

import { Check, Copy } from "lucide-react";
import { memo, useEffect, useState } from "react";
import { cn } from "../../lib/utils";
import { Button } from "./button";

// Type definitions for fine-grained Shiki
type HighlighterCore = {
	codeToHtml: (
		code: string,
		options: { lang: string; theme: string },
	) => string;
	loadLanguage: (lang: any) => Promise<void>;
	getLoadedLanguages: () => string[];
};

// Shared highlighter instance to avoid recreating it
let sharedHighlighter: HighlighterCore | null = null;
let highlighterPromise: Promise<HighlighterCore> | null = null;

// Map of language names to their dynamic imports
const languageImports: Record<string, () => Promise<any>> = {
	javascript: () => import("shiki/langs/javascript.mjs"),
	typescript: () => import("shiki/langs/typescript.mjs"),
	jsx: () => import("shiki/langs/jsx.mjs"),
	tsx: () => import("shiki/langs/tsx.mjs"),
	python: () => import("shiki/langs/python.mjs"),
	bash: () => import("shiki/langs/bash.mjs"),
	json: () => import("shiki/langs/json.mjs"),
	markdown: () => import("shiki/langs/markdown.mjs"),
	css: () => import("shiki/langs/css.mjs"),
	html: () => import("shiki/langs/html.mjs"),
	yaml: () => import("shiki/langs/yaml.mjs"),
	sql: () => import("shiki/langs/sql.mjs"),
	rust: () => import("shiki/langs/rust.mjs"),
	go: () => import("shiki/langs/go.mjs"),
	java: () => import("shiki/langs/java.mjs"),
	cpp: () => import("shiki/langs/cpp.mjs"),
	c: () => import("shiki/langs/c.mjs"),
	php: () => import("shiki/langs/php.mjs"),
	ruby: () => import("shiki/langs/ruby.mjs"),
	xml: () => import("shiki/langs/xml.mjs"),
	haskell: () => import("shiki/langs/haskell.mjs"),
};

const getHighlighter = async (): Promise<HighlighterCore> => {
	if (sharedHighlighter) {
		return sharedHighlighter;
	}

	if (!highlighterPromise) {
		highlighterPromise = (async () => {
			// Import only the core and JavaScript regex engine for smaller bundle
			const [
				{ createHighlighterCore },
				{ createJavaScriptRegexEngine },
				githubDarkTheme,
			] = await Promise.all([
				import("shiki/core"),
				import("shiki/engine/javascript"),
				import("shiki/themes/github-dark.mjs"),
			]);

			// Create highlighter with minimal setup
			const highlighter = await createHighlighterCore({
				themes: [githubDarkTheme],
				langs: [], // Start with no languages, load on-demand
				engine: createJavaScriptRegexEngine(), // JS engine instead of WASM
			});

			return highlighter;
		})();
	}

	sharedHighlighter = await highlighterPromise;
	return sharedHighlighter;
};

// Load a language on-demand if not already loaded
const ensureLanguageLoaded = async (
	highlighter: HighlighterCore,
	language: string,
) => {
	const loadedLangs = highlighter.getLoadedLanguages();

	if (!loadedLangs.includes(language) && languageImports[language]) {
		try {
			const langModule = await languageImports[language]();
			await highlighter.loadLanguage(langModule.default);
		} catch (error) {
			console.warn(`Failed to load language: ${language}`, error);
			throw error;
		}
	}
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

				const currentTheme = "github-dark";
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
					// Load the language on-demand
					await ensureLanguageLoaded(highlighter, langToUse);

					if (!isMounted) return;

					const highlighted = highlighter.codeToHtml(code, {
						lang: langToUse,
						theme: currentTheme,
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
				<div className="flex items-center gap-1">
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
						size="icon"
						onClick={copyToClipboard}
						className="h-8 w-8"
						aria-label="Copy to clipboard"
					>
						{copied ? (
							<Check className="h-4 w-4" />
						) : (
							<Copy className="h-4 w-4" />
						)}
					</Button>
				</div>
			</div>

			{/* Code content - show immediately, apply syntax highlighting when ready */}
			<div className="border border-t-0 border-border rounded-b-md overflow-hidden">
				<div className="w-full">
					{highlightedCode ? (
						<div
							className="[&>pre]:!m-0 [&>pre]:!p-3 [&>pre]:!bg-transparent [&>pre]:!border-none [&>pre]:!rounded-none [&>pre]:text-xs [&>pre]:leading-relaxed [&>pre]:whitespace-pre-wrap [&>pre]:break-words [&>pre]:overflow-wrap-anywhere [&_code]:whitespace-pre-wrap [&_code]:break-words [&_code]:overflow-wrap-anywhere [&_code]:font-mono animate-in fade-in duration-150"
							// biome-ignore lint/security/noDangerouslySetInnerHtml: Shiki output is safe
							dangerouslySetInnerHTML={{ __html: highlightedCode }}
						/>
					) : (
						<pre className="m-0 p-3 bg-transparent border-none rounded-none text-xs leading-relaxed whitespace-pre-wrap break-words overflow-wrap-anywhere">
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
