"use client";

import { usePreloadedQuery } from "convex/react";
import type { Preloaded } from "convex/react";
import type { api } from "../../../convex/_generated/api";
import { ApiKeysSection } from "./api-keys-section";
import { ProfileSection } from "./profile-section";

interface SettingsContentProps {
	preloadedUser: Preloaded<typeof api.users.current>;
	preloadedUserSettings: Preloaded<typeof api.userSettings.getUserSettings>;
}

export function SettingsContent({
	preloadedUser,
	preloadedUserSettings,
}: SettingsContentProps) {
	const user = usePreloadedQuery(preloadedUser);
	const userSettings = usePreloadedQuery(preloadedUserSettings);

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
