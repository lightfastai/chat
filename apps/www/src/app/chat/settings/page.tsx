import { SettingsContent } from "@/components/settings/settings-content";
import { siteConfig } from "@/lib/site-config";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
	title: "Settings",
	description: "Manage your account settings and preferences.",
	openGraph: {
		title: `Settings - ${siteConfig.name}`,
		description: "Manage your account settings and preferences.",
		url: `${siteConfig.url}/chat/settings`,
	},
	twitter: {
		title: `Settings - ${siteConfig.name}`,
		description: "Manage your account settings and preferences.",
	},
	robots: {
		index: false,
		follow: false,
	},
};

export default function SettingsPage() {
	return (
		<div className="h-full overflow-y-auto overscroll-contain">
			<div className="container max-w-4xl mx-auto p-6 pb-20">
				<Suspense fallback={<SettingsSkeleton />}>
					<SettingsContent />
				</Suspense>
			</div>
		</div>
	);
}

// Helper for skeleton row
function SkeletonRow({ controlWidth = "w-48" }: { controlWidth?: string }) {
	return (
		<div className="flex items-center justify-between py-4">
			<div className="flex-1 space-y-2">
				<div className="h-4 w-24 animate-pulse rounded bg-muted" />
				<div className="h-4 w-40 animate-pulse rounded bg-muted" />
			</div>
			<div className={`h-10 ${controlWidth} animate-pulse rounded bg-muted`} />
		</div>
	);
}

// Loading skeleton for settings
function SettingsSkeleton() {
	return (
		<div className="space-y-8 sm:space-y-12">
			{/* User Settings Skeleton */}
			<div>
				<div className="h-7 w-48 animate-pulse rounded bg-muted" />
				<div className="mt-6 divide-y divide-border">
					{/* Profile Picture Row */}
					<div className="flex items-center justify-between py-4">
						<div className="flex-1 space-y-2">
							<div className="h-4 w-24 animate-pulse rounded bg-muted" />
							<div className="h-4 w-40 animate-pulse rounded bg-muted" />
						</div>
						<div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
					</div>
					<SkeletonRow controlWidth="w-64" />
					<SkeletonRow controlWidth="w-32" />
				</div>
			</div>

			{/* API Keys Skeleton */}
			<div>
				<div className="flex items-center space-x-2">
					<div className="h-7 w-32 animate-pulse rounded bg-muted" />
					<div className="h-5 w-12 animate-pulse rounded bg-muted" />
				</div>
				<div className="mt-6 divide-y divide-border">
					<SkeletonRow controlWidth="w-[22rem]" />
					<SkeletonRow controlWidth="w-[22rem]" />
					<SkeletonRow controlWidth="w-[22rem]" />
				</div>
			</div>
		</div>
	);
}
