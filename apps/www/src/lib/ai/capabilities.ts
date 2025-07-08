/**
 * Model Capability Utilities
 *
 * Centralized utilities for checking model capabilities and enforcing
 * client-side and server-side guards for feature support.
 */

import {
	type ModelFeatures,
	type ModelId,
	getModelConfig,
} from "@lightfast/ai/providers";

export type AttachmentType = "image" | "pdf" | "document" | "unknown";

export interface ModelCapability {
	key: keyof ModelFeatures;
	icon: string; // Lucide icon name
	label: string;
	description: string;
}

/**
 * Supported model capabilities with their UI representations
 */
export const MODEL_CAPABILITIES: ModelCapability[] = [
	{
		key: "vision",
		icon: "Eye",
		label: "Vision",
		description: "Can analyze images and visual content",
	},
	{
		key: "pdfSupport",
		icon: "FileText",
		label: "PDF",
		description: "Can read and analyze PDF documents",
	},
	{
		key: "functionCalling",
		icon: "Wrench",
		label: "Tools",
		description: "Can use tools and function calls",
	},
	{
		key: "thinking",
		icon: "Brain",
		label: "Reasoning",
		description: "Shows visible reasoning process",
	},
];

/**
 * Get all capabilities supported by a model
 */
export function getModelCapabilities(modelId: ModelId): ModelCapability[] {
	const config = getModelConfig(modelId);
	return MODEL_CAPABILITIES.filter(
		(capability) => config.features[capability.key] === true,
	);
}

/**
 * Validate if attachments are compatible with selected model
 */
export function validateAttachmentsForModel(
	modelId: ModelId,
	attachments: Array<{ type: string; name: string }>,
): {
	isValid: boolean;
	incompatibleAttachments: Array<{
		name: string;
		type: AttachmentType;
		reason: string;
	}>;
	suggestedModels: ModelId[];
} {
	const config = getModelConfig(modelId);
	const incompatibleAttachments: Array<{
		name: string;
		type: AttachmentType;
		reason: string;
	}> = [];

	const suggestedModelSet = new Set<ModelId>();

	for (const attachment of attachments) {
		// Determine attachment type
		let attachmentType: AttachmentType;
		if (attachment.type.startsWith("image/")) {
			attachmentType = "image";
		} else if (
			attachment.type === "application/pdf" ||
			attachment.name?.toLowerCase().endsWith(".pdf")
		) {
			attachmentType = "pdf";
		} else if (
			attachment.type.startsWith("text/") ||
			attachment.type === "application/msword" ||
			attachment.type ===
				"application/vnd.openxmlformats-officedocument.wordprocessingml.document"
		) {
			attachmentType = "document";
		} else {
			attachmentType = "unknown";
		}

		// Check if model supports this attachment type
		let isSupported = false;
		switch (attachmentType) {
			case "image":
				isSupported = config.features.vision === true;
				break;
			case "pdf":
				isSupported = config.features.pdfSupport === true;
				break;
			case "document":
			case "unknown":
				// Most models can handle document descriptions and unknown files
				isSupported = true;
				break;
		}

		if (!isSupported) {
			let reason: string;
			let suggestedModels: ModelId[] = [];

			switch (attachmentType) {
				case "image":
					reason = "This model cannot analyze images";
					suggestedModels = [
						"gpt-4o",
						"gpt-4o-mini",
						"claude-4-sonnet-20250514",
						"claude-3-5-sonnet-20241022",
					];
					break;
				case "pdf":
					reason = "This model cannot read PDF files";
					suggestedModels = [
						"claude-4-sonnet-20250514",
						"claude-3-5-sonnet-20241022",
						"claude-3-7-sonnet-20250219",
					];
					break;
				default:
					reason = "This model cannot process this file type";
					suggestedModels = ["gpt-4o", "claude-4-sonnet-20250514"];
			}

			incompatibleAttachments.push({
				name: attachment.name,
				type: attachmentType,
				reason,
			});

			for (const model of suggestedModels) {
				suggestedModelSet.add(model);
			}
		}
	}

	return {
		isValid: incompatibleAttachments.length === 0,
		incompatibleAttachments,
		suggestedModels: Array.from(suggestedModelSet),
	};
}

/**
 * Get a user-friendly error message for incompatible attachments
 */
export function getIncompatibilityMessage(
	modelDisplayName: string,
	incompatibleAttachments: Array<{
		name: string;
		type: AttachmentType;
		reason: string;
	}>,
	suggestedModels: ModelId[],
): string {
	if (incompatibleAttachments.length === 0) {
		return "";
	}

	const fileTypes = incompatibleAttachments.map((att) => att.type);
	const uniqueTypes = Array.from(new Set(fileTypes));

	let message = `${modelDisplayName} cannot process `;

	if (uniqueTypes.includes("image") && uniqueTypes.includes("pdf")) {
		message += "images or PDF files";
	} else if (uniqueTypes.includes("image")) {
		message += "images";
	} else if (uniqueTypes.includes("pdf")) {
		message += "PDF files";
	} else {
		message += "these file types";
	}

	message += ". ";

	if (suggestedModels.length > 0) {
		const modelConfigs = suggestedModels.map((id) => getModelConfig(id));
		const modelNames = modelConfigs.map((config) => config.displayName);

		if (modelNames.length === 1) {
			message += `Switch to ${modelNames[0]} to analyze your files.`;
		} else if (modelNames.length === 2) {
			message += `Switch to ${modelNames[0]} or ${modelNames[1]} to analyze your files.`;
		} else {
			const lastModel = modelNames.pop();
			message += `Switch to ${modelNames.join(", ")}, or ${lastModel} to analyze your files.`;
		}
	}

	return message;
}
