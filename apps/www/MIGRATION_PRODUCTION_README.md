# Production Migration Guide

This guide provides step-by-step instructions for running the message migration in production using the official Convex migrations component.

## ⚠️ CRITICAL: Pre-Production Checklist

Before running in production, ensure:

- [ ] **UI Fallback is deployed** - The `MessageItem` component has fallback logic for legacy messages
- [ ] **Tested in development** - Migration has been successfully run in dev environment
- [ ] **Database backup exists** - Ensure you have a recent backup
- [ ] **Low traffic period** - Schedule migration during off-peak hours
- [ ] **Monitoring ready** - Have error tracking and logs accessible

## Migration Overview

The migration converts legacy message fields:
- `body` → `text` part
- `thinkingContent` → `reasoning` part

Using the official `@convex-dev/migrations` component, which provides:
- Automatic batching and progress tracking
- Resume capability on failure
- Real-time status monitoring
- Idempotent execution (safe to run multiple times)

## Step-by-Step Production Process

### Step 1: Deploy Updated Code

First, deploy the code with migration definitions and UI fallback:

```bash
git pull origin main
pnpm install
npx convex deploy --prod
```

### Step 2: Check Current State

```bash
# Check migration status
npx convex run --prod --query migrations:status

# See how many messages need migration (optional)
npx convex run --prod migrations:countLegacyMessages
```

### Step 3: Run Migration

Use the production migration script for safety checks:

```bash
./scripts/production-migration.sh --prod
```

Or run directly via CLI:

```bash
# Run the body → parts migration
npx convex run --prod migrations:runBodyToParts
```

### Step 4: Monitor Progress

The migration runs asynchronously. Monitor progress:

```bash
# Check status repeatedly
watch -n 5 'npx convex run --prod --query migrations:status'

# Or check manually
npx convex run --prod --query migrations:status
```

Expected output:
```json
{
  "bodyToParts": {
    "state": "inProgress", // or "success"
    "progress": {
      "processed": 1234,
      "total": 5678,
      "completed": false
    }
  }
}
```

### Step 5: Verify in UI

After migration completes:
1. Check a few old conversations in the production app
2. Verify messages display correctly
3. Test both user and assistant messages
4. Check messages with reasoning/thinking content

### Step 6: Cleanup (Optional - Wait 1 Week)

**⚠️ IMPORTANT**: Wait at least 1 week after successful migration before cleanup!

After confirming everything works:

```bash
# Remove legacy fields permanently
npx convex run --prod migrations:runCleanupLegacyFields

# Monitor cleanup progress
npx convex run --prod --query migrations:status
```

## Rollback Plan

If issues occur:

### Option 1: UI Fallback (Automatic)
The `MessageItem` component already has fallback logic that displays legacy fields if parts are missing.

### Option 2: Stop Migration
```bash
# The migration can be stopped at any time
# It will resume from where it left off when restarted
```

### Option 3: Manual Revert (if cleanup was not run)
Since legacy fields are preserved until cleanup, the original data remains intact.

## Command Reference

### Check Status
```bash
npx convex run --prod --query migrations:status
```

### Run Migrations
```bash
# Body to parts migration
npx convex run --prod migrations:runBodyToParts

# Cleanup legacy fields (after verification)
npx convex run --prod migrations:runCleanupLegacyFields
```

### Using the Interactive Script
```bash
# Development
./scripts/production-migration.sh

# Production (with safety prompts)
./scripts/production-migration.sh --prod
```

## Troubleshooting

### Migration seems stuck
- Check status: `npx convex run --prod --query migrations:status`
- The migration processes in batches, large datasets take time
- Check Convex dashboard for any errors

### Messages not displaying after migration
- Verify the UI fallback code is deployed
- Check browser console for errors
- Confirm the parts array was created correctly

### High database load
- The migration runs in batches to minimize load
- You can stop and restart the migration if needed
- Consider running during off-peak hours

## Architecture Notes

The migration uses Convex's official migrations component which:
- Tracks progress in a `_migrations` table
- Processes documents in batches
- Handles failures gracefully with resume capability
- Ensures each document is only processed once

## Support

If you encounter issues:
1. Check the Convex dashboard logs
2. Review error tracking (Sentry)
3. The migration is idempotent - safe to restart
4. Legacy fields are preserved until explicit cleanup

## Timeline Recommendation

1. **Day 1**: Deploy code and run migration
2. **Day 2-7**: Monitor for any issues
3. **Week 2**: Run cleanup if everything is stable
4. **Week 3**: Remove fallback code in next deployment

Remember: The migration is designed to be safe. Legacy fields are preserved, the UI has fallbacks, and the process can be stopped/resumed at any time.