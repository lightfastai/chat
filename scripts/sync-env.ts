#!/usr/bin/env node

import { execSync, spawnSync } from "node:child_process"
import { readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Configuration
const ENV_FILE = ".env.local"

// Define environment variables that need to be synced to Convex
// These are variables that Convex functions actually use
const CONVEX_REQUIRED_VARS = [
  "EXA_API_KEY",
  "OPENROUTER_API_KEY",
  "JWT_PRIVATE_KEY",
  "ANTHROPIC_API_KEY",
  "OPENAI_API_KEY",
  "JWKS",
  "AUTH_GITHUB_ID",
  "AUTH_GITHUB_SECRET",
] as const

const CONVEX_OPTIONAL_VARS = [
  "ENCRYPTION_KEY",
  "CONVEX_SITE_URL",
  "NODE_ENV",
] as const

// Next.js requires these but they don't need to be synced to Convex
const NEXTJS_ONLY_VARS = ["NEXT_PUBLIC_CONVEX_URL"] as const

type ConvexRequiredVar = (typeof CONVEX_REQUIRED_VARS)[number]
type ConvexOptionalVar = (typeof CONVEX_OPTIONAL_VARS)[number]
type NextJsOnlyVar = (typeof NEXTJS_ONLY_VARS)[number]
type EnvVar = ConvexRequiredVar | ConvexOptionalVar | NextJsOnlyVar

interface Colors {
  red: string
  green: string
  yellow: string
  blue: string
  reset: string
}

interface Logger {
  info: (msg: string) => void
  success: (msg: string) => void
  warning: (msg: string) => void
  error: (msg: string) => void
}

// Colors for output
const colors: Colors = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  reset: "\x1b[0m",
}

// Logging functions
const log: Logger = {
  info: (msg: string) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  success: (msg: string) =>
    console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  warning: (msg: string) =>
    console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  error: (msg: string) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
}

/**
 * Parse environment variables from .env.local file
 * Handles multi-line values (like JWT_PRIVATE_KEY) properly
 */
function parseEnvFile(envPath: string): Record<string, string> {
  try {
    const content = readFileSync(envPath, "utf8")
    const envVars: Record<string, string> = {}

    // Split by lines and process
    const lines = content.split("\n")
    let currentKey: string | null = null
    let currentValue = ""
    let inMultiLine = false

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()

      // Skip empty lines and comments
      if (!line || line.startsWith("#")) {
        continue
      }

      // Check if we're continuing a multi-line value
      if (inMultiLine) {
        // Check if this line ends the multi-line value
        if (line.endsWith('"') && !line.endsWith('\\"')) {
          currentValue += `\n${line.slice(0, -1)}` // Remove ending quote
          if (currentKey) {
            envVars[currentKey] = currentValue
          }
          currentKey = null
          currentValue = ""
          inMultiLine = false
        } else {
          currentValue += `\n${line}`
        }
        continue
      }

      // Look for KEY=value pattern
      const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
      if (!match) {
        continue
      }

      const [, key, value] = match

      // Handle quoted values
      if (value.startsWith('"') && value.endsWith('"') && value.length > 1) {
        // Single-line quoted value
        envVars[key] = value.slice(1, -1)
      } else if (value.startsWith('"') && !value.endsWith('"')) {
        // Start of multi-line quoted value
        currentKey = key
        currentValue = value.slice(1) // Remove starting quote
        inMultiLine = true
      } else if (
        value.startsWith("'") &&
        value.endsWith("'") &&
        value.length > 1
      ) {
        // Single-line single-quoted value
        envVars[key] = value.slice(1, -1)
      } else {
        // Unquoted value - remove inline comments
        const cleanValue = value.split("#")[0].trim()
        envVars[key] = cleanValue
      }
    }

    return envVars
  } catch (error) {
    throw new Error(
      `Failed to read ${envPath}: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

/**
 * Sync a single environment variable to Convex
 */
async function syncVar(
  varName: string,
  value: string | undefined,
  isRequired = false,
): Promise<boolean> {
  if (value !== undefined && value !== "") {
    try {
      // For JWT_PRIVATE_KEY and multi-line values, we need to handle them specially
      if (varName === "JWT_PRIVATE_KEY" || varName === "JWKS") {
        // Validate JWT format
        if (varName === "JWT_PRIVATE_KEY" && !value.includes("-----BEGIN")) {
          log.warning(
            `${varName} doesn't appear to be a valid private key format`,
          )
        }

        if (varName === "JWKS") {
          try {
            JSON.parse(value)
          } catch {
            log.warning(`${varName} doesn't appear to be valid JSON`)
          }
        }
      }

      // For multi-line values like JWT keys, use NAME=value format to avoid parsing issues
      if (
        varName === "JWT_PRIVATE_KEY" ||
        varName === "JWKS" ||
        value.includes("\n") ||
        value.length > 1000
      ) {
        // Use NAME=value format for multi-line values to avoid command option parsing
        const nameValuePair = `${varName}=${value}`
        const result = spawnSync(
          "npx",
          ["convex", "env", "set", nameValuePair],
          {
            stdio: ["inherit", "pipe", "pipe"],
            encoding: "utf8",
          },
        )

        if (result.status !== 0) {
          throw new Error(
            `Convex command failed: ${result.stderr || result.stdout || "Unknown error"}`,
          )
        }
      } else {
        // Use JSON.stringify to properly escape the value for shell execution
        const escapedValue = JSON.stringify(value)
        execSync(`npx convex env set ${varName} ${escapedValue}`, {
          stdio: ["inherit", "pipe", "pipe"],
          encoding: "utf8",
        })
      }
      log.success(`Synced ${varName}`)
      return true
    } catch (error) {
      log.error(
        `Failed to sync ${varName}: ${error instanceof Error ? error.message : String(error)}`,
      )
      if (isRequired) {
        throw error
      }
      return false
    }
  } else {
    if (isRequired) {
      log.error(`${varName} is required but not found in ${ENV_FILE}`)
      throw new Error(`Missing required variable: ${varName}`)
    }
    log.warning(`${varName} not found (optional)`)
    return false
  }
}

/**
 * Check if Convex deployment exists and is accessible
 */
function checkConvexDeployment(): boolean {
  try {
    execSync("npx convex env list", { stdio: "pipe" })
    return true
  } catch (error) {
    log.error("Cannot connect to Convex deployment")
    log.info(
      'Make sure you have run "npx convex dev" or "npx convex deploy" first',
    )
    log.info("Or check if your NEXT_PUBLIC_CONVEX_URL is correct in .env.local")
    return false
  }
}

/**
 * Validate environment variables against schemas
 */
function validateEnvironmentVariables(envVars: Record<string, string>): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  // Validate Next.js required vars
  const nextJsRequiredVars = [
    "OPENAI_API_KEY",
    "ANTHROPIC_API_KEY",
    "OPENROUTER_API_KEY",
    "EXA_API_KEY",
    "JWT_PRIVATE_KEY",
    "JWKS",
    "NEXT_PUBLIC_CONVEX_URL",
  ]

  for (const varName of nextJsRequiredVars) {
    if (!envVars[varName] || envVars[varName].trim() === "") {
      errors.push(`Missing required Next.js environment variable: ${varName}`)
    }
  }

  // Validate Convex required vars
  for (const varName of CONVEX_REQUIRED_VARS) {
    if (!envVars[varName] || envVars[varName].trim() === "") {
      errors.push(`Missing required Convex environment variable: ${varName}`)
    }
  }

  // Validate specific formats
  if (
    envVars.NEXT_PUBLIC_CONVEX_URL &&
    !envVars.NEXT_PUBLIC_CONVEX_URL.startsWith("http")
  ) {
    errors.push("NEXT_PUBLIC_CONVEX_URL must be a valid URL")
  }

  if (envVars.CONVEX_SITE_URL && !envVars.CONVEX_SITE_URL.startsWith("http")) {
    errors.push("CONVEX_SITE_URL must be a valid URL")
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * Find the .env.local file in possible locations
 */
function findEnvFile(): string {
  const possiblePaths = [
    // Current working directory (root)
    path.resolve(process.cwd(), ENV_FILE),
    // Parent directory (if running from subdirectory)
    path.resolve(process.cwd(), "..", ENV_FILE),
    // Two levels up (if running from nested subdirectory)
    path.resolve(process.cwd(), "..", "..", ENV_FILE),
  ]

  for (const envPath of possiblePaths) {
    try {
      readFileSync(envPath, "utf8")
      log.info(`Found environment file at: ${envPath}`)
      return envPath
    } catch {
      // Continue to next path
    }
  }

  return ""
}

/**
 * Main sync function
 */
async function syncEnvironment(): Promise<void> {
  try {
    // Find .env.local file
    const envPath = findEnvFile()

    if (!envPath) {
      log.error(`${ENV_FILE} file not found in any of the expected locations`)
      console.log("Expected locations:")
      console.log("  - Current directory (root)")
      console.log("  - Parent directory (if running from subdirectory)")
      console.log("")
      console.log(`Create ${ENV_FILE} with your environment variables`)
      console.log("Example:")
      console.log("NEXT_PUBLIC_CONVEX_URL=http://127.0.0.1:3210")
      console.log("OPENAI_API_KEY=your_openai_key_here")
      console.log("ANTHROPIC_API_KEY=your_anthropic_key_here")
      console.log("OPENROUTER_API_KEY=your_openrouter_key_here")
      console.log("EXA_API_KEY=your_exa_api_key_here")
      console.log("AUTH_GITHUB_ID=your_github_oauth_client_id")
      console.log("AUTH_GITHUB_SECRET=your_github_oauth_client_secret")
      console.log('JWT_PRIVATE_KEY="your_jwt_private_key_here"')
      console.log("JWKS='{\"keys\":[...]}'")
      process.exit(1)
    }

    log.info(`Loading environment variables from ${envPath}`)

    // Parse environment variables
    const envVars = parseEnvFile(envPath)

    // Validate environment variables
    log.info("Validating environment variables...")
    const validation = validateEnvironmentVariables(envVars)
    if (!validation.isValid) {
      for (const error of validation.errors) {
        log.error(error)
      }
      log.error("Please fix the above errors before syncing")
      process.exit(1)
    }
    log.success("Environment variables validated successfully")

    // Check Convex deployment connectivity
    if (!checkConvexDeployment()) {
      process.exit(1)
    }

    // Sync only Convex-specific required variables
    log.info("Syncing required Convex environment variables...")
    for (const varName of CONVEX_REQUIRED_VARS) {
      await syncVar(varName, envVars[varName], true)
    }

    // Sync only Convex-specific optional variables
    log.info("Syncing optional Convex environment variables...")
    for (const varName of CONVEX_OPTIONAL_VARS) {
      // Force NODE_ENV to development when running sync
      if (varName === "NODE_ENV") {
        await syncVar(varName, "development", false)
      } else {
        await syncVar(varName, envVars[varName], false)
      }
    }

    // Show info about Next.js-only variables
    log.info("The following variables are used by Next.js only and not synced:")
    for (const varName of NEXTJS_ONLY_VARS) {
      if (envVars[varName]) {
        log.info(`  - ${varName} ✓`)
      } else {
        log.warning(`  - ${varName} (not set)`)
      }
    }

    log.success("Environment sync complete!")
    log.info("Run 'pnpm env:check' to verify synced variables")
  } catch (error) {
    log.error(
      `Sync failed: ${error instanceof Error ? error.message : String(error)}`,
    )
    process.exit(1)
  }
}

// Run the sync
syncEnvironment()
