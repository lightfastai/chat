#!/usr/bin/env tsx

import { execSync } from "node:child_process"
import { readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Configuration
const ENV_FILE = ".env.local"
const REQUIRED_VARS = [
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
  "EXA_API_KEY",
] as const
const OPTIONAL_VARS = [
  "GOOGLE_API_KEY",
  "AUTH_GITHUB_ID",
  "AUTH_GITHUB_SECRET",
  "SITE_URL",
  "JWT_PRIVATE_KEY",
  "JWKS",
] as const

type RequiredVar = (typeof REQUIRED_VARS)[number]
type OptionalVar = (typeof OPTIONAL_VARS)[number]
type EnvVar = RequiredVar | OptionalVar

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

      // Use JSON.stringify to properly escape the value for shell execution
      const escapedValue = JSON.stringify(value)
      execSync(`npx convex env set ${varName} ${escapedValue}`, {
        stdio: ["inherit", "pipe", "pipe"],
        encoding: "utf8",
      })
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
 * Main sync function
 */
async function syncEnvironment(): Promise<void> {
  try {
    // Check if .env.local exists
    const envPath = path.resolve(process.cwd(), ENV_FILE)

    try {
      readFileSync(envPath, "utf8")
    } catch {
      log.error(`${ENV_FILE} file not found`)
      console.log(`Create ${ENV_FILE} with your environment variables`)
      console.log("Example:")
      console.log("NEXT_PUBLIC_CONVEX_URL=http://127.0.0.1:3210")
      console.log("OPENAI_API_KEY=your_openai_key_here")
      console.log("AUTH_GITHUB_ID=your_github_oauth_client_id")
      console.log("AUTH_GITHUB_SECRET=your_github_oauth_client_secret")
      console.log("SITE_URL=http://localhost:3000")
      console.log('JWT_PRIVATE_KEY="your_jwt_private_key_here"')
      console.log("JWKS='{\"keys\":[...]}'")
      process.exit(1)
    }

    log.info(`Loading environment variables from ${ENV_FILE}`)

    // Parse environment variables
    const envVars = parseEnvFile(envPath)

    // Check Convex deployment connectivity
    if (!checkConvexDeployment()) {
      process.exit(1)
    }

    // Sync required variables
    log.info("Syncing required environment variables...")
    for (const varName of REQUIRED_VARS) {
      await syncVar(varName, envVars[varName], true)
    }

    // Sync optional variables
    log.info("Syncing optional environment variables...")
    for (const varName of OPTIONAL_VARS) {
      await syncVar(varName, envVars[varName], false)
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
