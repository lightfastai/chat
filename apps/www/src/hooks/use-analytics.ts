"use client";

import { usePostHog } from "posthog-js/react";
import { useCallback } from "react";

interface ChatEventProperties {
	conversationId?: string;
	messageId?: string;
	model?: string;
	messageLength?: number;
	responseTime?: number;
	[key: string]: string | number | boolean | undefined;
}

/**
 * Hook for analytics tracking in the chat application
 * Provides typed methods for common analytics events
 */
export function useAnalytics() {
	const posthog = usePostHog();

	const trackEvent = useCallback(
		(
			eventName: string,
			properties?: Record<string, string | number | boolean | undefined>,
		) => {
			if (!posthog) return;
			posthog.capture(eventName, properties);
		},
		[posthog],
	);

	const trackChatEvent = useCallback(
		(eventName: string, properties?: ChatEventProperties) => {
			trackEvent(`chat_${eventName}`, properties);
		},
		[trackEvent],
	);

	return {
		// Generic event tracking
		trackEvent,

		// Chat-specific events
		trackNewConversation: (properties?: ChatEventProperties) =>
			trackChatEvent("conversation_created", properties),

		trackMessageSent: (properties?: ChatEventProperties) =>
			trackChatEvent("message_sent", properties),

		trackMessageReceived: (properties?: ChatEventProperties) =>
			trackChatEvent("message_received", properties),

		trackModelChanged: (model: string, properties?: ChatEventProperties) =>
			trackChatEvent("model_changed", { model, ...properties }),

		trackError: (error: string, properties?: ChatEventProperties) =>
			trackChatEvent("error", { error, ...properties }),

		trackFeatureUsed: (
			feature: string,
			properties?: Record<string, string | number | boolean | undefined>,
		) => trackEvent("feature_used", { feature, ...properties }),

		// Settings events
		trackSettingsOpened: () => trackEvent("settings_opened"),

		trackSettingsChanged: (setting: string, value: string | number | boolean) =>
			trackEvent("settings_changed", { setting, value }),

		// API key events
		trackApiKeyAdded: (provider: string) =>
			trackEvent("api_key_added", { provider }),

		trackApiKeyRemoved: (provider: string) =>
			trackEvent("api_key_removed", { provider }),
	};
}
