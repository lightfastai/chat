/**
 * Convex-specific encryption service
 * 
 * Provides a singleton encryption service that uses environment variables
 * for the encryption key configuration.
 */

import { createEncryptionService, type EncryptionService } from "@repo/utils/encryption";
import { env } from "../env";

let encryptionService: EncryptionService | null = null;

/**
 * Get or create the encryption service instance
 * 
 * Uses ENCRYPTION_KEY or falls back to JWT_PRIVATE_KEY from environment.
 * The service is cached as a singleton for performance.
 */
export function getEncryptionService(): EncryptionService {
	if (!encryptionService) {
		const encryptionKey = env.ENCRYPTION_KEY || env.JWT_PRIVATE_KEY;

		if (!encryptionKey) {
			throw new Error(
				"ENCRYPTION_KEY or JWT_PRIVATE_KEY must be set for API key encryption",
			);
		}

		encryptionService = createEncryptionService(encryptionKey);
	}

	return encryptionService;
}

/**
 * Encrypt sensitive data using the shared encryption service
 */
export async function encrypt(plaintext: string): Promise<string> {
	const service = getEncryptionService();
	return await service.encrypt(plaintext);
}

/**
 * Decrypt sensitive data using the shared encryption service
 */
export async function decrypt(encryptedData: string): Promise<string> {
	const service = getEncryptionService();
	return await service.decrypt(encryptedData);
}

/**
 * Clear the cached encryption service (useful for testing)
 */
export function clearEncryptionService(): void {
	if (encryptionService) {
		encryptionService.clearKey();
		encryptionService = null;
	}
}