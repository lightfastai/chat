"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { ApiKeysSection } from "./api-keys-section";
import { ProfileSection } from "./profile-section";

export function SettingsContent() {
	const user = useQuery(api.users.current);
	const userSettings = useQuery(api.userSettings.getUserSettings);

	if (!user) {
		return null;
	}

	return (
		<div className="space-y-8 sm:space-y-12">
			<ProfileSection user={user} />
			<ApiKeysSection userSettings={userSettings || null} />
		</div>
	);
}
