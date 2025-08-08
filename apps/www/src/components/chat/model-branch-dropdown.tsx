"use client";

import { GitBranch } from "lucide-react";

import type { ModelId } from "@lightfast/ai/providers";
import { Button } from "@lightfast/ui/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@lightfast/ui/components/ui/tooltip";

interface ModelBranchDropdownProps {
	onBranch: (modelId: ModelId) => void;
	disabled?: boolean;
	onOpenChange?: (open: boolean) => void;
}

export function ModelBranchDropdown(_props: ModelBranchDropdownProps) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					className="h-8 w-8 opacity-50 cursor-not-allowed"
					aria-label="Branch from here"
					disabled={true}
				>
					<GitBranch className="h-4 w-4" />
				</Button>
			</TooltipTrigger>
			<TooltipContent side="top">
				<p>We've temporarily disabled this functionality. Check back soon!</p>
			</TooltipContent>
		</Tooltip>
	);
}
