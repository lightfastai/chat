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
    echo "Usage: $0 <feature_name>"
    echo ""
    echo "Cleans up a worktree and optionally its Convex deployment:"
    echo "  - Removes the git worktree"
    echo "  - Deletes the local branch (if not in use)"
    echo "  - Optionally deletes the Convex dev deployment"
    echo ""
    echo "Example: $0 add-dark-mode"
    exit 1
}

# Check for help flag
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    show_usage
fi

# Check if feature name provided
if [ -z "$1" ]; then
    log_error "Feature name is required"
    show_usage
fi

FEATURE_NAME="$1"
WORKTREE_PATH="$WORKTREE_DIR/$FEATURE_NAME"

log_info "Cleaning up worktree: $FEATURE_NAME"

# Ensure we're in the project root
cd "$PROJECT_ROOT"

# Check if worktree exists
if [ ! -d "$WORKTREE_PATH" ]; then
    log_error "Worktree not found at $WORKTREE_PATH"
    exit 1
fi

# Get the branch name from the worktree
BRANCH_NAME=$(git worktree list --porcelain | grep -A 1 "worktree $PROJECT_ROOT/$WORKTREE_PATH" | grep "branch" | cut -d' ' -f3)

if [ -z "$BRANCH_NAME" ]; then
    log_error "Could not determine branch name for worktree"
    exit 1
fi

log_info "Found branch: $BRANCH_NAME"

# Check for Convex deployment in the worktree
DEV_NAME="${FEATURE_NAME}-dev"
CONVEX_DEPLOYMENT_EXISTS=false

if [ -f "$WORKTREE_PATH/.env.local" ]; then
    if grep -q "CONVEX_DEPLOYMENT=$DEV_NAME" "$WORKTREE_PATH/.env.local"; then
        CONVEX_DEPLOYMENT_EXISTS=true
        log_info "Found isolated Convex deployment: $DEV_NAME"
    fi
fi

# Remove the worktree
log_info "Removing worktree..."
if git worktree remove "$WORKTREE_PATH" --force; then
    log_success "Worktree removed"
else
    log_error "Failed to remove worktree"
    exit 1
fi

# Try to delete the local branch
log_info "Attempting to delete local branch..."
if git branch -d "$BRANCH_NAME" 2>/dev/null; then
    log_success "Local branch deleted"
elif git branch -D "$BRANCH_NAME" 2>/dev/null; then
    log_warning "Local branch force deleted (had unmerged changes)"
else
    log_warning "Could not delete local branch (may still be checked out elsewhere)"
fi

# Ask about Convex deployment cleanup
if [ "$CONVEX_DEPLOYMENT_EXISTS" = true ]; then
    echo ""
    log_warning "Found isolated Convex deployment: $DEV_NAME"
    echo -n "Do you want to delete this Convex deployment? (y/N): "
    read -r response
    
    if [[ "$response" =~ ^[Yy]$ ]]; then
        log_info "Deleting Convex deployment..."
        
        # Note: This is a placeholder command as Convex doesn't have a direct delete command
        # In practice, dev deployments are cleaned up automatically after inactivity
        log_warning "Convex dev deployments are automatically cleaned up after 7 days of inactivity"
        log_info "To manually clean up, visit: https://dashboard.convex.dev/"
    else
        log_info "Keeping Convex deployment: $DEV_NAME"
    fi
fi

log_success "Cleanup complete!"

# Show summary
echo ""
log_info "Summary:"
log_success "✓ Worktree removed: $WORKTREE_PATH"
if git show-ref --verify --quiet "refs/heads/$BRANCH_NAME"; then
    log_warning "⚠ Local branch still exists: $BRANCH_NAME"
else
    log_success "✓ Local branch deleted: $BRANCH_NAME"
fi

if [ "$CONVEX_DEPLOYMENT_EXISTS" = true ]; then
    log_info "ℹ Convex deployment: $DEV_NAME (check dashboard for status)"
fi