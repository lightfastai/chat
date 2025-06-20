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

## Overvietw

This development workflow integrates:
- **GitHub MCP Server**: Issue tracking and PR management
- **Git Worktrees**: Feature development with `jeevanpillay/<feature_name>` branches (MANDATORY for all work)
- **Vercel-First Testing**: All application testing on Vercel preview deployments (NO local dev servers)
- **Context Preservation**: GitHub comments + local context files to survive session interruptions
- **Turborepo + Bun**: Lightning-fast builds with intelligent caching

**Current Context**: June 2025

## 📋 Development Modes

Claude Code operates in two distinct modes based on your development setup:

### 🚀 Vercel Build Mode (Default)
Use this mode when you want Claude to handle the full development lifecycle:
- **Claude Responsibilities**:
  - Makes code changes
  - Runs `bun run build` iteratively to fix errors
  - Runs `bun run lint` and `bun run format`
  - Commits and pushes changes automatically
  - Provides Vercel preview URL for testing
- **User Responsibilities**:
  - Tests on Vercel preview deployments
  - Reports bugs or issues back to Claude
- **When to Use**: Production-ready development, team collaboration, CI/CD workflows

### 🔧 Local Dev Mode
Use this mode when you're already running `bun dev:all` locally:
- **Claude Responsibilities**:
  - Acts as code generator only
  - Makes code changes
  - Asks user to test locally after changes
  - Does NOT commit or push automatically
- **User Responsibilities**:
  - Runs `bun dev:all` before starting
  - Tests changes locally in real-time
  - Decides when to commit and push
- **When to Use**: Rapid prototyping, debugging, exploratory development

### Setting Development Mode
At the start of your session, tell Claude which mode to use:
- "Use Vercel Build Mode" (default if not specified)
- "Use Local Dev Mode - I'm running bun dev:all"

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
git checkout main && git pull origin main
mkdir -p worktrees
git worktree add worktrees/<feature_name> -b jeevanpillay/<feature_name>
cd worktrees/<feature_name>
bun install
cp ../../.env.local apps/www/.env.local
cd apps/www && bun run env:sync
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
SKIP_ENV_VALIDATION=true bun run build  # MUST pass
bun run lint                             # MUST pass
bun run format                          # MUST pass

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
# 1. User ensures dev server is running
# Terminal 1: bun dev:all

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
User is running bun dev:all locally
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

# Sync main branch
git checkout main
git pull origin main
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
- **Bun v1.2.10** runtime and package manager
- **Turborepo** for optimized builds

### Code Standards
- 2-space indentation, 80-character line width
- Double quotes for JSX and strings
- **YOU MUST** use Biome commands: `bun run lint`, `bun run format`
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
bun run build:www
# OR from apps/www
cd apps/www && SKIP_ENV_VALIDATION=true bun run build

# Code quality (from root)
bun run lint
bun run format

# Environment sync (from apps/www)
cd apps/www && bun run env:sync
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
1. **Build failures**: Use `SKIP_ENV_VALIDATION=true bun run build`
2. **Merge conflicts**: Remove worktree first: `git worktree remove worktrees/<feature_name>`
3. **Context loss**: Check `./tmp_context/claude-context-*.md` files
4. **Deployment issues**: Monitor with `gh pr view <pr_number>`

### Quality Gate Failures
- **TypeScript errors**: Fix type issues before commit
- **Lint errors**: Run `bun run lint` to auto-fix
- **Build errors**: Check imports and environment variables

## Project Structure
```
├── apps/
│   ├── www/           # Main chat application
│   │   ├── src/       # Source code
│   │   │   ├── app/   # Next.js App Router pages
│   │   │   ├── components/  # React components (ui/, chat/, auth/)
│   │   │   └── lib/   # Utilities
│   │   ├── convex/    # Backend functions
│   │   └── public/    # Static assets
│   └── docs/          # Documentation site (future)
├── packages/          # Shared packages (future)
├── scripts/           # Development scripts
├── worktrees/         # Feature development (git worktrees)
├── turbo.json         # Turborepo configuration
└── CLAUDE.md         # This file
```

## Environment Variables
- `ANTHROPIC_API_KEY` - Claude Sonnet 4 (required)
- `OPENAI_API_KEY` - GPT models (required)
- `NEXT_PUBLIC_CONVEX_URL` - Backend URL (required)
- Optional: GitHub OAuth, JWT keys, SITE_URL

## Key Reminders

1. **WORKTREES ARE MANDATORY** - ANY code change requires a worktree, no exceptions
2. **NO LOCAL DEV SERVERS** - Test only on Vercel previews
3. **CONTEXT IS CRITICAL** - Always use context files and GitHub comments
4. **QUALITY GATES FIRST** - Build/lint must pass before commit
5. **WORKTREE CLEANUP** - Remove before merging to prevent errors
6. **USE TEMPLATES** - Always use issue templates with file references
7. **BIOME NOT ESLINT** - Use `bun run lint`, not ESLint commands

## Technology-Specific Documentation

For detailed guidelines on specific technologies used in this project, refer to:

- **Convex**: See `apps/www/convex/CLAUDE.md` for Convex-specific patterns, server rendering, optimistic updates, and API guidelines
- **Additional technology docs**: May be found in their respective directories
