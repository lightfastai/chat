"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { ApiKeysSection } from "./api-keys-section";
import { ProfileSection } from "./profile-section";

export function SettingsContent() {
	const { isAuthenticated } = useConvexAuth();
	const user = useQuery(api.users.current, isAuthenticated ? {} : "skip");
	const userSettings = useQuery(api.userSettings.getUserSettings, isAuthenticated ? {} : "skip");

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
