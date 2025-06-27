/**
 * Server-side Model Capability Guards
 *
 * Validates model capabilities against attachment types to prevent
 * incompatible combinations from reaching the AI providers.
 */

import type { ModelId } from "../../src/lib/ai/schemas.js";
import { getModelById } from "../../src/lib/ai/schemas.js";
import { internal } from "../_generated/api.js";
import type { Id } from "../_generated/dataModel.js";
import type { ActionCtx, QueryCtx } from "../_generated/server.js";

// Type for file with URL (matches the return type of internal.files.getFileWithUrl)
type FileWithUrl = {
	_id: Id<"files">;
	_creationTime: number;
	storageId: string;
	fileName: string;
	fileType: string;
	fileSize: number;
	uploadedBy: Id<"users">;
	uploadedAt: number;
	metadata?: {
		extracted?: boolean;
		extractedText?: string;
		pageCount?: number;
		dimensions?: {
			width: number;
			height: number;
		};
	};
	url: string;
} | null;

export interface AttachmentValidationError {
	code: "VISION_NOT_SUPPORTED" | "PDF_NOT_SUPPORTED" | "FEATURE_NOT_AVAILABLE";
	message: string;
	attachmentName: string;
	attachmentType: string;
	suggestedModels: ModelId[];
}

export interface ValidationResult {
	isValid: boolean;
	errors: AttachmentValidationError[];
}

/**
 * Validate attachments against model capabilities on the server
 */
export async function validateModelCapabilities(
	ctx: ActionCtx | QueryCtx,
	modelId: ModelId,
	attachmentIds?: Id<"files">[],
): Promise<ValidationResult> {
	if (!attachmentIds || attachmentIds.length === 0) {
		return { isValid: true, errors: [] };
	}

	const modelConfig = getModelById(modelId);
	const errors: AttachmentValidationError[] = [];

	// Get file information for each attachment
	for (const fileId of attachmentIds) {
		try {
			const file: FileWithUrl = await ctx.runQuery(
				internal.files.getFileWithUrl,
				{
					fileId,
				},
			);

			if (!file) {
				continue; // Skip missing files
			}

			// Check image support
			if (file.fileType.startsWith("image/")) {
				if (!modelConfig.features.vision) {
					errors.push({
						code: "VISION_NOT_SUPPORTED",
						message: `${modelConfig.displayName} cannot analyze images. Please switch to a model with vision capabilities.`,
						attachmentName: file.fileName,
						attachmentType: file.fileType,
						suggestedModels: [
							"gpt-4o",
							"gpt-4o-mini",
							"claude-4-sonnet-20250514",
							"claude-3-5-sonnet-20241022",
						],
					});
				}
			}

			// Check PDF support
			else if (file.fileType === "application/pdf") {
				if (!modelConfig.features.pdfSupport) {
					errors.push({
						code: "PDF_NOT_SUPPORTED",
						message: `${modelConfig.displayName} cannot read PDF files. Please switch to a Claude model with PDF support.`,
						attachmentName: file.fileName,
						attachmentType: file.fileType,
						suggestedModels: [
							"claude-4-sonnet-20250514",
							"claude-3-5-sonnet-20241022",
							"claude-3-7-sonnet-20250219",
						],
					});
				}
			}
		} catch (error) {
			console.warn(`Failed to validate attachment ${fileId}:`, error);
			// Continue with other files rather than failing entirely
		}
	}

	return {
		isValid: errors.length === 0,
		errors,
	};
}

/**
 * Throw error if model capabilities are incompatible with attachments
 */
export async function enforceModelCapabilities(
	ctx: ActionCtx | QueryCtx,
	modelId: ModelId,
	attachmentIds?: Id<"files">[],
): Promise<void> {
	const validation = await validateModelCapabilities(
		ctx,
		modelId,
		attachmentIds,
	);

	if (!validation.isValid) {
		const firstError = validation.errors[0];
		const errorMessage = `Model capability mismatch: ${firstError.message}`;

		// Log the full validation result for debugging
		console.error("Model capability validation failed:", {
			modelId,
			attachmentIds,
			errors: validation.errors,
		});

		throw new Error(errorMessage);
	}
}

/**
 * Get user-friendly error message for capability mismatches
 */
export function formatCapabilityError(
	errors: AttachmentValidationError[],
): string {
	if (errors.length === 0) {
		return "";
	}

	const imageErrors = errors.filter((e) => e.code === "VISION_NOT_SUPPORTED");
	const pdfErrors = errors.filter((e) => e.code === "PDF_NOT_SUPPORTED");

	let message = "";

	if (imageErrors.length > 0 && pdfErrors.length > 0) {
		message = "This model cannot process images or PDF files.";
	} else if (imageErrors.length > 0) {
		message = "This model cannot analyze images.";
	} else if (pdfErrors.length > 0) {
		message = "This model cannot read PDF files.";
	} else {
		message = "This model cannot process the attached files.";
	}

	// Get suggested models from the first error
	const suggestedModels = errors[0]?.suggestedModels || [];
	if (suggestedModels.length > 0) {
		const modelConfigs = suggestedModels.map((id) => getModelById(id));
		const modelNames = modelConfigs.map((config) => config.displayName);

		if (modelNames.length === 1) {
			message += ` Please switch to ${modelNames[0]}.`;
		} else if (modelNames.length === 2) {
			message += ` Please switch to ${modelNames[0]} or ${modelNames[1]}.`;
		} else {
			const lastModel = modelNames.pop();
			message += ` Please switch to ${modelNames.join(", ")}, or ${lastModel}.`;
		}
	}

	return message;
}
