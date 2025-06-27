"use client";

import { Badge } from "@lightfast/ui/components/ui/badge";
import { CheckCircle, FlaskConical } from "lucide-react";

export function ExperimentalFeaturesSection() {
	return (
		<div>
			<div className="mb-6">
				<h2 className="text-xl font-semibold tracking-tight flex items-center gap-2">
					<FlaskConical className="w-5 h-5" />
					Experimental Features
					<Badge variant="secondary" className="text-xs">
						Beta
					</Badge>
				</h2>
				<p className="text-sm text-muted-foreground mt-1">
					New features currently enabled in this version
				</p>
			</div>

			<div className="space-y-6">
				{/* Hybrid Streaming - Always On */}
				<div className="flex items-start gap-6">
					<div className="flex-1 space-y-1">
						<div className="flex items-center gap-2">
							<h3 className="text-sm font-medium">Hybrid Streaming</h3>
							<Badge variant="default" className="text-xs bg-green-600">
								Always On
							</Badge>
						</div>
						<p className="text-sm text-muted-foreground">
							Combines HTTP streaming for instant feedback with Convex
							persistence for reliability. Provides the best of both worlds.
						</p>
						<div className="flex items-start gap-2 mt-2">
							<CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
							<p className="text-xs text-muted-foreground">
								This feature is now enabled by default for optimal performance.
							</p>
						</div>
					</div>
				</div>

				{/* Performance Features */}
				<div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
					<h4 className="text-sm font-medium text-green-900 dark:text-green-100 mb-2">
						Hybrid Streaming Features
					</h4>
					<ul className="text-xs text-green-700 dark:text-green-300 space-y-1">
						<li>• HTTP streaming provides instant message feedback</li>
						<li>• Convex persistence ensures reliable data storage</li>
						<li>• Automatic fallback if HTTP connection fails</li>
						<li>• Optimized for both speed and reliability</li>
					</ul>
				</div>
			</div>
		</div>
	);
}
