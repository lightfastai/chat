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
    echo "Usage: $0 <username>/<feature_name> [options]"
    echo ""
    echo "Creates a new worktree for feature development with automated setup:"
    echo "  - Creates worktree at worktrees/<feature_name>"
    echo "  - Creates branch <username>/<feature_name>"
    echo "  - Installs dependencies with pnpm"
    echo "  - Sets up isolated Convex dev environment"
    echo "  - Syncs environment variables"
    echo ""
    echo "Options:"
    echo "  --no-isolated-convex    Skip creating isolated Convex deployment"
    echo "                          (uses existing shared dev deployment)"
    echo ""
    echo "Branch name must follow the format: <username>/<feature_name>"
    echo ""
    echo "Examples:"
    echo "  $0 jeevanpillay/add-dark-mode"
    echo "  $0 alice/fix-auth --no-isolated-convex"
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

# Check for help flag
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    show_usage
fi

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

# Parse options
CREATE_ISOLATED_CONVEX=true
shift # Remove branch name from arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --no-isolated-convex)
            CREATE_ISOLATED_CONVEX=false
            shift
            ;;
        *)
            log_error "Unknown option: $1"
            show_usage
            ;;
    esac
done

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

# Pull environment variables from Vercel
log_info "Pulling environment variables from Vercel..."
if command -v vercel > /dev/null 2>&1; then
    # Try to pull env vars from Vercel
    if vercel env pull .env.local --yes 2>/dev/null; then
        log_success "Environment variables pulled from Vercel"
    else
        log_warning "Failed to pull environment variables from Vercel"
        # Fall back to copying from project root if exists
        if [ -f "$PROJECT_ROOT/.env.local" ]; then
            log_info "Copying environment configuration from project root..."
            cp "$PROJECT_ROOT/.env.local" ".env.local"
            log_success "Environment configuration copied"
        else
            log_error "No .env.local found and Vercel pull failed"
            log_info "You need to create .env.local with required environment variables"
            exit 1
        fi
    fi
else
    log_warning "Vercel CLI not found"
    # Fall back to copying from project root if exists
    if [ -f "$PROJECT_ROOT/.env.local" ]; then
        log_info "Copying environment configuration from project root..."
        cp "$PROJECT_ROOT/.env.local" ".env.local"
        log_success "Environment configuration copied"
    else
        log_error ".env.local not found in project root and Vercel CLI not available"
        exit 1
    fi
fi

# Copy convex.json if it exists
if [ -f "$PROJECT_ROOT/convex.json" ]; then
    cp "$PROJECT_ROOT/convex.json" .
fi

# Set up Convex deployment
if [ "$CREATE_ISOLATED_CONVEX" = true ]; then
    log_info "Setting up isolated Convex dev deployment..."
else
    log_info "Setting up shared Convex dev deployment..."
fi

if command -v npx > /dev/null 2>&1 && [ "$CREATE_ISOLATED_CONVEX" = true ]; then
    # Create a name for the isolated deployment
    DEV_NAME="${FEATURE_NAME}-dev"
    
    log_info "Preparing for isolated Convex deployment: $DEV_NAME"
    
    # Check if Convex directory exists
    if [ ! -d "$PROJECT_ROOT/convex" ]; then
        log_error "Convex directory not found. Please ensure convex/ exists in the project root"
        exit 1
    fi
    
    # Copy Convex functions
    cp -r "$PROJECT_ROOT/convex" .
    
    # Create a marker in .env.local for isolated deployment
    echo "" >> .env.local
    echo "# Isolated Convex deployment (to be configured)" >> .env.local
    echo "CONVEX_DEPLOYMENT=$DEV_NAME" >> .env.local
    
    log_warning "Automatic isolated Convex deployment requires interactive setup"
    log_info ""
    log_info "To create an isolated Convex deployment, follow these steps:"
    log_info "1. cd $WORKTREE_PATH"
    log_info "2. Run: npx convex dev"
    log_info "3. When prompted:"
    log_info "   - Choose 'create a new project'"
    log_info "   - Name it: $DEV_NAME"
    log_info "4. Once created, the new Convex URL will be automatically set in .env.local"
    log_info "5. Run: pnpm env:sync (to sync other env vars to the new deployment)"
    log_info ""
    log_success "Worktree prepared for isolated Convex deployment"
elif command -v npx > /dev/null 2>&1 && [ "$CREATE_ISOLATED_CONVEX" = false ]; then
    # Use shared Convex deployment - just sync environment variables
    if [ -f "$PROJECT_ROOT/scripts/sync-env.sh" ]; then
        log_info "Syncing environment variables to shared Convex deployment..."
        bash "$PROJECT_ROOT/scripts/sync-env.sh"
        log_success "Environment variables synced to Convex"
    else
        log_warning "Environment sync script not found"
    fi
else
    log_warning "npx not available, skipping Convex setup"
fi

log_success "Worktree setup complete!"
log_info ""
log_info "Next steps:"
log_info "1. cd $WORKTREE_PATH"
log_info "2. Start development servers:"
log_info "   - Run 'pnpm dev:all' for concurrent Next.js + Convex development"
log_info "   - Or run 'pnpm dev' and 'pnpm convex:dev' in separate terminals"
log_info "3. Make your changes and commit"
log_info "4. Push with: git push -u origin $BRANCH_NAME"
log_info ""
log_info "To clean up later:"
log_info "1. Remove the worktree: git worktree remove $WORKTREE_PATH"
if [ "$CREATE_ISOLATED_CONVEX" = true ]; then
    log_info "2. Delete the Convex dev deployment (optional):"
    log_info "   Use ./scripts/cleanup-worktree.sh $FEATURE_NAME"
    log_info ""
    log_info "Note: The isolated Convex deployment ($DEV_NAME) will remain active"
    log_info "until manually deleted. This allows you to preserve data if needed."
fi
