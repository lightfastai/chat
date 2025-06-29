"use client";

import { usePreloadedQuery } from "convex/react";
import type { Preloaded } from "convex/react";
import type { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { ApiKeysSection } from "./api-keys-section";
import { ProfileSection } from "./profile-section";

interface SettingsContentProps {
	preloadedUser: Preloaded<typeof api.users.current>;
	preloadedUserSettings: Preloaded<typeof api.userSettings.getUserSettings>;
}

// Type definitions based on what the API queries return
type User = {
	_id: Id<"users">;
	_creationTime: number;
	name?: string;
	email?: string;
	image?: string;
	emailVerificationTime?: number;
	phone?: string;
	phoneVerificationTime?: number;
	isAnonymous?: boolean;
} | null;

type UserSettings = {
	_id: Id<"userSettings">;
	userId: Id<"users">;
	preferences?: {
		defaultModel?: string;
		preferredProvider?: string;
	};
	createdAt: number;
	updatedAt: number;
	hasOpenAIKey: boolean;
	hasAnthropicKey: boolean;
	hasOpenRouterKey: boolean;
} | null;

export function SettingsContent({
	preloadedUser,
	preloadedUserSettings,
}: SettingsContentProps) {
	let user: User = null;
	let userSettings: UserSettings = null;

	try {
		user = usePreloadedQuery(preloadedUser);
		userSettings = usePreloadedQuery(preloadedUserSettings);
	} catch (error) {
		console.error("Error loading preloaded data:", error);
		return null;
	}

	if (!user) {
		return null;
	}

	return (
		<div className="space-y-8 sm:space-y-12">
			<ProfileSection user={user} userSettings={userSettings} />
			<ApiKeysSection userSettings={userSettings} />
		</div>
	);
}
