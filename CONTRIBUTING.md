# Contributing to Lightfast Chat

Thank you for your interest in contributing to Lightfast Chat! We welcome contributions from the community and are excited to see what you'll build.

## 🧪 About This Project

Lightfast Chat is an **experimental project** that pioneers deep integration with [Claude Code](https://claude.ai/code), Anthropic's AI-powered development assistant. This unique approach allows for:

- **AI-First Development**: Claude Code can understand the entire codebase through `CLAUDE.md` instructions
- **Automated Workflows**: From issue creation to PR merge, Claude Code can handle the complete development lifecycle
- **Context Preservation**: Sophisticated context management survives session interruptions
- **Quality Assurance**: Automated build, lint, and test cycles before every commit

While we've optimized our workflow for Claude Code collaboration, **traditional development is fully supported**. You can contribute using your preferred IDE and workflow.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Development Workflows](#development-workflows)
  - [Claude Code Workflow (Preferred)](#claude-code-workflow-preferred)
  - [Traditional Workflow](#traditional-workflow)
- [Submitting Changes](#submitting-changes)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Documentation](#documentation)
- [Community](#community)

## Code of Conduct

We are committed to providing a welcoming and inspiring community for all. Please read and follow our Code of Conduct:

- Be respectful and inclusive
- Welcome newcomers and help them get started
- Focus on constructive criticism
- Respect differing viewpoints and experiences

## Getting Started

### Prerequisites

- **pnpm v9+** - Our package manager
- **Node.js 20+** - JavaScript runtime
- **Node.js 18+** - Required for some tooling
- **Git** - Version control
- **GitHub Account** - For authentication and contributing

### Required API Keys

To run the full application, you'll need:

- **Anthropic API Key** - For Claude Sonnet 4 ([Get it here](https://console.anthropic.com))
- **OpenAI API Key** - For GPT models ([Get it here](https://platform.openai.com/api-keys))
- **GitHub OAuth App** - For authentication ([Setup guide](https://github.com/settings/developers))

## Development Setup

### 1. Fork and Clone

```bash
# Fork the repository on GitHub, then:
git clone https://github.com/YOUR_USERNAME/chat.git
cd chat
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Environment Setup

```bash
# Copy the example environment file
cp .env.example .env.local

# Edit .env.local with your API keys
# Required: ANTHROPIC_API_KEY, OPENAI_API_KEY, AUTH_GITHUB_ID, AUTH_GITHUB_SECRET

# Sync environment variables to Convex (run from root with .env.local in root)
pnpm run env:sync
```

### 4. Start Development Servers

```bash
# Terminal 1: Start Convex dev server
pnpm run convex:dev

# Terminal 2: Start Next.js dev server
pnpm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see your local instance.

## Development Workflows

### Claude Code Workflow (Preferred)

Our project includes a comprehensive `CLAUDE.md` file that provides Claude Code with deep understanding of our codebase, patterns, and workflows. This enables an AI-assisted development experience that can handle complex tasks autonomously.

#### How Claude Code Development Works

1. **Context-Aware Development**: Claude Code reads `CLAUDE.md` to understand:
   - Project structure and conventions
   - Convex patterns and best practices
   - Git worktree workflows
   - Quality gate requirements
   - Deployment processes

2. **Automated Workflow Execution**: Claude Code can:
   - Create and manage git worktrees
   - Run build, lint, and test cycles
   - Fix TypeScript errors iteratively
   - Commit with proper formatting
   - Create PRs with detailed descriptions
   - Monitor Vercel deployments

3. **Context Preservation**: Claude Code maintains context through:
   - Local context files (`/tmp/claude-context-*.md`)
   - GitHub PR/issue comments
   - Todo list tracking
   - Session state management

#### Using Claude Code

```bash
# Example Claude Code session
"Please integrate react-scan for performance monitoring"

# Claude Code will:
# 1. Create issue with proper template
# 2. Set up worktree automatically
# 3. Research existing patterns
# 4. Implement the feature
# 5. Run quality checks iteratively
# 6. Commit and push changes
# 7. Create PR with test instructions
# 8. Provide Vercel preview URL
```

#### Development Modes with Claude Code

**Vercel Build Mode** (Default):
- Claude Code handles the complete lifecycle
- Automatic commits and deployments
- Test on Vercel preview URLs
- Best for production-ready features

**Local Dev Mode**:
- You run `pnpm run dev` locally
- Claude Code acts as code generator
- Real-time local testing
- Best for rapid prototyping

### Traditional Workflow

If you prefer traditional development without Claude Code, that's perfectly fine! Follow these steps:

### 1. Create an Issue

Before starting work, create or find an issue:

```bash
# Use our issue templates
gh issue create --repo lightfastai/chat
```

Issue templates available:
- **Feature Request** - For new features
- **Bug Report** - For fixing issues
- **Quick Task** - For simple changes

### 2. Create a Branch

You can use either git worktrees (recommended) or regular branches:

```bash
# Option 1: Worktrees (recommended for isolation)
git worktree add worktrees/YOUR_GITHUB_USERNAME/feature-name -b YOUR_GITHUB_USERNAME/feature-name
cd worktrees/YOUR_GITHUB_USERNAME/feature-name

# Option 2: Regular branch
git checkout -b YOUR_GITHUB_USERNAME/feature-name
```

### 3. Make Your Changes

- Write clean, readable code following our standards
- Add tests for new functionality
- Update documentation as needed
- Ensure all quality checks pass

### 4. Quality Checks

Before committing, ensure your code passes all checks:

```bash
# Build validation (MUST pass)
SKIP_ENV_VALIDATION=true pnpm run build

# Linting and formatting (MUST pass)
pnpm run lint
pnpm run format

# Type checking
pnpm run typecheck
```

### 5. Commit Your Changes

Follow our commit message format:

```bash
git add .
git commit -m "feat: add dark mode toggle

- Add theme context provider
- Implement toggle component
- Update styles for dark mode"
```

Commit types:
- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Test additions or changes
- `chore:` - Maintenance tasks

### Why We Prefer Claude Code Workflow

1. **Consistency**: Every PR follows the same high standards
2. **Efficiency**: Automated quality checks and fixes
3. **Documentation**: Automatic context preservation
4. **Learning**: See AI-driven development patterns in action
5. **Innovation**: Push the boundaries of AI-assisted development

However, we recognize that not everyone wants to use AI tools, and that's okay! Our codebase is fully accessible for traditional development.

## Submitting Changes

### 1. Push Your Branch

```bash
git push -u origin YOUR_GITHUB_USERNAME/feature-name
```

### 2. Create a Pull Request

```bash
gh pr create --repo lightfastai/chat \
  --title "feat: your feature name" \
  --body "Closes #ISSUE_NUMBER"
```

### 3. PR Requirements

Your PR must:
- ✅ Pass all CI checks
- ✅ Have a clear description
- ✅ Reference the related issue
- ✅ Include tests (if applicable)
- ✅ Update documentation (if needed)
- ✅ Be reviewed by at least one maintainer

### 4. After Merge

Clean up your worktree (if using worktrees):

```bash
# Remove worktree AFTER the PR is merged
git worktree remove worktrees/YOUR_GITHUB_USERNAME/feature-name
```

## Understanding CLAUDE.md

The `CLAUDE.md` file in our repository is a comprehensive guide that teaches Claude Code about our:

- **Project Architecture**: Component structure, file organization, and patterns
- **Convex Integration**: Database schemas, real-time patterns, and best practices
- **Development Workflow**: Git worktrees, automated testing, and deployment
- **Code Standards**: TypeScript patterns, React conventions, and performance optimizations
- **Context Management**: How to preserve work across interrupted sessions

This file is continuously updated as we discover new patterns and improve our workflows. Contributors are encouraged to read it to understand our development philosophy, even if not using Claude Code.

## Coding Standards

### TypeScript

- Use strict mode
- Define explicit types (avoid `any`)
- Use interfaces for object shapes
- Prefer `const` over `let`

```typescript
// ✅ Good
interface User {
  id: string;
  name: string;
  email: string;
}

const getUser = async (id: string): Promise<User> => {
  // Implementation
};

// ❌ Bad
const getUser = async (id: any) => {
  // Implementation
};
```

### React Components

- Use functional components with hooks
- Follow shadcn/ui patterns
- Keep components focused and small
- Use proper TypeScript types

```tsx
// ✅ Good
interface ButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
}

export function Button({ onClick, children, variant = "primary" }: ButtonProps) {
  return (
    <button onClick={onClick} className={cn(/* styles */)}>
      {children}
    </button>
  );
}
```

### Styling

- Use Tailwind CSS classes
- Follow the design system
- Keep styles consistent
- Use CSS variables for theming

### File Organization

```
src/
├── app/              # Next.js pages (App Router)
├── components/       # React components
│   ├── ui/          # shadcn/ui components
│   ├── chat/        # Chat-specific components
│   └── auth/        # Auth components
├── lib/             # Utilities and helpers
└── hooks/           # Custom React hooks

convex/
├── schema.ts        # Database schema
├── auth.ts          # Authentication functions
└── messages.ts      # Message handlers
```

## Testing Guidelines

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test --watch

# Run specific test file
pnpm test src/components/Button.test.tsx
```

### Writing Tests

- Test user behavior, not implementation
- Cover edge cases
- Keep tests focused and readable
- Use meaningful test descriptions

```typescript
describe("Button", () => {
  it("should call onClick when clicked", () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    fireEvent.click(screen.getByText("Click me"));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

## Documentation

### Code Comments

- Add JSDoc comments for complex functions
- Explain "why" not "what"
- Keep comments up to date

```typescript
/**
 * Validates and processes user input before sending to AI.
 * Strips potentially harmful content and enforces length limits.
 *
 * @param input - Raw user input from chat interface
 * @returns Sanitized input safe for AI processing
 */
function processUserInput(input: string): string {
  // Implementation
}
```

### README Updates

Update the README when you:
- Add new features
- Change setup requirements
- Modify environment variables
- Update dependencies

## Community

### Getting Help

- 💬 [Discord](https://discord.gg/YqPDfcar2C) - Chat with the community
- 🐛 [Issues](https://github.com/lightfastai/chat/issues) - Report bugs or request features
- 💡 [Discussions](https://github.com/lightfastai/chat/discussions) - Share ideas and feedback

### Stay Updated

- ⭐ Star the repository to show support
- 👀 Watch for updates and releases
- 🐦 Follow [@lightfastai](https://x.com/lightfastai) on Twitter

## Experimental Features

As an experimental project, we encourage contributors to:

- **Try AI-Assisted Development**: Experience how Claude Code can accelerate your workflow
- **Provide Feedback**: Share your experiences with AI-driven development
- **Suggest Improvements**: Help us refine the `CLAUDE.md` instructions
- **Push Boundaries**: Experiment with new ways AI can assist development

## License

By contributing to Lightfast Chat, you agree that your contributions will be licensed under the [FSL-1.1-Apache-2.0 License](LICENSE.md).

---

Thank you for contributing to Lightfast Chat! Together, we're building the future of AI-powered chat applications and pioneering new ways for humans and AI to collaborate on software development. 🚀
