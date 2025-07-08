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

// Shared highlighter instance
let sharedHighlighter: HighlighterCore | null = null;
let highlighterPromise: Promise<HighlighterCore> | null = null;

// Map of language names to their import functions
const languageImports = {
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
			// Import only the core and the JavaScript regex engine (smaller than WASM)
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
				langs: [], // Start with no languages loaded
				engine: createJavaScriptRegexEngine(), // Use JS engine instead of WASM
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
	
	if (!loadedLangs.includes(language)) {
		const langImport = languageImports[language];
		if (langImport) {
			try {
				const langModule = await langImport();
				await highlighter.loadLanguage(langModule.default);
			} catch (error) {
				console.warn(`Failed to load language: ${language}`, error);
			}
		}
	}
};

// Rest of the component remains the same...

// In the useEffect for highlighting:
useEffect(() => {
	let isMounted = true;

	async function highlightCode() {
		try {
			const highlighter = await getHighlighter();
			
			if (!isMounted) return;

			const langToUse = normalizedLanguage || "text";

			// Handle plaintext specially
			if (!normalizedLanguage || langToUse === "text") {
				// ... existing plaintext handling ...
				return;
			}

			// Load the language on-demand
			await ensureLanguageLoaded(highlighter, langToUse);

			if (!isMounted) return;

			try {
				const highlighted = highlighter.codeToHtml(code, {
					lang: langToUse,
					theme: "github-dark",
				});
				if (isMounted) {
					setHighlightedCode(highlighted);
				}
			} catch (langError) {
				// ... existing error handling ...
			}
		} catch (error) {
			console.error("Failed to highlight code:", error);
		}
	}

	highlightCode();

	return () => {
		isMounted = false;
	};
}, [code, normalizedLanguage]);