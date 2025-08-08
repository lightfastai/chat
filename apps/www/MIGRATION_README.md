# Message Migration Guide

This guide explains how to migrate legacy messages from the old format (with `body` and `thinkingContent` fields) to the new `parts` array format.

## Background

The chat application previously stored messages with separate fields:
- `body`: The main message content
- `thinkingContent`: The AI's reasoning/thinking process

These are now consolidated into a `parts` array where each part has a type:
- `type: "text"`: Regular message content
- `type: "reasoning"`: Thinking/reasoning content

## Migration Process

### Prerequisites

1. Ensure you have Convex dev environment running:
   ```bash
   pnpm run convex:dev
   ```

2. Make sure you're in the `apps/www` directory:
   ```bash
   cd apps/www
   ```

### Step 1: Check Current State

Count how many messages need migration:

```bash
npx convex run migrations:countLegacyMessages
```

This will show:
- Total messages in the database
- Messages that need migration (have `body` or `thinkingContent` but no `parts`)
- Messages already migrated (have `parts` array)

### Step 2: Run Migration

#### Option A: Use the automated script (Interactive)

```bash
./scripts/run-migration.sh
```

This script will:
1. Show you the count of messages to migrate
2. Ask for confirmation
3. Run the migration in batches
4. Optionally clean up legacy fields

#### Option B: Run manually

1. Run the migration in batches:
   ```bash
   npx convex run migrations:migrateMessagesToParts
   ```
   
   Repeat this command until it returns `"hasMore": false` or `"migrated": 0`.

2. Verify the migration:
   ```bash
   npx convex run migrations:countLegacyMessages
   ```

3. (Optional) Clean up legacy fields:
   ```bash
   npx convex run migrations:cleanupLegacyFields
   ```
   
   ⚠️ **Warning**: This permanently removes the old `body` and `thinkingContent` fields.

### Step 3: Verify

After migration, all messages should:
- Have a `parts` array with appropriate content
- Display correctly in the UI (both new and old messages)

## Migration Functions

### `migrations:countLegacyMessages`
Counts messages that need migration without modifying anything.

### `migrations:migrateMessagesToParts`
Migrates messages in batches (default: 100 at a time).
- Converts `thinkingContent` → `reasoning` part
- Converts `body` → `text` part
- Preserves original fields until cleanup

### `migrations:cleanupLegacyFields`
Removes legacy fields after successful migration.
- Removes: `body`, `thinkingContent`, `streamChunks`, and other deprecated fields
- Only affects messages that have been successfully migrated (have `parts`)

## Rollback

If you need to rollback:
1. The original fields are preserved until you run `cleanupLegacyFields`
2. The UI fallback code (in `MessageItem` component) can display both formats

## Safety Notes

1. The migration is idempotent - running it multiple times is safe
2. Messages with existing `parts` arrays are skipped
3. The UI supports both formats during transition
4. Always test in development before running in production

## Troubleshooting

### "No CONVEX_DEPLOYMENT set" error
Make sure you're running `pnpm run convex:dev` in another terminal.

### Migration seems stuck
The migration processes in batches. If you have many messages, you may need to run it multiple times.

### Messages not displaying after migration
Check that the `MessageItem` component has the fallback logic for legacy fields.

## Code References

- Migration logic: `convex/migrations.ts`
- UI display logic: `src/components/chat/shared/message-item.tsx`
- Migration script: `scripts/run-migration.sh`