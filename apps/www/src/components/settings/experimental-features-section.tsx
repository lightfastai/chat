"use client";

import { Switch } from "@lightfast/ui/components/ui/switch";
import { Badge } from "@lightfast/ui/components/ui/badge";
import { AlertCircle, FlaskConical } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useState } from "react";
import type { Id } from "../../../convex/_generated/dataModel";

interface ExperimentalFeaturesSectionProps {
  userSettings: {
    _id: Id<"userSettings">;
    userId: Id<"users">;
    preferences?: {
      defaultModel?: string;
      preferredProvider?: string;
      experimentalFeatures?: {
        httpStreaming?: boolean;
      };
    };
    createdAt: number;
    updatedAt: number;
    hasOpenAIKey: boolean;
    hasAnthropicKey: boolean;
    hasOpenRouterKey: boolean;
  } | null;
}

export function ExperimentalFeaturesSection({
  userSettings,
}: ExperimentalFeaturesSectionProps) {
  const updatePreferences = useMutation(api.userSettings.updatePreferences);
  const [isSaving, setIsSaving] = useState(false);

  const httpStreamingEnabled = 
    userSettings?.preferences?.experimentalFeatures?.httpStreaming ?? false;

  const handleToggleHttpStreaming = async (checked: boolean) => {
    if (!userSettings) return;
    
    setIsSaving(true);
    try {
      await updatePreferences({
        defaultModel: userSettings.preferences?.defaultModel as any,
        preferredProvider: userSettings.preferences?.preferredProvider as any,
        experimentalFeatures: {
          httpStreaming: checked,
        },
      });
    } catch (error) {
      console.error("Failed to update experimental features:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold tracking-tight flex items-center gap-2">
          <FlaskConical className="w-5 h-5" />
          Experimental Features
          <Badge variant="secondary" className="text-xs">Beta</Badge>
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Try out new features before they're officially released
        </p>
      </div>

      <div className="space-y-6">
        {/* HTTP Streaming Toggle */}
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium">HTTP Streaming</h3>
              <Badge variant="outline" className="text-xs">New</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Use HTTP streaming with 200ms server-side batching for ~75% fewer database writes during message streaming.
            </p>
            <div className="flex items-start gap-2 mt-2">
              <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-muted-foreground">
                This feature is experimental and may have bugs. Your feedback helps us improve!
              </p>
            </div>
          </div>
          <Switch
            checked={httpStreamingEnabled}
            onCheckedChange={handleToggleHttpStreaming}
            disabled={isSaving}
            aria-label="Toggle HTTP streaming"
          />
        </div>

        {/* Performance Impact Notice */}
        {httpStreamingEnabled && (
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
              HTTP Streaming Active
            </h4>
            <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
              <li>• Messages stream via HTTP with 200ms batching</li>
              <li>• Reduces database load by ~75% during streaming</li>
              <li>• Same smooth UI experience with optimized backend</li>
              <li>• Report any issues to help us improve</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}