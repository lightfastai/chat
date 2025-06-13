#!/bin/bash

set -e  # Exit on error

# Configuration
WORKTREE_DIR="worktrees"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Port ranges for multiple instances
NEXT_PORT_START=3001
CONVEX_PORT_START=3211

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
    echo "  - Configures unique ports for multi-instance development"
    echo "  - Sets up independent Convex environment"
    echo "  - Syncs environment variables"
    echo ""
    echo "Branch name must follow the format: <username>/<feature_name>"
    echo ""
    echo "Options:"
    echo "  --port <port>           Custom Next.js port (default: auto-assigned)"
    echo "  --convex-port <port>    Custom Convex port (default: auto-assigned)"
    echo "  --local-convex          Use local Convex deployment"
    echo "  --preview-convex        Use Convex preview deployment"
    echo ""
    echo "Examples:"
    echo "  $0 jeevanpillay/add-dark-mode"
    echo "  $0 alice/fix-auth --port 3005 --local-convex"
    echo "  $0 bob/new-feature --preview-convex"
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
    
    # Extract username and feature name
    local username="${branch_name%/*}"
    local feature="${branch_name#*/}"
    
    # Validate username (no empty, no special chars except - and _)
    if [[ -z "$username" || ! "$username" =~ ^[a-zA-Z0-9_-]+$ ]]; then
        log_error "Invalid username: '$username'"
        log_error "Username must contain only letters, numbers, hyphens, and underscores"
        return 1
    fi
    
    # Validate feature name (no empty, no special chars except - and _)
    if [[ -z "$feature" || ! "$feature" =~ ^[a-zA-Z0-9_-]+$ ]]; then
        log_error "Invalid feature name: '$feature'"
        log_error "Feature name must contain only letters, numbers, hyphens, and underscores"
        return 1
    fi
    
    return 0
}

# Function to find next available port
find_available_port() {
    local start_port=$1
    local port=$start_port
    
    while lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; do
        ((port++))
    done
    
    echo $port
}

# Function to get worktree count for port assignment
get_worktree_count() {
    if [ -d "$PROJECT_ROOT/$WORKTREE_DIR" ]; then
        find "$PROJECT_ROOT/$WORKTREE_DIR" -maxdepth 1 -type d | wc -l | tr -d ' '
    else
        echo 0
    fi
}

# Parse command line arguments
BRANCH_NAME=""
CUSTOM_PORT=""
CUSTOM_CONVEX_PORT=""
USE_LOCAL_CONVEX=false
USE_PREVIEW_CONVEX=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --port)
            CUSTOM_PORT="$2"
            shift 2
            ;;
        --convex-port)
            CUSTOM_CONVEX_PORT="$2"
            shift 2
            ;;
        --local-convex)
            USE_LOCAL_CONVEX=true
            shift
            ;;
        --preview-convex)
            USE_PREVIEW_CONVEX=true
            shift
            ;;
        -h|--help)
            show_usage
            ;;
        -*)
            log_error "Unknown option $1"
            show_usage
            ;;
        *)
            if [ -z "$BRANCH_NAME" ]; then
                BRANCH_NAME="$1"
            else
                log_error "Multiple branch names provided"
                show_usage
            fi
            shift
            ;;
    esac
done

# Check if branch name provided
if [ -z "$BRANCH_NAME" ]; then
    log_error "Branch name is required"
    show_usage
fi

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

# Calculate ports
WORKTREE_COUNT=$(get_worktree_count)
if [ -n "$CUSTOM_PORT" ]; then
    NEXT_PORT="$CUSTOM_PORT"
else
    NEXT_PORT=$(find_available_port $((NEXT_PORT_START + WORKTREE_COUNT)))
fi

if [ -n "$CUSTOM_CONVEX_PORT" ]; then
    CONVEX_PORT="$CUSTOM_CONVEX_PORT"
else
    CONVEX_PORT=$(find_available_port $((CONVEX_PORT_START + WORKTREE_COUNT)))
fi

log_info "Assigned ports - Next.js: $NEXT_PORT, Convex: $CONVEX_PORT"

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

# Create custom .env.local with unique ports and deployment settings
log_info "Creating custom environment configuration..."
if [ -f "$PROJECT_ROOT/.env.local" ]; then
    # Copy base environment
    cp "$PROJECT_ROOT/.env.local" ".env.local"
    
    # Add custom port settings
    echo "" >> ".env.local"
    echo "# Worktree-specific configuration" >> ".env.local"
    echo "PORT=$NEXT_PORT" >> ".env.local"
    echo "NEXT_PUBLIC_CONVEX_URL=http://127.0.0.1:$CONVEX_PORT" >> ".env.local"
    
    # Configure Convex deployment strategy
    if [ "$USE_LOCAL_CONVEX" = true ]; then
        echo "# Using local Convex deployment" >> ".env.local"
        echo "CONVEX_DEPLOYMENT=local" >> ".env.local"
    elif [ "$USE_PREVIEW_CONVEX" = true ]; then
        echo "# Using preview Convex deployment" >> ".env.local"
        echo "CONVEX_DEPLOYMENT=preview:$FEATURE_NAME" >> ".env.local"
    else
        # Use cloud dev deployment with feature suffix
        echo "# Using cloud dev deployment" >> ".env.local"
        echo "CONVEX_DEPLOYMENT=dev:$FEATURE_NAME" >> ".env.local"
    fi
    
    log_success "Environment configuration created with custom ports"
else
    log_warning ".env.local not found in project root, creating minimal configuration"
    cat > ".env.local" << EOF
# Worktree-specific configuration
PORT=$NEXT_PORT
NEXT_PUBLIC_CONVEX_URL=http://127.0.0.1:$CONVEX_PORT

# Convex deployment
CONVEX_DEPLOYMENT=dev:$FEATURE_NAME

# Required API keys (add your actual keys)
OPENAI_API_KEY=your_openai_key_here
ANTHROPIC_API_KEY=your_anthropic_key_here
EOF
fi

# Update package.json scripts for custom ports
log_info "Updating package.json scripts for custom ports..."
# Create a temporary script updater
cat > update_package.cjs << 'EOF'
const fs = require('fs');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

const nextPort = process.env.NEXT_PORT;
const convexPort = process.env.CONVEX_PORT;

// Update scripts with custom ports
packageJson.scripts.dev = `next dev -p ${nextPort}`;
packageJson.scripts["dev:all"] = `concurrently "pnpm dev" "pnpm convex:dev" --names "NEXT,CONVEX" --prefix-colors "blue,green"`;

// Add worktree-specific scripts
packageJson.scripts["dev:local"] = `next dev -p ${nextPort}`;
packageJson.scripts["convex:dev:local"] = `convex dev --local`;
packageJson.scripts["dev:multi"] = `concurrently "next dev -p ${nextPort}" "convex dev" --names "NEXT:${nextPort},CONVEX:${convexPort}" --prefix-colors "blue,green"`;

fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
console.log(`Updated package.json with Next.js port ${nextPort} and Convex port ${convexPort}`);
EOF

NEXT_PORT=$NEXT_PORT CONVEX_PORT=$CONVEX_PORT node update_package.cjs
rm update_package.cjs

# Set up Convex environment
log_info "Setting up Convex configuration..."
if command -v npx > /dev/null 2>&1; then
    if [ "$USE_LOCAL_CONVEX" = true ]; then
        log_info "Configuring local Convex deployment..."
        # For local deployment, we don't need to sync env vars to cloud
        log_success "Local Convex deployment configured"
    else
        # Configure cloud deployment and sync environment variables
        if [ -f "$PROJECT_ROOT/scripts/sync-env.sh" ]; then
            log_info "Syncing environment variables to Convex..."
            bash "$PROJECT_ROOT/scripts/sync-env.sh" || log_warning "Environment sync failed, you may need to configure Convex manually"
        else
            log_warning "Environment sync script not found"
        fi
    fi
else
    log_warning "npx not available, skipping Convex setup"
fi

log_success "Multi-instance worktree setup complete!"
log_info ""
log_info "🚀 Worktree Configuration:"
log_info "   Feature: $FEATURE_NAME"
log_info "   Branch: $BRANCH_NAME"
log_info "   Next.js Port: $NEXT_PORT"
log_info "   Convex Port: $CONVEX_PORT"
if [ "$USE_LOCAL_CONVEX" = true ]; then
    log_info "   Convex: Local deployment"
elif [ "$USE_PREVIEW_CONVEX" = true ]; then
    log_info "   Convex: Preview deployment"
else
    log_info "   Convex: Cloud dev deployment"
fi
log_info ""
log_info "📝 Next steps:"
log_info "1. cd $WORKTREE_PATH"
log_info "2. Start development servers:"
if [ "$USE_LOCAL_CONVEX" = true ]; then
    log_info "   pnpm run dev:multi    # Concurrent with local Convex"
else
    log_info "   pnpm run dev:multi    # Concurrent with cloud Convex"
fi
log_info "   OR separately:"
log_info "   pnpm dev              # Next.js on port $NEXT_PORT"
if [ "$USE_LOCAL_CONVEX" = true ]; then
    log_info "   pnpm convex:dev:local # Local Convex backend"
else
    log_info "   pnpm convex:dev       # Cloud Convex backend"
fi
log_info "3. Your app will be available at: http://localhost:$NEXT_PORT"
log_info "4. Make your changes and commit"
log_info "5. Push with: git push -u origin $BRANCH_NAME"
log_info ""
log_info "🧹 To clean up later:"
log_info "git worktree remove $WORKTREE_PATH"
log_info ""
log_info "💡 Pro tip: You can now run multiple worktrees simultaneously!"
log_info "Each will have its own ports and Convex environment."