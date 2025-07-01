/**
 * Server-side encryption utilities for secure API key storage
 * Uses Web Crypto API for proper encryption/decryption
 */

import { env } from "../env.js"

// Get encryption key from environment
const getEncryptionKey = async (): Promise<CryptoKey> => {
  const keyString = env.ENCRYPTION_KEY || env.JWT_PRIVATE_KEY

  if (!keyString) {
    throw new Error(
      "ENCRYPTION_KEY or JWT_PRIVATE_KEY must be set for API key encryption",
    )
  }

  // Use first 32 bytes of the key string for AES-256
  const keyData = new TextEncoder().encode(
    keyString.slice(0, 32).padEnd(32, "0"),
  )

  return await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  )
}

/**
 * Encrypt sensitive data using AES-GCM
 */
export async function encrypt(plaintext: string): Promise<string> {
  const key = await getEncryptionKey()
  const iv = crypto.getRandomValues(new Uint8Array(12)) // 96-bit IV for GCM
  const encodedText = new TextEncoder().encode(plaintext)

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encodedText,
  )

  // Combine IV and encrypted data
  const combined = new Uint8Array(iv.length + encrypted.byteLength)
  combined.set(iv)
  combined.set(new Uint8Array(encrypted), iv.length)

  // Return base64 encoded result
  return btoa(String.fromCharCode(...combined))
}

/**
 * Decrypt sensitive data using AES-GCM
 */
export async function decrypt(encryptedData: string): Promise<string> {
  const key = await getEncryptionKey()

  // Decode from base64
  const combined = new Uint8Array(
    atob(encryptedData)
      .split("")
      .map((char) => char.charCodeAt(0)),
  )

  // Extract IV and encrypted data
  const iv = combined.slice(0, 12)
  const encrypted = combined.slice(12)

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    encrypted,
  )

  return new TextDecoder().decode(decrypted)
}
