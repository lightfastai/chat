# Clerk User Migration Guide

This directory contains the tools and scripts needed to migrate users from the current Convex Auth system to Clerk.

## Files Overview

- `migration-users.json` - Input data containing all 30 users from the Convex database
- `migrate-to-clerk.js` - Main migration script that uses Clerk Management API
- `migration-results.json` - Output file with detailed migration results (generated after running)

## Prerequisites

1. **Environment Variables**: The Clerk API keys are already configured in `apps/www/.vercel/.env.development`. The migration script will automatically use `pnpm with-env` to access them.

2. **Clerk Dashboard Access**: You should have access to the Clerk dashboard to verify results

## Running the Migration

### Step 1: Dry Run (Recommended)
First, you might want to do a test with a subset of users to ensure everything works:

```bash
# Navigate to the apps/www directory (where with-env is available)
cd submodules/chat/apps/www

# Test the setup first
pnpm run test:migration

# Run the migration script  
pnpm run migrate:clerk
```

### Step 2: Review Results
After running the script, check `migration-results.json` for:
- Summary of created/existing/failed users
- Detailed results for each user
- Any error messages

### Step 3: Verify in Clerk Dashboard
Go to your Clerk dashboard and verify that:
- New users were created successfully
- Existing users (like jp@jeevanpillay.com) were detected correctly
- User profiles include names and profile images

## Expected Results

The script will:
1. **Check for duplicates**: Users like `jp@jeevanpillay.com` that already exist will be detected
2. **Create new users**: New users will be created with:
   - Email address (marked as verified)
   - Profile image from GitHub
   - Name from the data
   - Skip password requirement (they can set it later or use OAuth)
3. **Generate mapping**: Create `convex_user_id → clerk_user_id` mapping for later use

## Migration Results Format

```json
{
  "summary": {
    "total": 30,
    "created": 25,
    "existed": 4,
    "failed": 1
  },
  "results": [
    {
      "convexId": "k9790x60x9wwg6t7xzg7sdbmj57hqa26",
      "email": "jp@jeevanpillay.com",
      "name": "jeevanpillay",
      "status": "existed",
      "clerkId": "user_2abc123def",
      "message": "User already exists in Clerk"
    }
  ]
}
```

## Next Steps After Migration

1. **Update Convex Schema**: Add `userEmail` field to threads table
2. **Create Migration Function**: Populate `userEmail` for existing threads
3. **Update Authentication**: Replace Convex Auth with Clerk in the chat app
4. **Update Queries**: Modify thread queries to use email-based lookups

## Troubleshooting

- **Rate Limiting**: The script includes 100ms delays between requests
- **API Errors**: Check that your `CLERK_SECRET_KEY` is valid and has the right permissions
- **Existing Users**: Users that already exist will be skipped (this is expected for some users)

## Safety Notes

- The script is **read-heavy, write-light**: It only creates users that don't exist
- **No data deletion**: The script never deletes or modifies existing users
- **Idempotent**: Can be run multiple times safely