"use client";

import {
	type ModelId,
	getModelConfig,
	getVisibleModels,
} from "@lightfast/ai/providers";
import { Badge } from "@lightfast/ui/components/ui/badge";
import { Button } from "@lightfast/ui/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@lightfast/ui/components/ui/popover";
import { ScrollArea } from "@lightfast/ui/components/ui/scroll-area";
import { cn } from "@lightfast/ui/lib/utils";
import { ChevronDown, Search } from "lucide-react";
import Image from "next/image";
import { useCallback, useMemo, useState } from "react";

interface UnifiedModelSelectorProps {
	value: ModelId;
	onValueChange: (value: ModelId) => void;
	disabled?: boolean;
	className?: string;
}

const providerIcons: Record<string, string> = {
	openai: "/favicon.png",
	anthropic: "/favicon.png",
	openrouter: "/favicon.png",
};

const featureBadges = {
	vision: {
		label: "Vision",
		className: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
	},
	functionCalling: {
		label: "Tools",
		className: "bg-green-500/10 text-green-600 dark:text-green-400",
	},
	thinking: {
		label: "Reasoning",
		className: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
	},
	pdfSupport: {
		label: "PDF",
		className: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
	},
};

export function UnifiedModelSelector({
	value,
	onValueChange,
	disabled,
	className,
}: UnifiedModelSelectorProps) {
	const [open, setOpen] = useState(false);
	const [search, setSearch] = useState("");
	const [hoveredModel, setHoveredModel] = useState<ModelId | null>(null);

	// Get all visible models
	const allModels = useMemo(() => {
		return getVisibleModels().map((model) => ({
			id: model.id as ModelId,
			provider: model.provider,
			displayName: model.displayName,
			description: model.description,
			features: model.features,
		}));
	}, []);

	// Filter models based on search
	const filteredModels = useMemo(() => {
		if (!search.trim()) return allModels;

		const searchLower = search.toLowerCase();
		return allModels.filter(
			(model) =>
				model.displayName.toLowerCase().includes(searchLower) ||
				model.provider.toLowerCase().includes(searchLower),
		);
	}, [allModels, search]);

	// Sort models with selected one first
	const sortedModels = useMemo(() => {
		return [...filteredModels].sort((a, b) => {
			if (a.id === value) return -1;
			if (b.id === value) return 1;
			return 0;
		});
	}, [filteredModels, value]);

	// Get the model to show details for (hovered or selected)
	const detailModel = useMemo(() => {
		const modelId = hoveredModel || value;
		return allModels.find((m) => m.id === modelId) || null;
	}, [hoveredModel, value, allModels]);

	const handleSelect = useCallback(
		(modelId: ModelId) => {
			onValueChange(modelId);
			setOpen(false);
			setSearch("");
		},
		[onValueChange],
	);

	const selectedModel = getModelConfig(value);

	return (
		<Popover open={open} onOpenChange={setOpen} modal={false}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					size="sm"
					className={cn("justify-between", className)}
					disabled={disabled}
				>
					<div className="flex items-center gap-2">
						<Image
							src={providerIcons[selectedModel?.provider || "openai"]}
							alt=""
							width={14}
							height={14}
							className="opacity-70"
						/>
						<span className="truncate">{selectedModel?.displayName}</span>
					</div>
					<ChevronDown className="h-3 w-3 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent
				align="end"
				className="w-[600px] p-0"
				onOpenAutoFocus={(e) => e.preventDefault()}
			>
				<div className="flex h-[400px]">
					{/* Model list */}
					<div className="flex-1 border-r flex flex-col">
						<div className="relative border-b">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
							<input
								type="text"
								placeholder="Search models..."
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								className="w-full h-12 pl-10 pr-3 text-sm bg-transparent border-0 outline-none focus:ring-0 placeholder:text-muted-foreground"
							/>
						</div>
						<ScrollArea className="flex-1">
							<div className="p-1">
								{sortedModels.map((model) => (
									<button
										type="button"
										key={model.id}
										onClick={() => handleSelect(model.id)}
										onMouseEnter={() => setHoveredModel(model.id)}
										onMouseLeave={() => setHoveredModel(null)}
										className={cn(
											"w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors text-left",
											"hover:bg-accent hover:text-accent-foreground",
											model.id === value && "bg-accent text-accent-foreground",
										)}
									>
										<Image
											src={providerIcons[model.provider]}
											alt=""
											width={16}
											height={16}
											className="opacity-70 shrink-0"
										/>
										<span className="truncate">{model.displayName}</span>
										{model.id === value && (
											<span className="ml-auto text-xs text-muted-foreground">
												Selected
											</span>
										)}
									</button>
								))}
								{sortedModels.length === 0 && (
									<div className="text-center py-8 text-sm text-muted-foreground">
										No models found
									</div>
								)}
							</div>
						</ScrollArea>
					</div>

					{/* Model details panel */}
					<div className="w-[250px] p-4 bg-muted/30">
						{detailModel ? (
							<div className="space-y-3">
								<div className="flex items-start gap-2">
									<Image
										src={providerIcons[detailModel.provider]}
										alt=""
										width={20}
										height={20}
										className="opacity-70 mt-0.5"
									/>
									<div className="flex-1 min-w-0">
										<h4 className="font-medium truncate">
											{detailModel.displayName}
										</h4>
										<p className="text-xs text-muted-foreground capitalize">
											{detailModel.provider}
										</p>
									</div>
								</div>

								{detailModel.description && (
									<p className="text-xs text-muted-foreground leading-relaxed">
										{detailModel.description}
									</p>
								)}

								<div className="space-y-2">
									<p className="text-xs font-medium text-muted-foreground">
										Features
									</p>
									<div className="flex flex-wrap gap-1">
										{Object.entries(detailModel.features).map(
											([feature, enabled]) =>
												enabled &&
												featureBadges[feature as keyof typeof featureBadges] ? (
													<Badge
														key={feature}
														variant="secondary"
														className={cn(
															"text-xs px-2 py-0.5",
															featureBadges[
																feature as keyof typeof featureBadges
															].className,
														)}
													>
														{
															featureBadges[
																feature as keyof typeof featureBadges
															].label
														}
													</Badge>
												) : null,
										)}
									</div>
								</div>
							</div>
						) : (
							<div className="text-center py-8 text-sm text-muted-foreground">
								Hover over a model to see details
							</div>
						)}
					</div>
				</div>
			</PopoverContent>
		</Popover>
	);
}
