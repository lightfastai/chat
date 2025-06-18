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
- **Turborepo + Bun**: Lightning-fast builds with intelligent caching

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
CONTEXT_FILE="/tmp/claude-context-$(basename $(pwd)).md"

# Create or check existing context file
if [ -f "$CONTEXT_FILE" ]; then
  echo "📋 Resuming from existing context:"
  cat "$CONTEXT_FILE"
else
  echo "🆕 Creating new context file: $CONTEXT_FILE"
fi
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

## End-to-End Workflow

### Step 1: Resume or Start Work

**ALWAYS** check for existing work first:
```bash
# Check existing worktrees
git worktree list

# Check for existing context files
ls -la /tmp/claude-context-*.md

# If worktree exists, navigate to it
cd worktrees/<feature_name>

# Load existing context
CONTEXT_FILE="/tmp/claude-context-$(basename $(pwd)).md"
cat "$CONTEXT_FILE" 2>/dev/null || echo "No existing context found"
```

### Step 2: Issue Creation with Templates

**YOU MUST** use issue templates for all work:

1. **Feature Request** - For new features
2. **Bug Report** - For fixing issues
3. **Quick Task** - For simple tasks

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
cp ../../.env.local .env.local
bun run env:sync
```

### Step 4: Development Cycle

**Choose your development mode based on your setup:**

#### 🚀 Vercel Build Mode (Default)
```bash
# 1. Set up context tracking
CONTEXT_FILE="/tmp/claude-context-$(basename $(pwd)).md"
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
CONTEXT_FILE="/tmp/claude-context-$(basename $(pwd)).md"
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

### Non-Blocking SSR with Convex
**YOU MUST** use this pattern for optimal performance:
```tsx
// ❌ NEVER do this (blocking)
export default async function Page() {
  const user = await getCurrentUser() // Blocks rendering
  return <Profile user={user} />
}

// ✅ ALWAYS do this (non-blocking)
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
# Build validation
SKIP_ENV_VALIDATION=true bun run build

# Code quality
bun run lint
bun run format

# Environment sync
bun run env:sync
```

### Context Management
```bash
# Set context file
CONTEXT_FILE="/tmp/claude-context-$(basename $(pwd)).md"

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
3. **Context loss**: Check `/tmp/claude-context-*.md` files
4. **Deployment issues**: Monitor with `gh pr view <pr_number>`

### Quality Gate Failures
- **TypeScript errors**: Fix type issues before commit
- **Lint errors**: Run `bun run lint` to auto-fix
- **Build errors**: Check imports and environment variables

## Project Structure
```
├── src/
│   ├── app/            # Next.js App Router pages
│   ├── components/     # React components (ui/, chat/, auth/)
│   └── lib/           # Utilities
├── convex/            # Backend functions
├── scripts/           # Development scripts
├── worktrees/         # Feature development (git worktrees)
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

## Convex Guidelines

### Next.js Server Rendering Patterns

#### Preloading Data for Client Components
**YOU MUST** use `preloadQuery` from `convex/nextjs` for optimal server rendering:

```tsx
// ❌ NEVER do this (client component waits for data)
"use client"
export function Tasks() {
  const tasks = useQuery(api.tasks.list) // Loads after hydration
  return <TaskList tasks={tasks} />
}

// ✅ ALWAYS do this (data preloaded on server)
// In Server Component:
import { preloadQuery } from "convex/nextjs"
import { api } from "@/convex/_generated/api"
import { Tasks } from "./Tasks"

export async function TasksWrapper() {
  const preloadedTasks = await preloadQuery(api.tasks.list, {
    list: "default"
  })
  return <Tasks preloadedTasks={preloadedTasks} />
}

// In Client Component:
"use client"
import { Preloaded, usePreloadedQuery } from "convex/react"
import { api } from "@/convex/_generated/api"

export function Tasks(props: {
  preloadedTasks: Preloaded<typeof api.tasks.list>
}) {
  const tasks = usePreloadedQuery(props.preloadedTasks)
  return <TaskList tasks={tasks} />
}
```

#### Chat Application Example
```tsx
// app/chat/[threadId]/page.tsx
import { preloadQuery } from "convex/nextjs"
import { api } from "@/convex/_generated/api"
import { ChatInterface } from "@/components/chat/ChatInterface"

export default async function ChatPage({ 
  params 
}: { 
  params: { threadId: string } 
}) {
  const token = await getAuthToken()
  
  // Preload both thread and messages
  const [preloadedThread, preloadedMessages] = await Promise.all([
    preloadQuery(
      api.threads.get, 
      { threadId: params.threadId as Id<"threads"> },
      { token }
    ),
    preloadQuery(
      api.messages.list,
      { threadId: params.threadId as Id<"threads"> },
      { token }
    )
  ])
  
  return (
    <ChatInterface 
      preloadedThread={preloadedThread}
      preloadedMessages={preloadedMessages}
    />
  )
}
```

#### Server Components with Non-Reactive Data
Use `fetchQuery` for server-only data that doesn't need reactivity:

```tsx
// app/settings/page.tsx
import { fetchQuery } from "convex/nextjs"
import { api } from "@/convex/_generated/api"

export default async function SettingsPage() {
  const token = await getAuthToken()
  const user = await fetchQuery(api.users.current, {}, { token })
  
  // Server-rendered, non-reactive
  return <SettingsForm defaultValues={user} />
}
```

#### Server Actions with Convex
```tsx
// app/chat/actions.ts
"use server"
import { fetchMutation } from "convex/nextjs"
import { api } from "@/convex/_generated/api"
import { revalidatePath } from "next/cache"

export async function sendMessage(threadId: Id<"threads">, content: string) {
  const token = await getAuthToken()
  
  await fetchMutation(
    api.messages.send,
    { threadId, content },
    { token }
  )
  
  revalidatePath(`/chat/${threadId}`)
}
```

#### Authentication with Convex SSR
```tsx
// app/auth.ts
import { auth } from "@clerk/nextjs/server"

export async function getAuthToken() {
  return (await (await auth()).getToken({ template: "convex" })) ?? undefined
}
```

### Optimistic Updates

#### Basic Pattern
```tsx
// src/hooks/useOptimisticMutation.ts
import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"

export function useOptimisticSendMessage() {
  return useMutation(api.messages.send).withOptimisticUpdate(
    (localStore, args) => {
      const { threadId, content } = args
      
      // Get current messages
      const existingMessages = localStore.getQuery(api.messages.list, { threadId })
      if (existingMessages === undefined) return
      
      // Create optimistic message
      const optimisticMessage = {
        _id: `temp_${crypto.randomUUID()}` as Id<"messages">,
        _creationTime: Date.now(),
        threadId,
        content,
        userId: "pending" as Id<"users">,
        model: null,
        role: "user" as const,
      }
      
      // Update local store (NEVER mutate, always create new array)
      localStore.setQuery(
        api.messages.list, 
        { threadId }, 
        [...existingMessages, optimisticMessage]
      )
    }
  )
}
```

#### Chat Application Optimistic Updates
```tsx
// src/components/chat/useChat.ts
export function useChat(threadId: Id<"threads">) {
  const sendMessage = useMutation(api.messages.send).withOptimisticUpdate(
    (localStore, args) => {
      const { threadId, content } = args
      
      // Update messages list
      const messages = localStore.getQuery(api.messages.list, { threadId })
      if (messages) {
        localStore.setQuery(api.messages.list, { threadId }, [
          ...messages,
          {
            _id: `optimistic_${Date.now()}` as Id<"messages">,
            _creationTime: Date.now(),
            threadId,
            content,
            userId: "pending" as Id<"users">,
            model: null,
            role: "user" as const,
          }
        ])
      }
      
      // Update thread's last message
      const thread = localStore.getQuery(api.threads.get, { threadId })
      if (thread) {
        localStore.setQuery(api.threads.get, { threadId }, {
          ...thread,
          lastMessageTime: Date.now(),
          updatedAt: Date.now()
        })
      }
    }
  )
  
  return { sendMessage }
}
```

#### Important Rules for Optimistic Updates
1. **NEVER mutate objects** - Always create new objects/arrays
2. **Check for undefined** - Query might not be loaded
3. **Match server structure** - Optimistic data should match server response
4. **Use temporary IDs** - Will be replaced by real IDs after mutation
5. **Handle rollbacks gracefully** - UI will revert if mutation fails

### Function Guidelines

#### New Function Syntax
- ALWAYS use the new function syntax for Convex functions. For example:
```typescript
import { query } from "./_generated/server";
import { v } from "convex/values";
export const f = query({
    args: {},
    returns: v.null(),
    handler: async (ctx, args) => {
    // Function body
    },
});
```

#### HTTP Endpoint Syntax
- HTTP endpoints are defined in `convex/http.ts` and require an `httpAction` decorator. For example:
```typescript
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
const http = httpRouter();
http.route({
    path: "/echo",
    method: "POST",
    handler: httpAction(async (ctx, req) => {
    const body = await req.bytes();
    return new Response(body, { status: 200 });
    }),
});
```
- HTTP endpoints are always registered at the exact path you specify in the `path` field. For example, if you specify `/api/someRoute`, the endpoint will be registered at `/api/someRoute`.

#### Validators
- Below is an example of an array validator:
```typescript
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export default mutation({
args: {
    simpleArray: v.array(v.union(v.string(), v.number())),
},
handler: async (ctx, args) => {
    //...
},
});
```
- Below is an example of a schema with validators that codify a discriminated union type:
```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    results: defineTable(
        v.union(
            v.object({
                kind: v.literal("error"),
                errorMessage: v.string(),
            }),
            v.object({
                kind: v.literal("success"),
                value: v.number(),
            }),
        ),
    )
});
```
- Always use the `v.null()` validator when returning a null value. Below is an example query that returns a null value:
```typescript
import { query } from "./_generated/server";
import { v } from "convex/values";

export const exampleQuery = query({
  args: {},
  returns: v.null(),
  handler: async (ctx, args) => {
      console.log("This query returns a null value");
      return null;
  },
});
```
- Here are the valid Convex types along with their respective validators:

| Convex Type | TS/JS type   | Example Usage          | Validator for argument validation and schemas   | Notes                                                                                                                                                                                                  |
|-------------|--------------|------------------------|-------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Id          | string       | `doc._id`              | `v.id(tableName)`                              |                                                                                                                                                                                                        |
| Null        | null         | `null`                 | `v.null()`                                     | JavaScript's `undefined` is not a valid Convex value. Functions the return `undefined` or do not return will return `null` when called from a client. Use `null` instead.                              |
| Int64       | bigint       | `3n`                   | `v.int64()`                                    | Int64s only support BigInts between -2^63 and 2^63-1. Convex supports `bigint`s in most modern browsers.                                                                                               |
| Float64     | number       | `3.1`                  | `v.number()`                                   | Convex supports all IEEE-754 double-precision floating point numbers (such as NaNs). Inf and NaN are JSON serialized as strings.                                                                       |
| Boolean     | boolean      | `true`                 | `v.boolean()`                                  |                                                                                                                                                                                                        |
| String      | string       | `"abc"`                | `v.string()`                                   | Strings are stored as UTF-8 and must be valid Unicode sequences. Strings must be smaller than the 1MB total size limit when encoded as UTF-8.                                                          |
| Bytes       | ArrayBuffer  | `new ArrayBuffer(8)`   | `v.bytes()`                                    | Convex supports first class bytestrings, passed in as `ArrayBuffer`s. Bytestrings must be smaller than the 1MB total size limit for Convex types.                                                      |
| Array       | Array        | `[1, 3.2, "abc"]`      | `v.array(values)`                              | Arrays can have at most 8192 values.                                                                                                                                                                   |
| Object      | Object       | `{a: "abc"}`           | `v.object({property: value})`                  | Convex only supports "plain old JavaScript objects" (objects that do not have a custom prototype). Objects can have at most 1024 entries. Field names must be nonempty and not start with "$" or "_".  |
| Record      | Record       | `{"a": "1", "b": "2"}` | `v.record(keys, values)`                       | Records are objects at runtime, but can have dynamic keys. Keys must be only ASCII characters, nonempty, and not start with "$" or "_".                                                                |

#### Function Registration
- Use `internalQuery`, `internalMutation`, and `internalAction` to register internal functions. These functions are private and aren't part of an app's API. They can only be called by other Convex functions. These functions are always imported from `./_generated/server`.
- Use `query`, `mutation`, and `action` to register public functions. These functions are part of the public API and are exposed to the public Internet. Do NOT use `query`, `mutation`, or `action` to register sensitive internal functions that should be kept private.
- You CANNOT register a function through the `api` or `internal` objects.
- ALWAYS include argument and return validators for all Convex functions. This includes all of `query`, `internalQuery`, `mutation`, `internalMutation`, `action`, and `internalAction`. If a function doesn't return anything, include `returns: v.null()` as its output validator.
- If the JavaScript implementation of a Convex function doesn't have a return value, it implicitly returns `null`.

#### Function Calling
- Use `ctx.runQuery` to call a query from a query, mutation, or action.
- Use `ctx.runMutation` to call a mutation from a mutation or action.
- Use `ctx.runAction` to call an action from an action.
- ONLY call an action from another action if you need to cross runtimes (e.g. from V8 to Node). Otherwise, pull out the shared code into a helper async function and call that directly instead.
- Try to use as few calls from actions to queries and mutations as possible. Queries and mutations are transactions, so splitting logic up into multiple calls introduces the risk of race conditions.
- All of these calls take in a `FunctionReference`. Do NOT try to pass the callee function directly into one of these calls.
- When using `ctx.runQuery`, `ctx.runMutation`, or `ctx.runAction` to call a function in the same file, specify a type annotation on the return value to work around TypeScript circularity limitations. For example:
```typescript
export const f = query({
  args: { name: v.string() },
  returns: v.string(),
  handler: async (ctx, args) => {
    return "Hello " + args.name;
  },
});

export const g = query({
  args: {},
  returns: v.null(),
  handler: async (ctx, args) => {
    const result: string = await ctx.runQuery(api.example.f, { name: "Bob" });
    return null;
  },
});
```

#### Function References
- Function references are pointers to registered Convex functions.
- Use the `api` object defined by the framework in `convex/_generated/api.ts` to call public functions registered with `query`, `mutation`, or `action`.
- Use the `internal` object defined by the framework in `convex/_generated/api.ts` to call internal (or private) functions registered with `internalQuery`, `internalMutation`, or `internalAction`.
- Convex uses file-based routing, so a public function defined in `convex/example.ts` named `f` has a function reference of `api.example.f`.
- A private function defined in `convex/example.ts` named `g` has a function reference of `internal.example.g`.
- Functions can also registered within directories nested within the `convex/` folder. For example, a public function `h` defined in `convex/messages/access.ts` has a function reference of `api.messages.access.h`.

#### API Design
- Convex uses file-based routing, so thoughtfully organize files with public query, mutation, or action functions within the `convex/` directory.
- Use `query`, `mutation`, and `action` to define public functions.
- Use `internalQuery`, `internalMutation`, and `internalAction` to define private, internal functions.

#### Pagination
- Paginated queries are queries that return a list of results in incremental pages.
- You can define pagination using the following syntax:
```typescript
import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
export const listWithExtraArg = query({
    args: { paginationOpts: paginationOptsValidator, author: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
        .query("messages")
        .filter((q) => q.eq(q.field("author"), args.author))
        .order("desc")
        .paginate(args.paginationOpts);
    },
});
```
Note: `paginationOpts` is an object with the following properties:
- `numItems`: the maximum number of documents to return (the validator is `v.number()`)
- `cursor`: the cursor to use to fetch the next page of documents (the validator is `v.union(v.string(), v.null())`)
- A query that ends in `.paginate()` returns an object that has the following properties:
  - page (contains an array of documents that you fetches)
  - isDone (a boolean that represents whether or not this is the last page of documents)
  - continueCursor (a string that represents the cursor to use to fetch the next page of documents)

### Validator Guidelines
- `v.bigint()` is deprecated for representing signed 64-bit integers. Use `v.int64()` instead.
- Use `v.record()` for defining a record type. `v.map()` and `v.set()` are not supported.

### Schema Guidelines
- Always define your schema in `convex/schema.ts`.
- Always import the schema definition functions from `convex/server`:
- System fields are automatically added to all documents and are prefixed with an underscore. The two system fields that are automatically added to all documents are `_creationTime` which has the validator `v.number()` and `_id` which has the validator `v.id(tableName)`.
- Always include all index fields in the index name. For example, if an index is defined as `["field1", "field2"]`, the index name should be "by_field1_and_field2".
- Index fields must be queried in the same order they are defined. If you want to be able to query by "field1" then "field2" and by "field2" then "field1", you must create separate indexes.

### TypeScript Guidelines
- You can use the helper typescript type `Id` imported from './_generated/dataModel' to get the type of the id for a given table. For example if there is a table called 'users' you can use `Id<'users'>` to get the type of the id for that table.
- If you need to define a `Record` make sure that you correctly provide the type of the key and value in the type. For example a validator `v.record(v.id('users'), v.string())` would have the type `Record<Id<'users'>, string>`. Below is an example of using `Record` with an `Id` type in a query:
```typescript
import { query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

export const exampleQuery = query({
    args: { userIds: v.array(v.id("users")) },
    returns: v.record(v.id("users"), v.string()),
    handler: async (ctx, args) => {
        const idToUsername: Record<Id<"users">, string> = {};
        for (const userId of args.userIds) {
            const user = await ctx.db.get(userId);
            if (user) {
                users[user._id] = user.username;
            }
        }

        return idToUsername;
    },
});
```
- Be strict with types, particularly around id's of documents. For example, if a function takes in an id for a document in the 'users' table, take in `Id<'users'>` rather than `string`.
- Always use `as const` for string literals in discriminated union types.
- When using the `Array` type, make sure to always define your arrays as `const array: Array<T> = [...];`
- When using the `Record` type, make sure to always define your records as `const record: Record<KeyType, ValueType> = {...};`
- Always add `@types/node` to your `package.json` when using any Node.js built-in modules.

### Full Text Search Guidelines
- A query for "10 messages in channel '#general' that best match the query 'hello hi' in their body" would look like:
```typescript
const messages = await ctx.db
  .query("messages")
  .withSearchIndex("search_body", (q) =>
    q.search("body", "hello hi").eq("channel", "#general"),
  )
  .take(10);
```

### Query Guidelines
- Do NOT use `filter` in queries. Instead, define an index in the schema and use `withIndex` instead.
- Convex queries do NOT support `.delete()`. Instead, `.collect()` the results, iterate over them, and call `ctx.db.delete(row._id)` on each result.
- Use `.unique()` to get a single document from a query. This method will throw an error if there are multiple documents that match the query.
- When using async iteration, don't use `.collect()` or `.take(n)` on the result of a query. Instead, use the `for await (const row of query)` syntax.

#### Ordering
- By default Convex always returns documents in ascending `_creationTime` order.
- You can use `.order('asc')` or `.order('desc')` to pick whether a query is in ascending or descending order. If the order isn't specified, it defaults to ascending.
- Document queries that use indexes will be ordered based on the columns in the index and can avoid slow table scans.

### Mutation Guidelines
- Use `ctx.db.replace` to fully replace an existing document. This method will throw an error if the document does not exist.
- Use `ctx.db.patch` to shallow merge updates into an existing document. This method will throw an error if the document does not exist.

### Action Guidelines
- Always add `"use node";` to the top of files containing actions that use Node.js built-in modules.
- Never use `ctx.db` inside of an action. Actions don't have access to the database.
- Below is an example of the syntax for an action:
```typescript
import { action } from "./_generated/server";

export const exampleAction = action({
    args: {},
    returns: v.null(),
    handler: async (ctx, args) => {
        console.log("This action does not return anything");
        return null;
    },
});
```

### Scheduling Guidelines

#### Cron Guidelines
- Only use the `crons.interval` or `crons.cron` methods to schedule cron jobs. Do NOT use the `crons.hourly`, `crons.daily`, or `crons.weekly` helpers.
- Both cron methods take in a FunctionReference. Do NOT try to pass the function directly into one of these methods.
- Define crons by declaring the top-level `crons` object, calling some methods on it, and then exporting it as default. For example:
```typescript
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";

const empty = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx, args) => {
    console.log("empty");
  },
});

const crons = cronJobs();

// Run `internal.crons.empty` every two hours.
crons.interval("delete inactive users", { hours: 2 }, internal.crons.empty, {});

export default crons;
```
- You can register Convex functions within `crons.ts` just like any other file.
- If a cron calls an internal function, always import the `internal` object from '_generated/api', even if the internal function is registered in the same file.

### File Storage Guidelines
- Convex includes file storage for large files like images, videos, and PDFs.
- The `ctx.storage.getUrl()` method returns a signed URL for a given file. It returns `null` if the file doesn't exist.
- Do NOT use the deprecated `ctx.storage.getMetadata` call for loading a file's metadata.
- Instead, query the `_storage` system table. For example, you can use `ctx.db.system.get` to get an `Id<"_storage">`.
```typescript
import { query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

type FileMetadata = {
    _id: Id<"_storage">;
    _creationTime: number;
    contentType?: string;
    sha256: string;
    size: number;
}

export const exampleQuery = query({
    args: { fileId: v.id("_storage") },
    returns: v.null();
    handler: async (ctx, args) => {
        const metadata: FileMetadata | null = await ctx.db.system.get(args.fileId);
        console.log(metadata);
        return null;
    },
});
```
- Convex storage stores items as `Blob` objects. You must convert all items to/from a `Blob` when using Convex storage.
