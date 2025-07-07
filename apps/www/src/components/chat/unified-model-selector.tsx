"use client";

import {
	type ModelId,
	PROVIDER_ICONS,
	getModelConfig,
	getVisibleModels,
} from "@lightfast/ai/providers";
import { Badge } from "@lightfast/ui/components/ui/badge";
import { Button } from "@lightfast/ui/components/ui/button";
import { Icons } from "@lightfast/ui/components/ui/icons";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@lightfast/ui/components/ui/popover";
import { ScrollArea } from "@lightfast/ui/components/ui/scroll-area";
import { cn } from "@lightfast/ui/lib/utils";
import { ChevronDown, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface UnifiedModelSelectorProps {
	value: ModelId;
	onValueChange: (value: ModelId) => void;
	disabled?: boolean;
	className?: string;
}

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
	const [selectedIndex, setSelectedIndex] = useState(0);
	const searchInputRef = useRef<HTMLInputElement>(null);
	const triggerRef = useRef<HTMLButtonElement>(null);

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
			setSelectedIndex(0);
		},
		[onValueChange],
	);

	// Reset selected index when search changes
	// biome-ignore lint/correctness/useExhaustiveDependencies: we want to reset when search changes
	useEffect(() => {
		setSelectedIndex(0);
	}, [search]);

	// Focus search input when popover opens
	useEffect(() => {
		if (open && searchInputRef.current) {
			searchInputRef.current.focus();
		}
	}, [open]);

	// Keyboard navigation
	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (!open) return;

			switch (e.key) {
				case "ArrowDown":
					e.preventDefault();
					setSelectedIndex((prev) =>
						prev < sortedModels.length - 1 ? prev + 1 : 0,
					);
					break;
				case "ArrowUp":
					e.preventDefault();
					setSelectedIndex((prev) =>
						prev > 0 ? prev - 1 : sortedModels.length - 1,
					);
					break;
				case "Enter":
					e.preventDefault();
					if (sortedModels[selectedIndex]) {
						handleSelect(sortedModels[selectedIndex].id);
					}
					break;
				case "Escape":
					e.preventDefault();
					setOpen(false);
					setSearch("");
					setSelectedIndex(0);
					triggerRef.current?.focus();
					break;
				case "/":
					// Only prevent default if not already focused on search input
					if (document.activeElement !== searchInputRef.current) {
						e.preventDefault();
						searchInputRef.current?.focus();
					}
					break;
			}
		},
		[open, sortedModels, selectedIndex, handleSelect],
	);

	// Global keyboard shortcut for Cmd/Ctrl + .
	useEffect(() => {
		const handleGlobalKeyDown = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key === ".") {
				e.preventDefault();
				setOpen(true);
			}
		};

		document.addEventListener("keydown", handleGlobalKeyDown);
		return () => document.removeEventListener("keydown", handleGlobalKeyDown);
	}, []);

	// Update hovered model based on selected index
	useEffect(() => {
		if (sortedModels[selectedIndex]) {
			setHoveredModel(sortedModels[selectedIndex].id);
		}
	}, [selectedIndex, sortedModels]);

	const selectedModel = getModelConfig(value);

	return (
		<Popover open={open} onOpenChange={setOpen} modal={false}>
			<PopoverTrigger asChild>
				<Button
					ref={triggerRef}
					variant="outline"
					size="sm"
					className={cn("justify-between", className)}
					disabled={disabled}
				>
					<div className="flex items-center gap-2">
						{(() => {
							const iconName = PROVIDER_ICONS[
								selectedModel?.provider || "openai"
							] as keyof typeof Icons;
							const IconComponent = Icons[iconName];
							return IconComponent ? (
								<IconComponent className="w-4 h-4 shrink-0" />
							) : null;
						})()}
						<span className="truncate text-xs">
							{selectedModel?.displayName}
						</span>
					</div>
					<ChevronDown className="h-3 w-3 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent
				align="end"
				className="w-[600px] p-0"
				onOpenAutoFocus={(e) => e.preventDefault()}
				onKeyDown={handleKeyDown}
			>
				<div className="flex h-[400px]">
					{/* Model list */}
					<div className="flex-1 border-r flex flex-col">
						<div className="relative border-b">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
							<input
								ref={searchInputRef}
								type="text"
								placeholder="Search models..."
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								className="w-full h-12 pl-10 pr-3 text-sm bg-transparent border-0 outline-none focus:ring-0 placeholder:text-muted-foreground"
							/>
						</div>
						<ScrollArea className="flex-1 overflow-y-auto">
							<div className="p-2 space-y-1">
								{sortedModels.map((model, index) => (
									<button
										type="button"
										key={model.id}
										onClick={() => handleSelect(model.id)}
										onMouseEnter={() => {
											setHoveredModel(model.id);
											setSelectedIndex(index);
										}}
										onMouseLeave={() => setHoveredModel(null)}
										className={cn(
											"w-full flex items-center gap-3 px-2.5 py-2.5 text-xs rounded-md transition-colors text-left",
											"hover:bg-accent hover:text-accent-foreground",
											(model.id === value || index === selectedIndex) &&
												"bg-accent text-accent-foreground",
										)}
									>
										{(() => {
											const iconName = PROVIDER_ICONS[
												model.provider
											] as keyof typeof Icons;
											const IconComponent = Icons[iconName];
											return IconComponent ? (
												<IconComponent className="w-4 h-4 shrink-0" />
											) : null;
										})()}
										<span className="truncate">{model.displayName}</span>
										{model.id === value && (
											<span className="ml-auto text-xs text-muted-foreground">
												Selected
											</span>
										)}
									</button>
								))}
								{sortedModels.length === 0 && (
									<div className="text-center py-8 text-xs text-muted-foreground">
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
									{(() => {
										const iconName = PROVIDER_ICONS[
											detailModel.provider
										] as keyof typeof Icons;
										const IconComponent = Icons[iconName];
										return IconComponent ? (
											<IconComponent className="w-6 h-6 shrink-0 mt-0.5" />
										) : null;
									})()}
									<div className="flex-1 min-w-0">
										<h4 className="font-medium truncate">
											{detailModel.displayName}
										</h4>
										<p className="text-xs text-muted-foreground capitalize">
											{detailModel.provider}
										</p>
									</div>
								</div>

								<div className="h-8 flex items-start">
									<p
										className="text-xs text-muted-foreground leading-tight overflow-hidden"
										style={{
											display: "-webkit-box",
											WebkitLineClamp: 2,
											WebkitBoxOrient: "vertical",
										}}
									>
										{detailModel.description || "No description available"}
									</p>
								</div>

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
