"use client";

import { Button } from "@lightfast/ui/components/ui/button";
import { cn } from "@lightfast/ui/lib/utils";
import { BookOpen, Code2, Palette } from "lucide-react";
import { useState } from "react";

interface PromptCategory {
	id: string;
	label: string;
	icon: React.ReactNode;
	prompts: string[];
}

const categories: PromptCategory[] = [
	{
		id: "summary",
		label: "Summary",
		icon: <BookOpen className="w-4 h-4" />,
		prompts: [
			"Summarize the key events of the French Revolution",
			"Explain the plot of Inception in simple terms",
			"Summarize World War 2 in 5 sentences",
			"Give me a brief overview of quantum computing",
		],
	},
	{
		id: "code",
		label: "Code",
		icon: <Code2 className="w-4 h-4" />,
		prompts: [
			"Write a Python function to find prime numbers",
			"Debug this React component that's not rendering",
			"Explain how binary search works with examples",
			"Create a REST API endpoint for user authentication",
		],
	},
	{
		id: "design",
		label: "Design",
		icon: <Palette className="w-4 h-4" />,
		prompts: [
			"Design a mobile app UI for a meditation app",
			"Create a color palette for a tech startup",
			"Suggest improvements for this landing page layout",
			"Design a database schema for an e-commerce platform",
		],
	},
];

interface PromptSuggestionsProps {
	onSelectPrompt: (prompt: string) => void;
}

export function PromptSuggestions({ onSelectPrompt }: PromptSuggestionsProps) {
	const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
	const [visiblePrompts, setVisiblePrompts] = useState<number>(0);

	const handleCategoryClick = (categoryId: string) => {
		setSelectedCategory(categoryId);
		setVisiblePrompts(0);

		// Animate prompts appearing one by one
		const category = categories.find((c) => c.id === categoryId);
		if (category) {
			category.prompts.forEach((_, index) => {
				setTimeout(() => {
					setVisiblePrompts((prev) => prev + 1);
				}, index * 100); // 100ms delay between each prompt
			});
		}
	};

	const handlePromptClick = (prompt: string) => {
		onSelectPrompt(prompt);
		// Reset back to categories after selecting a prompt
		setSelectedCategory(null);
		setVisiblePrompts(0);
	};

	const selectedCategoryData = categories.find(
		(c) => c.id === selectedCategory,
	);

	return (
		<div className="w-full px-4 mx-auto">
			{!selectedCategory ? (
				<div className="flex flex-wrap justify-center gap-3 animate-in fade-in-0 duration-300">
					{categories.map((category) => (
						<Button
							key={category.id}
							variant="ghost"
							onClick={() => handleCategoryClick(category.id)}
						>
							{category.icon}
							<span>{category.label}</span>
						</Button>
					))}
				</div>
			) : (
				<div className="space-y-3">
					<div className="grid gap-1">
						{selectedCategoryData?.prompts.map((prompt, index) => (
							<div
								key={`${selectedCategory}-${prompt}`}
								className={cn(
									"opacity-0 translate-y-4 transition-all duration-500 ease-out",
									index < visiblePrompts && "opacity-100 translate-y-0",
								)}
								style={{
									transitionDelay: `${index * 150}ms`,
								}}
							>
								<Button
									variant="ghost"
									onClick={() => handlePromptClick(prompt)}
									className="w-full text-left justify-start whitespace-normal"
								>
									<span className="text-xs font-base">{prompt}</span>
								</Button>
							</div>
						))}
					</div>
					{/* <div className="flex justify-start mt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedCategory(null);
                setVisiblePrompts(0);
              }}
              className="text-xs text-muted-foreground hover:text-foreground px-4"
            >
              Back to categories
            </Button>
          </div> */}
				</div>
			)}
		</div>
	);
}
