# Tooling Packages

This directory contains shared configuration packages for the monorepo.

## Packages

### @repo/biome-config
Shared Biome configuration for consistent code formatting and linting across the monorepo.

### @repo/typescript-config
Shared TypeScript configurations for different project types:
- `base.json` - Base TypeScript configuration
- `nextjs.json` - Configuration for Next.js applications
- `node.json` - Configuration for Node.js scripts and tools
- `react-library.json` - Configuration for React component libraries

## Usage

In your package's `package.json`:
```json
{
  "devDependencies": {
    "@repo/biome-config": "workspace:*",
    "@repo/typescript-config": "workspace:*"
  }
}
```

In your `tsconfig.json`:
```json
{
  "extends": "@repo/typescript-config/nextjs.json",
  "compilerOptions": {
    // Your project-specific overrides
  }
}
```

In your `biome.json`:
```json
{
  "extends": ["../../biome.json"]
}
```