/**
 * Model Capability Utilities
 *
 * Centralized utilities for checking model capabilities and enforcing
 * client-side and server-side guards for feature support.
 */

import { type ModelFeatures, type ModelId, getModelConfig } from "./schemas";

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
 * Check if a model supports a specific capability
 */
export function modelSupportsCapability(
	modelId: ModelId,
	capability: keyof ModelFeatures,
): boolean {
	const config = getModelConfig(modelId);
	return config.features[capability] === true;
}

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
 * Determine attachment type from file type or name
 */
export function getAttachmentType(
	fileType: string,
	fileName?: string,
): AttachmentType {
	if (fileType.startsWith("image/")) {
		return "image";
	}

	if (
		fileType === "application/pdf" ||
		fileName?.toLowerCase().endsWith(".pdf")
	) {
		return "pdf";
	}

	// Text files, Word docs, etc.
	if (
		fileType.startsWith("text/") ||
		fileType === "application/msword" ||
		fileType ===
			"application/vnd.openxmlformats-officedocument.wordprocessingml.document"
	) {
		return "document";
	}

	return "unknown";
}

/**
 * Check if a model can handle a specific attachment type
 */
export function modelSupportsAttachment(
	modelId: ModelId,
	attachmentType: AttachmentType,
): boolean {
	const config = getModelConfig(modelId);

	switch (attachmentType) {
		case "image":
			return config.features.vision === true;
		case "pdf":
			return config.features.pdfSupport === true;
		case "document":
			// Most models can handle document descriptions
			return true;
		case "unknown":
			// Unknown files are treated as generic attachments
			return true;
		default:
			return false;
	}
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
	const incompatibleAttachments: Array<{
		name: string;
		type: AttachmentType;
		reason: string;
	}> = [];

	const suggestedModelSet = new Set<ModelId>();

	for (const attachment of attachments) {
		const attachmentType = getAttachmentType(attachment.type, attachment.name);

		if (!modelSupportsAttachment(modelId, attachmentType)) {
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

			suggestedModels.forEach((model) => suggestedModelSet.add(model));
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

/**
 * Check if model requires warning about missing capabilities
 */
export function shouldWarnAboutCapabilities(
	modelId: ModelId,
	attachments: Array<{ type: string; name: string }>,
): boolean {
	const validation = validateAttachmentsForModel(modelId, attachments);
	return !validation.isValid;
}
