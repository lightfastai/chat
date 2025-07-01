"use client";

import { Brain, Eye, FileText, GitBranch, Wrench } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import type { ModelConfig, ModelId } from "@/lib/ai";
import { getModelCapabilities } from "@/lib/ai";
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

// Icon component mapper for capability icons
const CapabilityIcon = ({
	iconName,
	className,
}: { iconName: string; className?: string }) => {
	const iconMap = {
		Eye,
		FileText,
		Wrench,
		Brain,
	} as const;

	const IconComponent = iconMap[iconName as keyof typeof iconMap];
	return IconComponent ? <IconComponent className={className} /> : null;
};

interface ModelBranchDropdownProps {
	onBranch: (modelId: ModelId) => void;
	disabled?: boolean;
	onOpenChange?: (open: boolean) => void;
}

export function ModelBranchDropdown({
	onBranch,
	disabled = false,
	onOpenChange,
}: ModelBranchDropdownProps) {
	const [open, setOpen] = useState(false);
	const buttonRef = useRef<HTMLButtonElement>(null);

	// Notify parent when dropdown state changes
	useEffect(() => {
		onOpenChange?.(open);

		// Blur the button when dropdown closes to remove focus state
		if (!open && buttonRef.current) {
			buttonRef.current.blur();
		}
	}, [open, onOpenChange]);

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
					ref={buttonRef}
					variant="ghost"
					size="icon"
					className="h-8 w-8 data-[state=open]:bg-accent data-[state=open]:text-accent-foreground"
					aria-label="Branch from here"
					disabled={disabled}
				>
					<GitBranch className="h-4 w-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align="start"
				side="right"
				sideOffset={5}
				className="w-52"
			>
				{Object.entries(modelsByProvider).map(([provider, models]) => (
					<DropdownMenuSub key={provider}>
						<DropdownMenuSubTrigger>
							<span>{providerNames[provider] || provider}</span>
						</DropdownMenuSubTrigger>
						<DropdownMenuPortal>
							<DropdownMenuSubContent className="w-72">
								{models.map((model) => {
									const capabilities = getModelCapabilities(
										model.id as ModelId,
									);
									return (
										<DropdownMenuItem
											key={model.id}
											onClick={() => handleModelSelect(model.id as ModelId)}
											className="flex flex-col items-start py-3"
										>
											<div className="flex items-center justify-between w-full">
												<span className="font-medium">{model.displayName}</span>
												{capabilities.length > 0 && (
													<div className="flex items-center gap-1">
														{capabilities.map((cap) => (
															<CapabilityIcon
																key={cap.key}
																iconName={cap.icon}
																className="h-3 w-3"
															/>
														))}
													</div>
												)}
											</div>
											<span className="text-xs text-muted-foreground">
												{model.description}
											</span>
										</DropdownMenuItem>
									);
								})}
							</DropdownMenuSubContent>
						</DropdownMenuPortal>
					</DropdownMenuSub>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
