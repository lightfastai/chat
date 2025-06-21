"use client";

import { GitBranch } from "lucide-react";
import { useMemo, useState } from "react";

import type { ModelConfig, ModelId } from "@/lib/ai";
import { getVisibleModels } from "@/lib/ai/schemas";
import { Button } from "@lightfast/ui/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuPortal,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "@lightfast/ui/components/ui/dropdown-menu";

interface ModelBranchDropdownProps {
	onBranch: (modelId: ModelId) => void;
	disabled?: boolean;
}

export function ModelBranchDropdown({
	onBranch,
	disabled = false,
}: ModelBranchDropdownProps) {
	const [open, setOpen] = useState(false);

	// Group models by provider
	const modelsByProvider = useMemo(() => {
		const allModels = getVisibleModels();
		return allModels.reduce(
			(acc, model) => {
				if (!acc[model.provider]) {
					acc[model.provider] = [];
				}
				acc[model.provider].push(model);
				return acc;
			},
			{} as Record<string, ModelConfig[]>,
		);
	}, []);

	const handleModelSelect = (modelId: ModelId) => {
		setOpen(false);
		onBranch(modelId);
	};

	// Provider display names
	const providerNames: Record<string, string> = {
		openai: "OpenAI",
		anthropic: "Anthropic",
		openrouter: "OpenRouter",
	};

	return (
		<DropdownMenu open={open} onOpenChange={setOpen}>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					className="h-7 w-7"
					aria-label="Branch from here"
					disabled={disabled}
				>
					<GitBranch className="h-3.5 w-3.5" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-52">
				{Object.entries(modelsByProvider).map(([provider, models]) => (
					<DropdownMenuSub key={provider}>
						<DropdownMenuSubTrigger>
							<span>{providerNames[provider] || provider}</span>
						</DropdownMenuSubTrigger>
						<DropdownMenuPortal>
							<DropdownMenuSubContent className="w-64">
								{models.map((model) => (
									<DropdownMenuItem
										key={model.id}
										onClick={() => handleModelSelect(model.id as ModelId)}
										className="flex flex-col items-start py-2"
									>
										<span className="font-medium">{model.displayName}</span>
										<span className="text-xs text-muted-foreground">
											{model.description}
										</span>
									</DropdownMenuItem>
								))}
							</DropdownMenuSubContent>
						</DropdownMenuPortal>
					</DropdownMenuSub>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
