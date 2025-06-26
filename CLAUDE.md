# Claude Code Development Workflow

**YOU MUST** follow this complete development workflow when working with this chat application project.

## 🚨 MANDATORY WORKTREE RULE

**YOU MUST ALWAYS** use git worktrees for ANY development work including:
- Feature requests (e.g., "integrate react-scan", "add dark mode")
- Bug fixes (e.g., "fix login issue", "resolve memory leak")
- Chores (e.g., "update dependencies", "refactor components")
- Integrations (e.g., "add Sentry", "integrate analytics")
- ANY code changes whatsoever

**NO EXCEPTIONS**: If you're modifying code, you MUST be in a worktree.

## Overview

This development workflow integrates:
- **GitHub MCP Server**: Issue tracking and PR management
- **Git Worktrees**: Feature development with `jeevanpillay/<feature_name>` branches (MANDATORY for all work)
- **Vercel-First Testing**: All application testing on Vercel preview deployments (NO local dev servers)
- **Context Preservation**: GitHub comments + local context files to survive session interruptions
- **Turborepo + pnpm**: Lightning-fast builds with intelligent caching

**Current Context**: June 2025

## 📋 Development Modes

Claude Code operates in two distinct modes based on your development setup:

### 🚀 Vercel Build Mode (Default)
Use this mode when you want Claude to handle the full development lifecycle:
- **Claude Responsibilities**:
  - Makes code changes
  - Runs `pnpm run build` iteratively to fix errors
  - Runs `pnpm run lint` and `pnpm run format`
  - Commits and pushes changes automatically
  - Provides Vercel preview URL for testing
- **User Responsibilities**:
  - Tests on Vercel preview deployments
  - Reports bugs or issues back to Claude
- **When to Use**: Production-ready development, team collaboration, CI/CD workflows

### 🔧 Local Dev Mode
Use this mode when you're already running `pnpm run dev` locally:
- **Claude Responsibilities**:
  - Acts as code generator only
  - Makes code changes
  - Asks user to test locally after changes
  - Does NOT commit or push automatically
- **User Responsibilities**:
  - Runs `pnpm run dev` before starting
  - Tests changes locally in real-time
  - Decides when to commit and push
- **When to Use**: Rapid prototyping, debugging, exploratory development

### Setting Development Mode
At the start of your session, tell Claude which mode to use:
- "Use Vercel Build Mode" (default if not specified)
- "Use Local Dev Mode - I'm running pnpm run dev"

## 🚀 Parallel Task Execution with Claude Code Subagents

**YOU MUST** analyze complex tasks and use parallel Claude Code subagents when appropriate.

### When to Use Parallel Subagents

Use parallel execution when the task involves:
1. **Multiple independent components** - Changes across different apps or packages
2. **Research and implementation** - Simultaneous investigation and coding
3. **Multi-file operations** - Updates to many files that don't depend on each other
4. **Different technology domains** - Frontend, backend, and infrastructure tasks

### Task Analysis Process

When receiving a complex request, follow this process:

```markdown
1. **Analyze the request** - Break down into subtasks
2. **Identify dependencies** - Determine which tasks can run in parallel
3. **Launch parallel agents** - Use multiple Task invocations in a single message
4. **Coordinate results** - Synthesize findings from all agents
```

### Example: Parallel Subagent Usage

```markdown
User: "Add authentication to the chat app with GitHub OAuth, update the docs, and create tests"

Claude's Analysis:
- Task 1: Implement GitHub OAuth (backend + frontend)
- Task 2: Update documentation
- Task 3: Create test suite

These tasks are independent and can be parallelized.
```

### Implementation Pattern

**YOU MUST** launch parallel agents in a single message for maximum efficiency:

```markdown
# Launching parallel agents (in a single tool use block):
1. Task: "Implement GitHub OAuth"
   - Search for existing auth patterns
   - Implement OAuth flow
   - Update UI components

2. Task: "Update authentication docs"
   - Create auth setup guide
   - Document configuration
   - Add troubleshooting section

3. Task: "Create auth test suite"
   - Write unit tests
   - Create integration tests
   - Add E2E test scenarios
```

### Best Practices for Parallel Execution

1. **Clear task boundaries** - Each agent should have a well-defined scope
2. **Minimize overlap** - Avoid agents working on the same files
3. **Coordinate through context** - Use context files to track overall progress
4. **Synthesize results** - Combine findings into a coherent solution
5. **Handle conflicts** - If agents suggest conflicting changes, resolve intelligently

### Anti-patterns to Avoid

❌ **Sequential agents** - Don't launch agents one after another
❌ **Overlapping work** - Don't have multiple agents editing the same files
❌ **Vague instructions** - Each agent needs specific, actionable tasks
❌ **No coordination** - Always synthesize results from parallel agents

### Example Workflow

```bash
# User request: "Migrate the app to use new API endpoints and update all tests"

# Claude's approach:
# 1. Analyze: This involves API migration + test updates (can be parallel)
# 2. Launch parallel agents:
#    - Agent 1: Find and update all API calls
#    - Agent 2: Update test mocks and assertions
# 3. Coordinate: Ensure all endpoints are covered and tests pass
# 4. Report: Summarize changes and any remaining work
```

## 🚨 CRITICAL: Context Preservation

**YOU MUST** preserve context to survive terminal crashes and session interruptions:

### 1. Local Context File (First Priority)
```bash
# ALWAYS set this variable at start of each session
mkdir -p tmp_context
CONTEXT_FILE="./tmp_context/claude-context-$(basename $(pwd)).md"

# Create or check existing context file
if [ -f "$CONTEXT_FILE" ]; then
  echo "📋 Resuming from existing context:"
  cat "$CONTEXT_FILE"
else
  echo "🆕 Creating new context file: $CONTEXT_FILE"
fi
```

### Repository Cloning Guidelines
**IMPORTANT**: When cloning external repositories for investigation:
- **ALWAYS** clone to a subdirectory within the current repository (e.g., `tmp_repo/`)
- **NEVER** attempt to `cd /tmp` or clone to `/tmp` - this is blocked for security
- **DO NOT** add cloned repositories to git tracking (they should be in .gitignore)

```bash
# ✅ CORRECT - Clone to local subdirectory
git clone https://github.com/example/repo.git tmp_repo/repo-name

# ❌ WRONG - Never do this
cd /tmp && git clone https://github.com/example/repo.git
```

### 2. GitHub Comments (Second Priority)
**YOU MUST** post comments for every significant action:
```bash
# Starting work
gh pr comment <pr_number> --body "🚀 Starting: <task_description>"

# Progress updates (every 30-60 minutes)
gh pr comment <pr_number> --body "🔧 Progress: <completed_items>"

# Completing tasks
gh pr comment <pr_number> --body "✅ Completed: <task_description>"

# Encountering blockers
gh pr comment <pr_number> --body "⚠️ Blocker: <issue_description>"
```

## Research to Implementation Workflow

**For Research Issues Only**: This workflow shows how to transition from research to implementation.

### Example: Starting Implementation from Research

```bash
# 1. When ready to implement, create worktree
RESEARCH_ISSUE=204  # Your research issue number
./scripts/setup-worktree.sh jeevanpillay/smooth-text-streaming
cd worktrees/smooth-text-streaming

# 2. Set up context with research issue reference
mkdir -p tmp_context
CONTEXT_FILE="./tmp_context/claude-context-smooth-text-streaming.md"
cat > "$CONTEXT_FILE" << EOF
# Claude Code Context - smooth-text-streaming
Last Updated: $(date)
Research Issue: #$RESEARCH_ISSUE
Branch: jeevanpillay/smooth-text-streaming
Development Mode: Vercel Build Mode

## Implementing Phase 1 from Research Issue #$RESEARCH_ISSUE
Focus: Client-side text smoothing for immediate UX improvement
EOF

# 3. Start implementation...
# ... make changes ...

# 4. Create PR that links back to research issue
gh pr create --repo lightfastai/chat \
  --title "feat: add smooth text streaming for better UX" \
  --body "Implements Phase 1 findings from #$RESEARCH_ISSUE

## Summary
Adds client-side text smoothing to improve streaming UX without backend changes.

## Implementation
Based on research in #$RESEARCH_ISSUE, this PR:
- Adds useSmoothText hook with configurable typing speed
- Integrates smooth rendering into MessageItem component
- Improves cursor animation from pulse to typewriter style

## Testing
- Tested at 30, 60, and 256 chars/sec
- Verified no impact on existing streaming logic
- Maintains backward compatibility

Part of #$RESEARCH_ISSUE"

# 5. After PR is merged, update research issue
gh pr merge <pr_number> --squash --delete-branch
gh issue comment $RESEARCH_ISSUE --repo lightfastai/chat --body "## ✅ Phase 1 Implementation Complete

PR #<pr_number> has been merged, implementing client-side text smoothing.

### What was implemented:
- useSmoothText hook with configurable speed (default: 50 chars/sec)
- Typewriter cursor animation
- Smooth text rendering in MessageItem component

### Next phases to consider:
- Phase 2: Streaming throttling (backend optimization)
- Phase 3: Delta-based storage (if performance issues arise)

Research remains open for future enhancements."
```

### Key Points for Research → Implementation:
1. **Reference research issue** in PR description with "Part of #<issue>"
2. **Update research issue AFTER merge** with implementation summary
3. **Keep research issues open** for multi-phase implementations
4. **Document what was built** vs what remains for future phases

## End-to-End Workflow

### Step 1: Resume or Start Work

**ALWAYS** check for existing work first:
```bash
# Check existing worktrees
git worktree list

# Check for existing context files
ls -la ./tmp_context/claude-context-*.md 2>/dev/null || echo "No context files found"

# If worktree exists, navigate to it
cd worktrees/<feature_name>

# Load existing context
mkdir -p tmp_context
CONTEXT_FILE="./tmp_context/claude-context-$(basename $(pwd)).md"
cat "$CONTEXT_FILE" 2>/dev/null || echo "No existing context found"
```

### Step 2: Issue Creation with Templates

**YOU MUST** use issue templates for all work:

1. **Feature Request** - For new features
2. **Bug Report** - For fixing issues
3. **Quick Task** - For simple tasks
4. **Research & Exploration** - For ongoing research and system design investigations

#### Research & Exploration Issues
Research issues are **living documents** that transition from exploration to implementation:

**Phase 1: Research** (Issue created)
- Document findings, comparisons, trade-offs
- Update issue description continuously
- Use comments for major discoveries

**Phase 2: Implementation** (When ready to build)
- Create worktree referencing research issue
- Create PR with "Part of #<research_issue>"
- Keep implementation focused on research findings

**Phase 3: Completion** (After PR merge)
- Update research issue with what was implemented
- Document remaining phases for future work
- Keep issue open if multi-phase

**Simple Workflow:**
1. Research in issue → 2. Build in PR → 3. Update issue after merge

**File References**: Use `@src/path/to/file.tsx` to help Claude navigate directly to relevant files.

```bash
# Create issue and add to project
ISSUE_URL=$(gh issue create --repo lightfastai/chat \
  --title "feat: <description>" \
  --body "<detailed_description>")
ISSUE_NUM=$(echo $ISSUE_URL | grep -oE "[0-9]+$")
gh project item-add 2 --owner lightfastai --url $ISSUE_URL
echo "Created issue #$ISSUE_NUM and added to project"
```

### Step 3: Worktree Setup

**MANDATORY**: You MUST create a worktree for ANY code changes. Use the automated setup script:
```bash
# Automated setup (RECOMMENDED)
./scripts/setup-worktree.sh jeevanpillay/<feature_name>
cd worktrees/<feature_name>

# Manual setup (if script unavailable)
git checkout staging && git pull origin staging
mkdir -p worktrees
git worktree add worktrees/<feature_name> -b jeevanpillay/<feature_name>
cd worktrees/<feature_name>
pnpm install
# .env.local should already be in root directory
pnpm run env:sync  # Run from root with .env.local in root
```

### Step 4: Development Cycle

**Choose your development mode based on your setup:**

#### 🚀 Vercel Build Mode (Default)
```bash
# 1. Set up context tracking
mkdir -p tmp_context
CONTEXT_FILE="./tmp_context/claude-context-$(basename $(pwd)).md"
cat > "$CONTEXT_FILE" << EOF
# Claude Code Context - $(basename $(pwd))
Last Updated: $(date)
PR Number: #<pr_number>
Issue: #<issue_number>
Branch: jeevanpillay/<feature_name>
Development Mode: Vercel Build Mode

## Todo State
- [ ] Task 1
- [ ] Task 2

## Current Focus
Working on: <current_task>

## Session Notes
<notes>
EOF

# 2. Claude makes code changes
# ... implement features ...

# 3. Claude runs validation (iteratively fixing errors)
SKIP_ENV_VALIDATION=true pnpm run build  # MUST pass
pnpm run lint                             # MUST pass
pnpm run format                          # MUST pass

# 4. Claude updates context and posts comments
gh pr comment <pr_number> --body "🔧 Progress: <what_was_done>"
echo "Progress: <update>" >> "$CONTEXT_FILE"

# 5. Claude commits and pushes for Vercel testing
git add .
git commit -m "feat: <description>

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"
git push -u origin jeevanpillay/<feature_name>

# 6. Claude provides Vercel preview URL
echo "🔗 Test on Vercel: https://<project>-<pr-number>-<org>.vercel.app"
```

#### 🔧 Local Dev Mode
```bash
# 1. User ensures dev servers are running
# Terminal 1: pnpm run dev:www (runs both Next.js and Convex)

# 2. Set up context tracking
mkdir -p tmp_context
CONTEXT_FILE="./tmp_context/claude-context-$(basename $(pwd)).md"
cat > "$CONTEXT_FILE" << EOF
# Claude Code Context - $(basename $(pwd))
Last Updated: $(date)
Branch: jeevanpillay/<feature_name>
Development Mode: Local Dev Mode

## Todo State
- [ ] Task 1
- [ ] Task 2

## Current Focus
Working on: <current_task>

## Session Notes
User is running pnpm run dev:www locally (concurrent Next.js + Convex)
<notes>
EOF

# 3. Claude makes code changes
# ... implement features ...

# 4. Claude asks user to test
echo "✅ Changes complete. Please test locally at http://localhost:3000"
echo "📝 What to test:"
echo "   - <specific feature 1>"
echo "   - <specific feature 2>"

# 5. User tests and reports results
# Claude waits for feedback before proceeding

# 6. When ready, user handles commit/push manually
```

### Step 5: PR Creation & Testing

```bash
# Create PR and add to project
PR_URL=$(gh pr create --repo lightfastai/chat \
  --title "feat: <feature_name>" \
  --body "Closes #<issue_number>")
PR_NUM=$(echo $PR_URL | grep -oE "[0-9]+$")
gh project item-add 2 --owner lightfastai --url $PR_URL

# Monitor Vercel deployment
gh pr view $PR_NUM --json statusCheckRollup
# Test on Vercel preview URL (format: https://<project>-<pr-number>-<org>.vercel.app)
```

### Step 6: PR Merge & Cleanup

**CRITICAL**: Remove worktree BEFORE merging to prevent errors:
```bash
# Remove worktree first
git worktree remove worktrees/<feature_name>
cd /path/to/main/repo

# Merge PR
gh pr merge <pr_number> --squash --delete-branch

# Sync staging branch
git checkout staging
git pull origin staging
git log --oneline -5  # Verify merge
```

## Tech Stack & Standards

### Core Technologies
- **Next.js 15** with App Router + Partial Prerendering (PPR)
- **Convex** for real-time database & API
- **Biome** for linting/formatting (NOT ESLint/Prettier)
- **shadcn/ui** components (New York style)
- **Tailwind CSS v4.x**
- **TypeScript** strict mode
- **pnpm v9.x** package manager
- **Turborepo** for optimized builds

### Code Standards
- 2-space indentation, 80-character line width
- Double quotes for JSX and strings
- **YOU MUST** use Biome commands: `pnpm run lint`, `pnpm run format`
- Follow shadcn/ui patterns for components

### Branch Naming
**YOU MUST** use: `jeevanpillay/<feature_name>`

### Commit Format
```
<type>: <description>

<optional body>

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

## Critical Patterns

### Client-Side Navigation
**YOU MUST** prefer client-side tabs over route-based navigation:
```tsx
// ✅ Client-side tabs with URL preservation
"use client"
export function TabsComponent() {
  const [activeTab, setActiveTab] = useState("profile")

  useEffect(() => {
    const path = activeTab === "api-keys" ? "/settings/api-keys" : "/settings"
    window.history.replaceState({}, "", path)
  }, [activeTab])

  return <Tabs value={activeTab} onValueChange={setActiveTab}>
    {/* Tab content */}
  </Tabs>
}
```

## Essential Commands

### Quality Gates (MUST pass before commit)
```bash
# Build validation (from root)
pnpm run build:www
# OR from apps/www
cd apps/www && SKIP_ENV_VALIDATION=true pnpm run build

# Code quality (from root)
pnpm run lint
pnpm run format

# Environment sync (from root with .env.local in root)
pnpm run env:sync

# Convex development (from root)
pnpm run convex:dev
```

### Context Management
```bash
# Set context file
mkdir -p tmp_context
CONTEXT_FILE="./tmp_context/claude-context-$(basename $(pwd)).md"

# View context
cat "$CONTEXT_FILE"

# Update todo status
sed -i '' 's/\[ \] Task 1/\[x\] Task 1/' "$CONTEXT_FILE"
```

### GitHub Operations
```bash
# Create and link issue
gh issue create --repo lightfastai/chat
gh project item-add 2 --owner lightfastai --url <issue_url>

# Create and link PR
gh pr create --repo lightfastai/chat
gh project item-add 2 --owner lightfastai --url <pr_url>

# Monitor deployment
gh pr view <pr_number> --json statusCheckRollup
```

## Troubleshooting

### Common Issues
1. **Build failures**: Use `SKIP_ENV_VALIDATION=true pnpm run build`
2. **Merge conflicts**: Remove worktree first: `git worktree remove worktrees/<feature_name>`
3. **Context loss**: Check `./tmp_context/claude-context-*.md` files
4. **Deployment issues**: Monitor with `gh pr view <pr_number>`

### Quality Gate Failures
- **TypeScript errors**: Fix type issues before commit
- **Lint errors**: Run `pnpm run lint` to auto-fix
- **Build errors**: Check imports and environment variables

## Monorepo Structure

### Overview
This is a Turborepo monorepo with the following structure:
```
├── apps/                    # Applications
│   ├── www/                # Main chat application
│   │   ├── src/           # Source code
│   │   │   ├── app/       # Next.js App Router pages
│   │   │   ├── components/# React components (chat/, auth/, etc)
│   │   │   └── lib/       # App-specific utilities
│   │   ├── convex/        # Backend functions & database
│   │   └── public/        # Static assets
│   └── docs/              # Documentation site (Fumadocs)
│       ├── app/           # Next.js app directory
│       ├── content/       # MDX documentation files
│       └── components/    # Docs-specific components
├── packages/              # Shared packages
│   └── ui/               # Shared UI component library
│       ├── src/
│       │   ├── components/ # All shadcn/ui components
│       │   ├── lib/       # Shared utilities (cn, etc)
│       │   └── hooks/     # Shared React hooks
│       └── globals.css    # Shared Tailwind styles
├── scripts/              # Development & deployment scripts
├── worktrees/           # Git worktrees for features
├── turbo.json          # Turborepo configuration
├── components.json     # shadcn/ui configuration
├── tailwind.config.ts  # Root Tailwind configuration
└── CLAUDE.md          # This file
```

### Monorepo Commands
```bash
# Development
pnpm run dev             # Run all apps in dev mode
pnpm run dev:www        # Run www app (Next.js + Convex concurrently)
pnpm run dev:docs       # Run only docs app
pnpm run convex:dev     # Run Convex dev server (from root, executes in apps/www)

# Building
pnpm run build          # Build all apps
pnpm run build:www      # Build only www app
pnpm run build:docs     # Build only docs app

# UI Components
pnpm run ui:add <component>  # Add new shadcn component
pnpm run ui:diff            # Check for component updates

# Environment Management
pnpm run env:sync       # Sync environment variables to Convex (run from root with .env.local in root)
pnpm run env:check      # Check environment variables in Convex

# Quality
pnpm run lint           # Lint all packages
pnpm run format         # Format all packages
pnpm run typecheck      # Type check all packages
```

## Environment Variables
- `ANTHROPIC_API_KEY` - Claude Sonnet 4 (required)
- `OPENAI_API_KEY` - GPT models (required)
- `OPENROUTER_API_KEY` - OpenRouter API key (required)
- `EXA_API_KEY` - Exa API key for web search (required)
- `NEXT_PUBLIC_CONVEX_URL` - Backend URL (required)
- `JWT_PRIVATE_KEY` - JWT private key for auth (required)
- `JWKS` - JWT public keys for verification (required)
- `DOCS_URL` - Documentation deployment URL (optional)
- Optional: `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`, `SITE_URL`

## Key Reminders

1. **WORKTREES ARE MANDATORY** - ANY code change requires a worktree, no exceptions
2. **NO LOCAL DEV SERVERS** - Test only on Vercel previews
3. **CONTEXT IS CRITICAL** - Always use context files and GitHub comments
4. **QUALITY GATES FIRST** - Build/lint must pass before commit
5. **WORKTREE CLEANUP** - Remove before merging to prevent errors
6. **USE TEMPLATES** - Always use issue templates with file references
7. **BIOME NOT ESLINT** - Use `pnpm run lint`, not ESLint commands

## Technology-Specific Documentation

For detailed guidelines on specific technologies and packages used in this project, refer to:

- **Apps Directory**: See `apps/CLAUDE.md` for app-specific patterns, deployment, and configuration
- **Packages Directory**: See `packages/CLAUDE.md` for shared package guidelines and UI component usage
- **Convex**: See `apps/www/convex/CLAUDE.md` for Convex-specific patterns, server rendering, optimistic updates, and API guidelines
- **UI Components**: See `packages/ui/README.md` for shadcn/ui component documentation
