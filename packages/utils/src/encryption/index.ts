/**
 * Encryption utilities for secure data storage
 * Uses Web Crypto API for proper encryption/decryption with AES-GCM
 */

export interface EncryptionOptions {
	algorithm?: string;
	ivLength?: number;
}

/**
 * AES-GCM encryption utility class
 *
 * Provides secure encryption/decryption for sensitive data like API keys.
 * Uses a configurable encryption key and secure random IVs.
 */
export class EncryptionService {
	private key: CryptoKey | null = null;
	private readonly algorithm: string;
	private readonly ivLength: number;

	constructor(
		private readonly encryptionKey: string,
		options: EncryptionOptions = {},
	) {
		if (!encryptionKey) {
			throw new Error("Encryption key is required");
		}

		this.algorithm = options.algorithm || "AES-GCM";
		this.ivLength = options.ivLength || 12; // 96-bit IV for GCM
	}

	/**
	 * Initialize the crypto key from the provided encryption key string
	 */
	private async initializeKey(): Promise<CryptoKey> {
		if (this.key) {
			return this.key;
		}

		// Use first 32 bytes of the key string for AES-256
		const keyData = new TextEncoder().encode(
			this.encryptionKey.slice(0, 32).padEnd(32, "0"),
		);

		this.key = await crypto.subtle.importKey(
			"raw",
			keyData,
			{ name: this.algorithm },
			false,
			["encrypt", "decrypt"],
		);

		return this.key;
	}

	/**
	 * Encrypt sensitive data using AES-GCM
	 *
	 * @param plaintext - The data to encrypt
	 * @returns Base64-encoded encrypted data with IV prepended
	 */
	async encrypt(plaintext: string): Promise<string> {
		const key = await this.initializeKey();
		const iv = crypto.getRandomValues(new Uint8Array(this.ivLength));
		const encodedText = new TextEncoder().encode(plaintext);

		const encrypted = await crypto.subtle.encrypt(
			{ name: this.algorithm, iv },
			key,
			encodedText,
		);

		// Combine IV and encrypted data
		const combined = new Uint8Array(iv.length + encrypted.byteLength);
		combined.set(iv);
		combined.set(new Uint8Array(encrypted), iv.length);

		// Return base64 encoded result
		return btoa(String.fromCharCode(...combined));
	}

	/**
	 * Decrypt sensitive data using AES-GCM
	 *
	 * @param encryptedData - Base64-encoded encrypted data with IV prepended
	 * @returns The decrypted plaintext
	 */
	async decrypt(encryptedData: string): Promise<string> {
		const key = await this.initializeKey();

		// Decode from base64
		const combined = new Uint8Array(
			atob(encryptedData)
				.split("")
				.map((char) => char.charCodeAt(0)),
		);

		// Extract IV and encrypted data
		const iv = combined.slice(0, this.ivLength);
		const encrypted = combined.slice(this.ivLength);

		const decrypted = await crypto.subtle.decrypt(
			{ name: this.algorithm, iv },
			key,
			encrypted,
		);

		return new TextDecoder().decode(decrypted);
	}

	/**
	 * Clear the cached key (useful for security or testing)
	 */
	clearKey(): void {
		this.key = null;
	}
}

/**
 * Factory function to create an encryption service with default options
 *
 * @param encryptionKey - The encryption key to use
 * @param options - Optional configuration
 * @returns A new EncryptionService instance
 */
export function createEncryptionService(
	encryptionKey: string,
	options?: EncryptionOptions,
): EncryptionService {
	return new EncryptionService(encryptionKey, options);
}
