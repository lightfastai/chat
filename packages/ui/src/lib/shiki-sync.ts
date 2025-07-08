import { createHighlighterCoreSync } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";

import bash from "shiki/langs/bash.mjs";
import c from "shiki/langs/c.mjs";
import cpp from "shiki/langs/cpp.mjs";
import css from "shiki/langs/css.mjs";
import go from "shiki/langs/go.mjs";
import haskell from "shiki/langs/haskell.mjs";
import html from "shiki/langs/html.mjs";
import java from "shiki/langs/java.mjs";
// Import specific languages as modules for synchronous loading
import js from "shiki/langs/javascript.mjs";
import json from "shiki/langs/json.mjs";
import jsx from "shiki/langs/jsx.mjs";
import markdown from "shiki/langs/markdown.mjs";
import php from "shiki/langs/php.mjs";
// Note: plaintext is not available as a separate language in Shiki v3
// We'll handle it in the fallback logic
import python from "shiki/langs/python.mjs";
import ruby from "shiki/langs/ruby.mjs";
import rust from "shiki/langs/rust.mjs";
import sql from "shiki/langs/sql.mjs";
import tsx from "shiki/langs/tsx.mjs";
import ts from "shiki/langs/typescript.mjs";
import xml from "shiki/langs/xml.mjs";
import yaml from "shiki/langs/yaml.mjs";

import githubDark from "shiki/themes/github-dark.mjs";
// Import themes
import githubLight from "shiki/themes/github-light.mjs";

// Create synchronous highlighter with pre-loaded languages and themes
const highlighter = createHighlighterCoreSync({
	themes: [githubLight, githubDark],
	langs: [
		js,
		ts,
		jsx,
		tsx,
		python,
		bash,
		json,
		markdown,
		css,
		html,
		yaml,
		sql,
		rust,
		go,
		java,
		cpp,
		c,
		php,
		ruby,
		xml,
		haskell,
	],
	engine: createJavaScriptRegexEngine(),
});

// Map common language aliases to loaded language ids
const languageAliases: Record<string, string> = {
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
};

// Export a synchronous highlight function
export function highlightCodeSync(
	code: string,
	language: string,
	theme: "light" | "dark",
): string {
	const themeName = theme === "dark" ? "github-dark" : "github-light";
	const normalizedLang =
		languageAliases[language?.toLowerCase()] || language?.toLowerCase();

	// Handle plaintext specially since it's not available as a language in Shiki v3
	if (
		!normalizedLang ||
		normalizedLang === "plaintext" ||
		normalizedLang === "text"
	) {
		// Return a simple pre/code block with appropriate styling
		const bgColor = theme === "dark" ? "#0d1117" : "#f6f8fa";
		const textColor = theme === "dark" ? "#e6edf3" : "#24292e";
		const escapedCode = code
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&#39;");

		return `<pre class="shiki ${themeName}" style="background-color: ${bgColor}; color: ${textColor}"><code>${escapedCode}</code></pre>`;
	}

	try {
		return highlighter.codeToHtml(code, {
			lang: normalizedLang,
			theme: themeName,
		});
	} catch {
		// Fallback to basic HTML if language not supported
		const bgColor = theme === "dark" ? "#0d1117" : "#f6f8fa";
		const textColor = theme === "dark" ? "#e6edf3" : "#24292e";
		const escapedCode = code
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&#39;");

		return `<pre class="shiki ${themeName}" style="background-color: ${bgColor}; color: ${textColor}"><code>${escapedCode}</code></pre>`;
	}
}
