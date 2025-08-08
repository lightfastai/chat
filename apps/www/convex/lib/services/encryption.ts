/**
 * Convex-specific encryption service
 *
 * Uses ENCRYPTION_KEY environment variable for encryption configuration.
 */

import { createEncryptionService } from "@repo/utils/encryption";
import { env } from "../../env";

// Create and export the encryption service instance
// ENCRYPTION_KEY is required and validated by env schema
export const encryptionService = createEncryptionService(env.ENCRYPTION_KEY);

// Export convenience methods that match the old API
export const { encrypt, decrypt } = encryptionService;
