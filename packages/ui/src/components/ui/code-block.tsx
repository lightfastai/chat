"use client";

import { Check, Copy } from "lucide-react";
import { useTheme } from "next-themes";
import { useState } from "react";
import { highlightCodeSync } from "../../lib/shiki-sync";
import { cn } from "../../lib/utils";
import { Button } from "./button";

interface CodeBlockProps {
	code: string;
	language?: string;
	className?: string;
}

export function CodeBlock({ code, language = "", className }: CodeBlockProps) {
	const { theme } = useTheme();
	const [copied, setCopied] = useState(false);
	// TODO: Re-enable scroll mode once overflow container issues are resolved
	// For now, we only support text wrapping to prevent overflow beyond message bounds
	// const [isWrapped, setIsWrapped] = useState(true)

	// Get highlighted code synchronously - no delay!
	const highlightedCode = highlightCodeSync(
		code,
		language,
		theme === "dark" ? "dark" : "light",
	);

	const copyToClipboard = async () => {
		try {
			await navigator.clipboard.writeText(code);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch (err) {
			console.error("Failed to copy text: ", err);
		}
	};

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

			{/* Code content with synchronous syntax highlighting */}
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
