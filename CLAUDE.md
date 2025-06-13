# Claude Code Development Workflow

This document outlines the complete development workflow for Claude Code when working with this chat application project.

## Overview

The development workflow integrates:
- **GitHub MCP Server**: Issue tracking and PR management
- **Git Worktrees**: Isolated feature development with `jeevanpillay/<feature_name>` branches
- **Local Development**: Build validation and linting before commits
- **Vercel CLI**: Deployment monitoring and troubleshooting

## End-to-End Feature Development Workflow

### 1. Issue Creation & Planning
```bash
# Use GitHub MCP to create issues
# Issues should be descriptive and include acceptance criteria
```

### 2. Git Worktree Setup
```bash
# IMPORTANT: Start with up-to-date main branch
git checkout main
git pull origin main

# Create worktree for feature development (use subdirectory due to Claude Code path restrictions)
mkdir -p worktrees
git worktree add worktrees/<feature_name> -b jeevanpillay/<feature_name>

# Note: Claude Code can only access child directories of the working directory
# Worktree will be created at: worktrees/<feature_name>/
# New branch is based on current main, so main must be up-to-date
```

### 3. Development Cycle
```bash
# Install dependencies (if needed)
pnpm install

# Make code changes
# ... implement feature ...

# Local validation - MUST pass before commit
# Note: For build without environment variables, use:
SKIP_ENV_VALIDATION=true pnpm build
# Or alternatively, pull environment variables:
# vc env pull

pnpm lint
pnpm format

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

### 5. PR Creation
```bash
# Use GitHub MCP to create PR
# Link to original issue
# Include test plan and deployment notes
```

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

# Merge PR (squash commit with branch deletion)
gh pr merge <pr_number> --squash --delete-branch

# If merge fails due to worktree checkout, clean up first:
# 1. Remove worktree (must be done before branch deletion)
git worktree remove worktrees/<feature_name>

# 2. Delete local branch (if not auto-deleted)
git branch -d jeevanpillay/<feature_name>

# 3. Update main branch with merged changes
git checkout main
git pull origin main

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
# 3. Run pnpm build + pnpm lint
# 4. Commit and push
# 5. Monitor new deployment
```

## Development Commands

### Build & Quality Checks
```bash
# Build for production (required before every commit)
pnpm build

# Lint and fix code issues
pnpm lint

# Format code
pnpm format

# Run development server
pnpm dev

# Start Convex development server
pnpm convex:dev
```

### Environment Management
```bash
# Sync environment variables to Convex
pnpm env:sync

# Deploy Convex functions
pnpm convex:deploy
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
1. ✅ `pnpm build` - Must pass without errors
2. ✅ `pnpm lint` - Must pass without errors
3. ✅ Code formatted with `pnpm format`
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
SKIP_ENV_VALIDATION=true pnpm build

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

### Linting Issues
```bash
# Auto-fix linting issues
pnpm lint

# Manual fixes may be needed for:
# - Type errors
# - Unused variables
# - Import sorting
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
# "branch checked out at worktree" error during merge
# Solution: Remove worktree first, then merge
git worktree remove worktrees/<feature_name>
gh pr merge <pr_number> --squash --delete-branch

# "Cannot delete branch" error
# Solution: Ensure you're not in the worktree directory
git worktree remove worktrees/<feature_name>
git branch -d jeevanpillay/<feature_name>

# "failed to run git: fatal: 'main' is already checked out"
# Solution: Remove worktree before merging
git worktree list  # Check active worktrees
git worktree remove worktrees/<feature_name>

# Worktree directory still exists after removal
# Solution: Manually remove directory if needed
rm -rf worktrees/<feature_name>

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

## Project Structure

```
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

## Environment Variables

See `README.md` for complete environment setup. Key variables:
- `ANTHROPIC_API_KEY` - Required for Claude Sonnet 4
- `OPENAI_API_KEY` - Required for GPT models
- `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` - GitHub OAuth
- `NEXT_PUBLIC_CONVEX_URL` - Convex backend URL

## Notes

- Always work in worktrees for feature development
- Never commit without passing all quality gates
- Use GitHub MCP for issue/PR management
- Monitor deployments actively with Vercel CLI
- Clean up worktrees after features are merged
