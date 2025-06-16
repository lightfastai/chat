# Claude Code Development Workflow

This document outlines the complete development workflow for Claude Code when working with this chat application project.

## Overview

The development workflow integrates:
- **GitHub MCP Server**: Issue tracking and PR management
- **Git Worktrees**: Isolated feature development with `jeevanpillay/<feature_name>` branches
- **Local Development**: Build validation and linting before commits
- **Vercel CLI**: Deployment monitoring and troubleshooting
- **Turborepo**: Optimized monorepo builds with intelligent caching
- **Bun**: Lightning-fast JavaScript runtime and package manager

## End-to-End Feature Development Workflow

### 1. Issue Creation & Planning

#### Using Issue Templates
The repository provides three Claude Code-optimized issue templates:

1. **Feature Request** - For new features and enhancements
   ```bash
   # When creating a feature request:
   # 1. Use clear "What needs to be done?" language
   # 2. Include file references like @src/components/chat/ChatInput.tsx
   # 3. Define browser-testable success criteria
   # 4. Add technical hints for faster implementation
   ```

2. **Bug Report** - For browser-specific issues
   ```bash
   # When reporting bugs:
   # 1. Describe what's broken in the browser
   # 2. Reference specific components with @-mentions
   # 3. Include console errors if any
   # 4. List browsers where issue was verified
   ```

3. **Quick Task** - For simple, straightforward tasks
   ```bash
   # For quick tasks:
   # 1. Brief task description
   # 2. File location (can use @src/path/to/file.tsx)
   # 3. How to test in browser
   ```

#### File References in Issues
Use @ symbol to reference files directly:
- `@src/components/chat/ChatInput.tsx` - Specific component files
- `@convex/messages.ts` - Backend files
- `@package.json` - Configuration files
- `@CLAUDE.md` - Documentation

This helps Claude Code navigate directly to relevant files when picking up an issue.

#### Creating Issues via GitHub CLI
```bash
# IMPORTANT: The --project flag may not work reliably with gh issue create
# Recommended approach: Create issue first, then add to project

# Create issue with title and body
gh issue create --repo lightfastai/chat \
  --title "feat: <feature_description>" \
  --body "Description of the feature"

# Then add to project separately (use the issue number from the output)
# Note: This command runs silently - no output means success
gh project item-add 2 --owner lightfastai --url https://github.com/lightfastai/chat/issues/<issue_number>

# Create with specific template (requires manual body input)
gh issue create --template feature_request.md --repo lightfastai/chat

# Or use GitHub web UI which will show template chooser
# Note: Web UI won't automatically add to project
```

**Task Planning & PR Description Management**:
- Use GitHub PR descriptions as the primary task planner and tracker
- Create todo lists for complex features using TodoWrite tool
- Continuously reference and update PR descriptions throughout development
- Link all tasks back to issue acceptance criteria
- Update PR descriptions with progress, blockers, and completion status

**Context Preservation Through GitHub Comments**:
- **CRITICAL**: Create frequent GitHub comments to preserve work history
- Post a comment when starting each new todo item from TodoWrite
- Post a comment when completing each todo item
- Include code snippets, decisions, and blockers in comments
- This ensures context survives terminal crashes or session interruptions
- Comments serve as a detailed activity log for the PR

Example workflow:
```bash
# When starting a new todo task
gh pr comment <pr_number> --body "🚀 Starting: Implement dark mode toggle component
- Creating ThemeToggle.tsx in src/components/ui/
- Will use next-themes for persistence"

# When encountering issues
gh pr comment <pr_number> --body "⚠️ Blocker: Theme flashing on page load
- Issue: Initial theme loads after hydration
- Solution: Adding theme script to prevent flash"

# When completing a task
gh pr comment <pr_number> --body "✅ Completed: Dark mode toggle implementation
- Added ThemeToggle component
- Integrated with header navigation
- Theme persists across refreshes
- No console errors

Next: Style all UI components for dark mode"
```

### 2. Git Worktree Setup

#### Check Existing Worktrees First (When Resuming Work)
```bash
# IMPORTANT: Always check if worktree already exists before creating
git worktree list

# If worktree exists for your feature, navigate to it:
cd worktrees/<feature_name>

# If worktree doesn't exist, proceed with setup below
```

#### Automated Setup (Recommended)
```bash
# Use the automated setup script for complete worktree initialization
./scripts/setup-worktree.sh jeevanpillay/<feature_name>

# This script automatically:
# - Ensures main branch is up-to-date
# - Creates worktree at worktrees/<feature_name>
# - Creates branch jeevanpillay/<feature_name>
# - Installs dependencies with bun install
# - Copies .env.local configuration
# - Syncs environment variables to Convex
# - Provides next steps guidance

# Example:
./scripts/setup-worktree.sh jeevanpillay/add-dark-mode
```

#### Manual Setup (Advanced)
```bash
# IMPORTANT: Start with up-to-date main branch
git checkout main
git pull origin main

# Create worktree for feature development (use subdirectory due to Claude Code path restrictions)
mkdir -p worktrees
git worktree add worktrees/<feature_name> -b jeevanpillay/<feature_name>

# Change to worktree directory
cd worktrees/<feature_name>

# Install dependencies
bun install

# Copy environment configuration
cp ../../.env.local .env.local

# Sync environment variables to Convex
bun run env:sync

# Note: Claude Code can only access child directories of the working directory
# Worktree will be created at: worktrees/<feature_name>/
# New branch is based on current main, so main must be up-to-date
```

### 3. Development Cycle
```bash
# When resuming work, first check if worktree exists
git worktree list

# Navigate to your worktree (if not already there)
cd worktrees/<feature_name>

# Create or update context file in /tmp for session state
# This file preserves todo state and context across sessions
# Using /tmp ensures it's never accidentally committed
CONTEXT_FILE="/tmp/claude-context-$(basename $(pwd)).md"
cat > "$CONTEXT_FILE" << 'EOF'
# Claude Code Context - <feature_name>
Last Updated: $(date)
Working Directory: $(pwd)

## Current PR
- PR Number: #<pr_number>
- Issue: #<issue_number>
- Branch: jeevanpillay/<feature_name>

## Todo State
- [ ] Task 1 description
- [x] Task 2 description (completed)
- [ ] Task 3 description (in progress)

## Current Focus
Working on: <current_task>
Next steps: <planned_next_steps>

## Important Context
- Decision: <key_decision_made>
- Blocker: <any_current_blockers>
- Files modified: <list_of_files>

## Session Notes
<any_additional_context>
EOF

# When resuming work, always check context file first
echo "Context file: $CONTEXT_FILE"
cat "$CONTEXT_FILE"

# Start development servers (choose one option):
# Option 1: Background development (recommended for Claude Code)
bun run dev:bg                        # Runs both servers in background with logging

# Option 2: Concurrent development (foreground)
bun run dev:all

# Option 3: Separate terminals
# Terminal 1: bun run dev              # Next.js development server
# Terminal 2: bun run convex:dev       # Convex backend development server

# Check background servers status
ps aux | grep -E "(next|convex)" | grep -v grep

# View background server logs
tail -f dev.log

# Stop background servers
pkill -f "next dev"
pkill -f "convex dev"

# Make code changes
# ... implement feature ...

# IMPORTANT: Post GitHub comments frequently during development
# This preserves context if terminal crashes or session is interrupted
gh pr comment <pr_number> --body "🔧 Progress update:
- Implemented feature X
- Fixed issue Y
- Currently working on Z"

# When using TodoWrite, post comments for each todo state change
# Starting a todo:
gh pr comment <pr_number> --body "🚀 Starting: [Todo description]"
# Completing a todo:
gh pr comment <pr_number> --body "✅ Completed: [Todo description]"

# IMPORTANT: Update context file when todo state changes
# This provides backup context if GitHub is unavailable
CONTEXT_FILE="/tmp/claude-context-$(basename $(pwd)).md"
echo "## Todo Update - $(date)" >> "$CONTEXT_FILE"
echo "Completed: <task_description>" >> "$CONTEXT_FILE"
echo "Starting: <next_task>" >> "$CONTEXT_FILE"

# Local validation - MUST pass before commit
# Note: For build without environment variables, use:
SKIP_ENV_VALIDATION=true bun run build
# Or alternatively, pull environment variables:
# vc env pull

bun run lint
bun run format

# Fix any issues found by build/lint
# Repeat until all checks pass
```

### 4. Commit & Push
```bash
# Stage and commit changes
git add .
git commit -m "feat: implement <feature_name>

<detailed description>

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# Push to remote
git push -u origin jeevanpillay/<feature_name>
```

### 5. PR Creation & GitHub Project Integration
```bash
# IMPORTANT: The --project flag may not work reliably with gh pr create
# Recommended approach: Create PR first, then add to project

# Create PR
gh pr create --repo lightfastai/chat

# Or create PR with specific details
gh pr create --title "feat: <feature_name>" \
  --body "Closes #<issue_number>"

# Then add PR to project separately (use the PR number from the output)
# Note: This command runs silently - no output means success
gh project item-add 2 --owner lightfastai --url https://github.com/lightfastai/chat/pull/<pr_number>

# Link to original issue
# Include test plan and deployment notes
```

**PR Description as Task Planner**:
- Use PR description as the central task planning and tracking document
- Include todo lists with checkboxes for task progress visualization
- Reference todo list progress and completion status
- Include detailed test plan with acceptance criteria verification
- Document any blockers or issues encountered during development
- Add deployment notes and environment considerations
- Link to related issues and maintain traceability
- Update PR description continuously as development progresses

### Context Preservation Best Practices

**Why This Matters**:
Terminal crashes and session interruptions can cause loss of valuable context. Claude Code uses a dual-approach to preserve context:
1. **GitHub PR comments** - Permanent record accessible from anywhere
2. **Local .claude-context.md file** - Immediate context in the worktree

**Local Context File (in /tmp)**:
- Created in /tmp with unique name per worktree
- File pattern: `/tmp/claude-context-<worktree-name>.md`
- Contains current todo state, PR info, and session notes
- Updated throughout development
- Automatically excluded from git (in /tmp directory)
- First file to check when resuming work
- Persists across terminal sessions but not system reboots

Example update commands:
```bash
# Set context file variable
CONTEXT_FILE="/tmp/claude-context-$(basename $(pwd)).md"

# Update todo state in context file
sed -i '' 's/\[ \] Task 1/\[x\] Task 1/' "$CONTEXT_FILE"

# Add session note
echo -e "\n### $(date '+%Y-%m-%d %H:%M') - Progress Note" >> "$CONTEXT_FILE"
echo "- Implemented feature X" >> "$CONTEXT_FILE"
echo "- Next: Work on feature Y" >> "$CONTEXT_FILE"

# Quick view of current state
cat "$CONTEXT_FILE" | grep -A5 "## Current Focus"
```

**Required Comment Patterns**:
1. **Todo Start Comments**: Post when beginning any TodoWrite task
   ```bash
   gh pr comment <pr_number> --body "🚀 Starting: <task_description>
   Files to modify: <file_list>
   Approach: <brief_approach>"
   ```

2. **Progress Comments**: Post every 30-60 minutes or after significant changes
   ```bash
   gh pr comment <pr_number> --body "🔧 Progress:
   - ✅ <completed_item>
   - ✅ <completed_item>
   - 🚧 <in_progress_item>
   - 📋 <pending_item>"
   ```

3. **Completion Comments**: Post when finishing TodoWrite tasks
   ```bash
   gh pr comment <pr_number> --body "✅ Completed: <task_description>
   Changes made:
   - <change_1>
   - <change_2>
   Files modified: <file_list>"
   ```

4. **Blocker Comments**: Post immediately when encountering issues
   ```bash
   gh pr comment <pr_number> --body "⚠️ Blocker: <issue_description>
   Error: <error_message>
   Attempted solutions:
   - <attempt_1>
   - <attempt_2>
   Next steps: <planned_approach>"
   ```

**Integration with TodoWrite**:
- Every TodoWrite status change triggers a GitHub comment
- Comments include the todo ID and description
- This creates a permanent audit trail of work progress

**GitHub Project Management**:
The repository uses the **lightfast-chat** project (ID: 2) for tracking all development work:
- All new issues and PRs should be automatically added to the project
- Issues start in "Todo" status
- PRs typically move to "In Progress" when created
- Use `--project 2` flag when creating issues/PRs via GitHub CLI

### 6. Deployment Monitoring
```bash
# Check deployment status (requires --yes flag)
vercel ls --yes

# Monitor deployment via GitHub PR status checks
gh pr view <pr_number> --json statusCheckRollup

# Alternative: Monitor deployment logs (if deployment ID known)
vercel logs --follow <deployment_id>

# Get deployment details via GitHub PR
gh pr view <pr_number>

# Note: Vercel CLI requires confirmation for many commands
# GitHub CLI integration provides better PR/deployment monitoring
```

### 7. PR Merge & Cleanup
```bash
# Check PR merge readiness
gh pr view <pr_number> --json state,mergeable,statusCheckRollup

# IMPORTANT: Remove worktree BEFORE attempting to merge
# This prevents "fatal: 'main' is already checked out" errors
git worktree remove worktrees/<feature_name>

# Navigate back to main repository root (if currently in worktree)
cd /path/to/main/repo

# Method 1: Merge via GitHub CLI (preferred)
gh pr merge <pr_number> --squash --delete-branch

# Method 2: If GitHub CLI fails, use web interface
# Visit the PR URL and click "Merge pull request" → "Squash and merge"

# Method 3: Manual git merge (if needed)
git checkout main
git pull origin main
git merge --squash jeevanpillay/<feature_name>
git commit -m "feat: your feature description (#<pr_number>)"
git push origin main
git branch -d jeevanpillay/<feature_name>
git push origin --delete jeevanpillay/<feature_name>

# Verify the merge was successful
git log --oneline -5  # Check recent commits include your feature

# Close related issue if not auto-closed
gh issue close <issue_number> --comment "✅ Completed in PR #<pr_number>"
```

### 8. Post-Merge Cleanup Workflow
```bash
# Complete cleanup checklist:
# 1. ✅ PR merged and remote branch deleted
# 2. ✅ Local worktree removed
# 3. ✅ Local branch cleaned up
# 4. ✅ Main branch updated with git pull origin main
# 5. ✅ Merged changes verified in local main
# 6. ✅ Related issues closed
# 7. ✅ Verify feature is live in production

# CRITICAL: Always sync main branch after merge
git checkout main
git pull origin main
git status  # Ensure clean working tree with latest changes

# If deployment fails, iterate:
# 1. Check vercel logs for errors
# 2. Fix issues locally
# 3. Run bun run build + bun run lint
# 4. Commit and push
# 5. Monitor new deployment
```

## Complete Workflow Example

### Quick Example: Creating an Issue and Adding to Project
```bash
# Step 1: Create the issue
ISSUE_URL=$(gh issue create --repo lightfastai/chat \
  --title "feat: add dark mode toggle" \
  --body "Add a toggle to switch between light and dark themes")

# Step 2: Extract issue number from URL
ISSUE_NUM=$(echo $ISSUE_URL | grep -oE "[0-9]+$")
echo "Created issue #$ISSUE_NUM"

# Step 3: Add to project (runs silently)
gh project item-add 2 --owner lightfastai --url $ISSUE_URL
echo "Added to lightfast-chat project"
```

Here's a real example of the full workflow using issue templates:

### Example: Adding Dark Mode Feature

1. **Create Issue with Template**
   ```bash
   # Via GitHub UI: Click "New Issue" → Select "Feature Request"
   # Fill out template:
   ```
   ```markdown
   ## What needs to be done?
   Add a dark mode toggle to the application that persists user preference

   ## Success looks like
   - [ ] Toggle button in header next to user menu
   - [ ] Theme persists across page refreshes
   - [ ] Smooth transition between themes
   - [ ] All components properly styled for dark mode

   ## Technical hints
   - Start with: @src/app/layout.tsx for theme provider
   - Related to: @src/components/ui components need dark variants
   - Uses: next-themes library (already in @package.json)

   ## Browser testing required
   - [ ] Works on Chrome/Edge/Safari
   - [ ] No console errors
   - [ ] Theme toggle animates smoothly
   ```

2. **Claude Code picks up the issue**
   - Sees @-mentions and navigates directly to layout.tsx
   - Checks package.json to confirm next-themes is available
   - Reviews UI components for theming approach

3. **Create worktree and implement**
   ```bash
   ./scripts/setup-worktree.sh jeevanpillay/add-dark-mode
   cd worktrees/add-dark-mode
   bun run dev:all
   # Implementation happens here...
   ```

4. **Create PR with comprehensive description**
   - Links to issue
   - Updates task list as work progresses
   - Documents any challenges or decisions

This workflow ensures Claude Code has all context needed to implement features efficiently.

## Project Specifics

### Tech Stack
- **Next.js 15 Canary** with App Router + Partial Prerendering (PPR)
- **Convex** for real-time database & API
- **Biome** for linting/formatting (not ESLint/Prettier)
- **shadcn/ui** components (New York style)
- **Tailwind CSS v4.x**
- **AI SDK** with Claude Sonnet 4 + OpenAI
- **TypeScript** strict mode
- **bun** runtime and package manager (v1.2.10)
- **Turborepo** for optimized monorepo builds

### Code Style (Biome Configuration)
- 2-space indentation, 80-character line width
- Double quotes for JSX and strings
- Arrow parentheses always required
- Non-null assertions allowed in TypeScript
- Import organization enabled
- **IMPORTANT**: Uses Biome, not ESLint/Prettier

### Component Structure
```
src/components/
├── ui/           # shadcn/ui components
├── chat/         # Chat-specific components
└── auth/         # Authentication components
```
- Use TypeScript interfaces and Zod validation consistently
- Follow shadcn/ui patterns for component composition

### Project-Specific Features
- **Resumable streams**: Custom implementation for surviving disconnections
- **Feedback system**: v0.dev-inspired thumbs up/down with detailed feedback
- **AI model management**: Multi-provider support with token tracking
- **Thread-based chat**: Complex schema with resumable streaming chunks

### Non-blocking SSR Pattern with Convex Prefetch

This project uses a non-blocking Server-Side Rendering pattern with Convex's `preloadQuery` for optimal performance with Partial Pre-Rendering (PPR).

#### Pattern Overview
Instead of blocking the render with await calls, use Suspense boundaries and preloaded queries:

```tsx
// ❌ Blocking pattern - avoid this
export default async function Page() {
  const user = await getCurrentUser() // Blocks rendering
  return <Profile user={user} />
}

// ✅ Non-blocking pattern - use this
export default async function Page() {
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <PageWithData />
    </Suspense>
  )
}

async function PageWithData() {
  const token = await getAuthToken()
  const preloadedUser = await preloadQuery(api.users.current, {}, { token })
  return <ProfileWithPreload preloadedUser={preloadedUser} />
}
```

#### Implementation Steps

1. **Create a wrapper component with Suspense**:
```tsx
export default async function SettingsPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <SettingsPageWithData />
    </Suspense>
  )
}
```

2. **Preload data in a separate component**:
```tsx
async function SettingsPageWithData() {
  const token = await getAuthToken()
  if (!token) return <ErrorState />
  
  const preloadedData = await preloadQuery(api.query.name, args, { token })
  return <ClientComponent preloadedData={preloadedData} />
}
```

3. **Create a client component to use preloaded data**:
```tsx
"use client"
import { usePreloadedQuery } from "convex/react"

export function ClientComponent({ preloadedData }) {
  const data = usePreloadedQuery(preloadedData) // Instant, non-blocking
  return <ActualComponent data={data} />
}
```

#### Benefits
- **Non-blocking**: UI streams in progressively with PPR
- **Better UX**: Shows loading states immediately
- **Optimal caching**: Convex handles query caching automatically
- **Type-safe**: Full TypeScript support with Preloaded types

#### Reference Implementation
See `src/components/chat/sidebar/ServerSidebar.tsx` and `src/app/chat/settings/page.tsx` for complete examples.


## Turborepo Integration

### Performance Benefits
Turborepo brings significant performance improvements to the development workflow:

- **Intelligent Caching**: Only rebuilds what has changed
- **Parallel Execution**: Runs tasks concurrently when possible
- **Remote Caching**: Share build cache across team members (when configured)
- **Incremental Builds**: Dramatically faster subsequent builds
- **Pipeline Optimization**: Automatically optimizes task dependencies

### Turborepo Commands
```bash
# Run all tasks in the pipeline
bun turbo run build lint

# Run with verbose output to see caching in action
bun turbo run build --verbose

# Clear the cache if needed
bun turbo run build --force

# See task dependencies
bun turbo run build --graph
```

### Combined with Bun
The combination of Bun and Turborepo provides:
- **10-20x faster package installations** compared to npm/yarn
- **3-5x faster script execution** for development tasks
- **Near-instant subsequent builds** with Turborepo caching
- **Reduced CI/CD times** through remote caching capabilities

## Development Commands

### Essential Commands
```bash
# Use bun (not npm/yarn/pnpm) - v1.2.10
bun install

# Background development (recommended for Claude Code)
bun run dev:bg           # Runs both servers in background with logging to dev.log

# Concurrent development (runs both Next.js and Convex in foreground)
bun run dev:all

# Individual development servers
bun run dev              # Next.js development server
bun run convex:dev       # Convex backend development server

# Complete project setup with instructions
bun run setup
```

### Build & Quality Checks
```bash
# Build for production (required before every commit)
bun run build

# Lint and fix code issues (Biome)
bun run lint

# Format code (Biome)
bun run format

# Build without environment validation (for CI/CD)
SKIP_ENV_VALIDATION=true bun run build

# Run build with Turborepo for maximum performance
bun run turbo:build
```

### Environment Management
```bash
# Sync environment variables to Convex
bun run env:sync

# Verify synced environment variables
bun run env:check

# Deploy Convex functions
bun run convex:deploy

# View Convex logs
bun run logs
```

### Vercel CLI Commands
```bash
# List all deployments (requires confirmation)
vercel ls --yes

# Deploy to preview
vercel --prod=false

# Deploy to production
vercel --prod

# Follow deployment logs in real-time (need deployment ID)
vercel logs --follow <deployment_id>

# Get logs for specific deployment
vercel logs <deployment_id>

# Inspect deployment details
vercel inspect <deployment_url>

# Note: Many vercel commands require --yes flag for confirmation
# GitHub CLI provides better integration for monitoring deployments
```

## Branch Naming Convention

All feature branches must follow the pattern:
```
jeevanpillay/<feature_name>
```

Examples:
- `jeevanpillay/add-dark-mode`
- `jeevanpillay/fix-chat-threading`
- `jeevanpillay/improve-ai-responses`

## Commit Message Format

```
<type>: <description>

<optional body>

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

## Quality Gates

### Before Every Commit
1. ✅ `bun run build` - Must pass without errors
2. ✅ `bun run lint` - Must pass without errors
3. ✅ Code formatted with `bun run format`
4. ✅ All changes tested locally

### Before PR Creation
1. ✅ Feature branch pushed to remote
2. ✅ All commits follow message format
3. ✅ Issue linked in PR description
4. ✅ Test plan documented

### Before Merge
1. ✅ Vercel deployment succeeds
2. ✅ No console errors in deployment
3. ✅ Feature works as expected in preview
4. ✅ Issue acceptance criteria met

## Troubleshooting

### Build Failures
```bash
# Environment variable errors during build
SKIP_ENV_VALIDATION=true bun run build

# Or pull environment variables from Vercel
vc env pull

# Common fixes:
# - TypeScript errors: Fix type issues
# - Import errors: Check file paths
# - Environment variables: Use SKIP_ENV_VALIDATION or vc env pull
```

### Deployment Issues
```bash
# Check deployment status via GitHub PR
gh pr view <pr_number> --json statusCheckRollup

# Check deployment logs (if deployment URL known)
vercel logs --follow <deployment_id>

# Common issues:
# - Environment variables missing in Vercel project settings
# - Build timeout (check vercel.json maxDuration)
# - Runtime errors (check function logs)
```

### Linting Issues (Biome)
```bash
# Auto-fix linting issues (Biome)
bun run lint

# Format code (Biome)
bun run format

# Manual fixes may be needed for:
# - TypeScript type errors
# - Unused variables
# - Import organization (Biome handles automatically)
# - Non-null assertions (allowed in this project)
# - Exhaustive dependencies (disabled for React hooks)

# Note: This project uses Biome, not ESLint/Prettier
# Configuration in biome.json, not .eslintrc or .prettierrc
```

### Worktree Issues
```bash
# Claude Code path restrictions - use subdirectories only
mkdir -p worktrees
git worktree add worktrees/<feature_name> -b jeevanpillay/<feature_name>

# Branch already exists error
git branch -D jeevanpillay/<feature_name>
git worktree add worktrees/<feature_name> -b jeevanpillay/<feature_name>

# Cleanup worktree after merge
git worktree remove worktrees/<feature_name>
```

### Vercel CLI Issues
```bash
# Commands require confirmation
vercel ls --yes

# Use GitHub CLI for better integration
gh pr view <pr_number> --json statusCheckRollup
gh pr view <pr_number>  # Shows deployment links
```

### PR Merge & Cleanup Issues
```bash
# "failed to run git: fatal: 'main' is already checked out" error during merge
# MOST COMMON ISSUE: Worktree is still active when trying to merge
# Solution: ALWAYS remove worktree before merging
git worktree list  # Check active worktrees first
git worktree remove worktrees/<feature_name>
cd /path/to/main/repo  # Navigate out of worktree if currently inside
gh pr merge <pr_number> --squash --delete-branch

# Alternative if GitHub CLI fails: Use web interface
# 1. Visit https://github.com/lightfastai/chat/pull/<pr_number>
# 2. Click "Merge pull request" → "Squash and merge"
# 3. Confirm merge and delete branch

# "Cannot delete branch" error
# Solution: Ensure you're not in the worktree directory
pwd  # Check current directory
cd /path/to/main/repo  # Navigate to main repo if needed
git worktree remove worktrees/<feature_name>
git branch -d jeevanpillay/<feature_name>

# Worktree directory still exists after removal
# Solution: Manually remove directory if needed
rm -rf worktrees/<feature_name>

# GitHub CLI error during merge
# Solution: Fall back to web interface or manual merge
# Method 1: Web interface (recommended)
echo "Visit: https://github.com/lightfastai/chat/pull/<pr_number>"

# Method 2: Manual merge
git checkout main
git pull origin main
git merge --squash jeevanpillay/<feature_name>
git commit -m "feat: your feature description (#<pr_number>)"
git push origin main
git branch -d jeevanpillay/<feature_name>
git push origin --delete jeevanpillay/<feature_name>

# Check merge status
gh pr view <pr_number> --json state,merged

# Main branch not up to date after merge
# Solution: Always pull after merging
git checkout main
git pull origin main
git log --oneline -5  # Verify your merged commit is present
```

### Main Branch Sync Issues
```bash
# Local main branch missing merged changes
# Solution: Always pull after PR merge
git checkout main
git pull origin main

# Diverged main branch
# Check for local commits that weren't pushed
git status
git log --oneline origin/main..main  # Shows unpushed commits

# If you have local commits, push them first
git push origin main

# Then pull to get merged changes
git pull origin main
```

## GitHub Project Management

### lightfast-chat Project
The repository is integrated with GitHub Projects for comprehensive issue and PR tracking:
- **Project Name**: lightfast-chat
- **Project ID**: 2
- **Organization**: lightfastai

### Managing Issues and PRs
```bash
# Add existing issue to project
gh project item-add 2 --owner lightfastai --url https://github.com/lightfastai/chat/issues/<NUMBER>

# Add existing PR to project
gh project item-add 2 --owner lightfastai --url https://github.com/lightfastai/chat/pull/<NUMBER>

# Create new issue (then add to project - see issue creation section above)
gh issue create --repo lightfastai/chat

# Create new PR (then add to project - see PR creation section above)
gh pr create --repo lightfastai/chat

# List all items in the project
gh project item-list 2 --owner lightfastai

# View project columns and statuses
gh project field-list 2 --owner lightfastai
```

### Project Status Management
The project uses three main statuses:
- **Todo**: New issues and tasks not yet started
- **In Progress**: Active PRs and issues being worked on
- **Done**: Completed items

### Bulk Operations
To add multiple existing items to the project:
```bash
# Add all open issues
gh issue list --repo lightfastai/chat --state open --json number --jq '.[].number' | \
while read num; do
  gh project item-add 2 --owner lightfastai --url "https://github.com/lightfastai/chat/issues/$num"
done

# Add all open PRs
gh pr list --repo lightfastai/chat --state open --json number --jq '.[].number' | \
while read num; do
  gh project item-add 2 --owner lightfastai --url "https://github.com/lightfastai/chat/pull/$num"
done
```

## Issue Templates

The project includes Claude Code-optimized issue templates designed for efficient AI-assisted development:

### Available Templates
1. **Feature Request** - For new features and enhancements
   - Action-oriented language ("What needs to be done?")
   - Browser-focused success criteria
   - File path hints for navigation
   - Browser testing checklist

2. **Bug Report** - For reporting browser issues
   - Browser-specific reproduction steps
   - Component path hints
   - Console error sections
   - Browser verification checkboxes

3. **Quick Task** - For simple, straightforward tasks
   - Minimal three-field structure
   - Task description, file location, test method
   - No unnecessary boilerplate

### Key Design Principles
- **Browser-only focus**: No OS/environment fields
- **AI-friendly language**: Clear, actionable descriptions
- **Path hints**: Help Claude Code navigate efficiently
- **File references**: Support for @-mentioning files (e.g., @src/components/chat/ChatInput.tsx)
- **Minimal friction**: Only essential fields required

### Creating Issues
When creating issues, choose the appropriate template to provide Claude Code with:
- Clear starting points (file paths or @-mentions like @src/app/layout.tsx)
- Specific success criteria
- Browser-testable outcomes
- No irrelevant environment details

#### File References
You can reference files directly in issues using the @ symbol:
- `@src/components/chat/ChatInput.tsx` - Reference specific files
- `@convex/messages.ts` - Reference backend files
- `@CLAUDE.md` - Reference documentation

This helps Claude Code quickly navigate to relevant files when working on the issue.

## Project Structure

```
├── .github/
│   └── ISSUE_TEMPLATE/    # Claude Code-optimized issue templates
├── src/
│   ├── app/            # Next.js App Router pages
│   ├── components/     # React components
│   ├── lib/           # Utility functions
│   └── env.ts         # Environment validation
├── convex/            # Convex backend functions
├── docs/              # Additional documentation
├── scripts/           # Build and deployment scripts
├── vercel.json        # Vercel configuration
├── package.json       # Dependencies and scripts
├── CLAUDE.md          # This file
└── README.md          # Project documentation
```

## Development Workflow Specifics

### Dual Server Development
- **Requires two dev servers**: Next.js + Convex backend
- Use `bun run dev:all` for concurrent development or run in separate terminals
- Convex provides real-time database updates and subscriptions
- Environment variables must be synced between Next.js and Convex
- Turborepo optimizes the build pipeline for both servers

### Quality Assurance
- **No testing framework configured** - relies on TypeScript + Biome
- Quality gates: Biome linting, TypeScript strict mode, environment validation
- Build validation prevents deployment with missing environment variables

### Deployment Integration
- Vercel deployment includes automatic Convex deployment
- Custom build command integrates both Next.js and Convex builds
- 30-second function timeout configured in vercel.json

## Environment Variables

Uses `@t3-oss/env-nextjs` for type-safe environment validation:

### Required Variables
- `ANTHROPIC_API_KEY` - Required for Claude Sonnet 4
- `OPENAI_API_KEY` - Required for GPT models
- `NEXT_PUBLIC_CONVEX_URL` - Convex backend URL

### Optional Variables
- `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` - GitHub OAuth
- `JWT_PRIVATE_KEY` / `JWKS` - Authentication tokens
- `SITE_URL` - Redirect handling

### Environment Sync
- Custom `./scripts/sync-env.ts` script validates and syncs variables
- Run `bun run env:sync` after environment changes
- Use `bun run env:check` to verify synced variables
- Color-coded output with success/error logging
- Proper handling of multi-line JWT keys and complex values

## Repository Analysis Workflow

### Cloning External Repositories for Analysis

When analyzing external repositories or codebases, use a temporary clone approach:

```bash
# Clone repository into tmp_repo directory for analysis
git clone <repository_url> tmp_repo

# Navigate to the cloned repository
cd tmp_repo

# Perform analysis tasks
# - Read files and understand structure
# - Search for patterns and dependencies
# - Analyze code organization
# - Extract insights

# Return to main directory
cd ..

# Clean up after analysis
rm -rf tmp_repo
```

**Important Guidelines**:
- Always clone into `tmp_repo` directory (already in .gitignore)
- Delete the temporary repository after analysis is complete
- Use this approach for:
  - Analyzing external codebases
  - Comparing implementation patterns
  - Extracting best practices
  - Understanding project structures
- Never commit files from tmp_repo to the main repository

### Example Analysis Workflow
```bash
# Clone a repository to analyze its authentication implementation
git clone https://github.com/example/auth-project tmp_repo
cd tmp_repo

# Search for authentication patterns
rg "auth|login|session" --type ts

# Examine specific files
cat src/auth/provider.tsx

# Extract insights and patterns
# ... take notes on implementation ...

# Clean up
cd ..
rm -rf tmp_repo
```

## Quick Reference: Context Commands

### GitHub Comment Commands
```bash
# Starting a todo task
gh pr comment <pr_number> --body "🚀 Starting: <task_name>"

# Progress update
gh pr comment <pr_number> --body "🔧 Progress: <what_was_done>"

# Completing a todo
gh pr comment <pr_number> --body "✅ Completed: <task_name>"

# Reporting a blocker
gh pr comment <pr_number> --body "⚠️ Blocker: <issue_description>"

# General status update
gh pr comment <pr_number> --body "📊 Status: <current_status>"
```

### Local Context File Commands
```bash
# Set context file path (run this first in each session)
CONTEXT_FILE="/tmp/claude-context-$(basename $(pwd)).md"

# View current context
cat "$CONTEXT_FILE"

# Update todo status
sed -i '' 's/\[ \] <task>/\[x\] <task>/' "$CONTEXT_FILE"

# Add progress note
echo -e "\n### $(date '+%Y-%m-%d %H:%M')" >> "$CONTEXT_FILE"
echo "- Progress: <what_was_done>" >> "$CONTEXT_FILE"

# Update current focus
sed -i '' 's/Working on:.*/Working on: <new_task>/' "$CONTEXT_FILE"

# Quick status check
grep -A3 "## Todo State" "$CONTEXT_FILE"

# Check if context file exists from previous session
ls -la /tmp/claude-context-*.md
```

## Notes

- Always work in worktrees for feature development
- Never commit without passing all quality gates
- Use GitHub MCP for issue/PR management
- Monitor deployments actively with Vercel CLI
- Clean up worktrees after features are merged
- Use tmp_repo for temporary repository analysis
- **CRITICAL**: Post GitHub comments frequently to preserve context across sessions
