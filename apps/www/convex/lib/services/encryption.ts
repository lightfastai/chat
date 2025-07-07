/**
 * Convex-specific encryption service
 *
 * Uses environment variables for the encryption key configuration.
 */

import { createEncryptionService } from "@repo/utils/encryption";
import { env } from "../../env";

// Create and export the encryption service instance
// Uses JWT_PRIVATE_KEY as primary, or ENCRYPTION_KEY as fallback
export const encryptionService = createEncryptionService(env.ENCRYPTION_KEY);

// Export convenience methods that match the old API
export const { encrypt, decrypt } = encryptionService;
