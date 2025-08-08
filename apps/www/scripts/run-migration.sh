#!/bin/bash

# Script to run the legacy messages migration
# Usage: ./scripts/run-migration.sh

echo "🔄 Legacy Message Migration"
echo "================================"
echo ""

# Step 1: Count messages that need migration
echo "📊 Counting messages that need migration..."
npx convex run migrations:countLegacyMessages

echo ""
echo "Do you want to proceed with the migration? (y/n)"
read -r response

if [[ "$response" != "y" ]]; then
    echo "Migration cancelled."
    exit 0
fi

# Step 2: Run the migration
echo ""
echo "🚀 Starting migration..."
echo "This will run in batches of 100 messages."
echo ""

# Run migration batches until complete
while true; do
    result=$(npx convex run migrations:migrateMessagesToParts --batch-size 100)
    echo "$result"
    
    # Check if there are more messages to migrate
    if echo "$result" | grep -q '"hasMore":false' || echo "$result" | grep -q '"migrated":0'; then
        break
    fi
    
    echo "Processing next batch..."
done

echo ""
echo "✅ Migration complete!"
echo ""

# Step 3: Verify the migration
echo "📊 Final count:"
npx convex run migrations:countLegacyMessages

echo ""
echo "Do you want to clean up legacy fields? (y/n)"
echo "⚠️  This will permanently remove the old body and thinkingContent fields."
read -r response

if [[ "$response" != "y" ]]; then
    echo "Cleanup skipped. Legacy fields retained."
    exit 0
fi

# Step 4: Clean up legacy fields
echo ""
echo "🧹 Cleaning up legacy fields..."

while true; do
    result=$(npx convex run migrations:cleanupLegacyFields --batch-size 100)
    echo "$result"
    
    # Check if there are more messages to clean
    if echo "$result" | grep -q '"hasMore":false' || echo "$result" | grep -q '"cleaned":0'; then
        break
    fi
    
    echo "Processing next batch..."
done

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "🎉 Migration finished successfully!"