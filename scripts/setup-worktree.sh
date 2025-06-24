#!/bin/bash

set -e  # Exit on error

# Configuration
WORKTREE_DIR="worktrees"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

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

# Function to show usage
show_usage() {
    echo "Usage: $0 <username>/<feature_name>"
    echo ""
    echo "Creates a new worktree for feature development with automated setup:"
    echo "  - Creates worktree at worktrees/<feature_name>"
    echo "  - Creates branch <username>/<feature_name>"
    echo "  - Installs dependencies with pnpm"
    echo "  - Sets up Convex configuration"
    echo "  - Syncs environment variables"
    echo ""
    echo "Branch name must follow the format: <username>/<feature_name>"
    echo ""
    echo "Example: $0 jeevanpillay/add-dark-mode"
    exit 1
}

# Function to validate branch name format
validate_branch_name() {
    local branch_name="$1"
    
    # Check if branch name follows username/feature pattern
    if [[ ! "$branch_name" =~ ^[a-zA-Z0-9_-]+/[a-zA-Z0-9_-]+$ ]]; then
        log_error "Invalid branch name format: '$branch_name'"
        log_error "Branch name must follow the pattern: <username>/<feature_name>"
        log_error "Examples: jeevanpillay/add-dark-mode, alice/fix-auth, bob/new-feature"
        return 1
    fi
    
    return 0
}

# Check if branch name provided
if [ -z "$1" ]; then
    log_error "Branch name is required"
    show_usage
fi

BRANCH_NAME="$1"
# Validate branch name format
if ! validate_branch_name "$BRANCH_NAME"; then
    exit 1
fi

# Extract feature name for worktree directory
FEATURE_NAME="${BRANCH_NAME#*/}"
WORKTREE_PATH="$WORKTREE_DIR/$FEATURE_NAME"

log_info "Setting up worktree for branch: $BRANCH_NAME"

# Ensure we're in the project root
cd "$PROJECT_ROOT"

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    log_error "Not in a git repository"
    exit 1
fi

# Ensure main branch is up to date
log_info "Ensuring main branch is up to date..."
git checkout main
git pull origin main

# Create worktrees directory if it doesn't exist
mkdir -p "$WORKTREE_DIR"

# Check if worktree already exists
if [ -d "$WORKTREE_PATH" ]; then
    log_error "Worktree already exists at $WORKTREE_PATH"
    exit 1
fi

# Check if branch already exists
if git show-ref --verify --quiet "refs/heads/$BRANCH_NAME"; then
    log_warning "Branch $BRANCH_NAME already exists, using existing branch"
    git worktree add "$WORKTREE_PATH" "$BRANCH_NAME"
else
    log_info "Creating new branch and worktree..."
    git worktree add "$WORKTREE_PATH" -b "$BRANCH_NAME"
fi

log_success "Worktree created at $WORKTREE_PATH"

# Change to worktree directory for setup
cd "$WORKTREE_PATH"

log_info "Installing dependencies with pnpm..."
if command -v pnpm > /dev/null 2>&1; then
    pnpm install
    log_success "Dependencies installed"
else
    log_error "pnpm not found. Please install pnpm first."
    exit 1
fi

# Check if .env.local exists in project root
if [ -f "$PROJECT_ROOT/.env.local" ]; then
    log_info "Copying environment configuration..."
    cp "$PROJECT_ROOT/.env.local" ".env.local"
    log_success "Environment configuration copied"
else
    log_warning ".env.local not found in project root"
    log_info "You may need to create .env.local with required environment variables"
fi

# Set up Convex if npx convex is available
log_info "Setting up Convex configuration..."
if command -v npx > /dev/null 2>&1; then
    # Check if convex directory exists in apps/www
    if [ -d "$WORKTREE_PATH/apps/www/convex" ]; then
        log_info "Convex configuration found, syncing environment variables..."
        
        # Run the environment sync script from apps/www
        if [ -f "$PROJECT_ROOT/scripts/sync-env.ts" ]; then
            cd "$WORKTREE_PATH/apps/www" && pnpm run env:sync
            log_success "Environment variables synced to Convex"
        elif [ -f "$PROJECT_ROOT/scripts/sync-env.sh" ]; then
            bash "$PROJECT_ROOT/scripts/sync-env.sh"
            log_success "Environment variables synced to Convex (using legacy script)"
        else
            log_warning "Environment sync script not found, skipping env sync"
        fi
    else
        log_warning "Convex configuration not found, you may need to run 'npx convex dev' first"
    fi
else
    log_warning "npx not available, skipping Convex setup"
fi

log_success "Worktree setup complete!"
log_info ""
log_info "Next steps:"
log_info "1. cd $WORKTREE_PATH"
log_info "2. Start development servers:"
log_info "   - Run 'pnpm run dev:www' for concurrent Next.js + Convex development"
log_info "   - Or run 'pnpm run dev:next' and 'pnpm run convex:dev' in separate terminals"
log_info "3. Make your changes and commit"
log_info "4. Push with: git push -u origin $BRANCH_NAME"
log_info ""
log_info "To clean up later:"
log_info "git worktree remove $WORKTREE_PATH"