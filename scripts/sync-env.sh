#!/bin/bash

set -e  # Exit on error

# Configuration
ENV_FILE=".env.local"
REQUIRED_VARS=("OPENAI_API_KEY" "ANTHROPIC_API_KEY" "EXA_API_KEY")
OPTIONAL_VARS=("GOOGLE_API_KEY" "AUTH_GITHUB_ID" "AUTH_GITHUB_SECRET" "SITE_URL" "JWT_PRIVATE_KEY" "JWKS")

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

# Check if .env.local exists
if [ ! -f "$ENV_FILE" ]; then
    log_error "$ENV_FILE file not found"
    echo "Create $ENV_FILE with your environment variables"
    echo "Example:"
    echo "NEXT_PUBLIC_CONVEX_URL=http://127.0.0.1:3210"
    echo "OPENAI_API_KEY=your_openai_key_here"
    echo "AUTH_GITHUB_ID=your_github_oauth_client_id"
    echo "AUTH_GITHUB_SECRET=your_github_oauth_client_secret"
    echo "SITE_URL=http://localhost:3000"
    echo "JWT_PRIVATE_KEY=your_jwt_private_key_here"
    echo "JWKS=your_jwks_here"
    exit 1
fi

log_info "Loading environment variables from $ENV_FILE"

# Function to safely load environment variables
load_env_vars() {
    # Use a more robust approach to load env vars
    # Only process lines that match the KEY=value pattern
    while IFS= read -r line; do
        # Skip empty lines and comments
        [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue

        # Only process lines that look like KEY=value
        if [[ "$line" =~ ^[A-Za-z_][A-Za-z0-9_]*= ]]; then
            # Strip inline comments (everything after #)
            clean_line=$(echo "$line" | sed 's/[[:space:]]*#.*$//')

            # Strip quotes from values if present
            if [[ "$clean_line" =~ ^([A-Za-z_][A-Za-z0-9_]*)=\"(.*)\"$ ]]; then
                # Handle double quotes
                var_name="${BASH_REMATCH[1]}"
                var_value="${BASH_REMATCH[2]}"
                export "$var_name=$var_value"
            elif [[ "$clean_line" =~ ^([A-Za-z_][A-Za-z0-9_]*)=\'(.*)\'$ ]]; then
                # Handle single quotes
                var_name="${BASH_REMATCH[1]}"
                var_value="${BASH_REMATCH[2]}"
                export "$var_name=$var_value"
            else
                # No quotes, export as is
                export "$clean_line"
            fi
        fi
    done < "$ENV_FILE"
}

# Load environment variables safely
load_env_vars

# Sync function
sync_var() {
    local var_name=$1
    local is_required=${2:-false}
    local var_value=${!var_name}

    if [ -n "$var_value" ]; then
        npx convex env set "$var_name" "$var_value" > /dev/null 2>&1
        log_success "Synced $var_name"
    else
        if [ "$is_required" = true ]; then
            log_error "$var_name is required but not found in $ENV_FILE"
            exit 1
        else
            log_warning "$var_name not found (optional)"
        fi
    fi
}

# Sync required variables
log_info "Syncing required environment variables..."
for var in "${REQUIRED_VARS[@]}"; do
    sync_var "$var" true
done

# Sync optional variables
log_info "Syncing optional environment variables..."
for var in "${OPTIONAL_VARS[@]}"; do
    sync_var "$var" false
done

log_success "Environment sync complete!"
log_info "Run 'pnpm env:check' to verify synced variables"
