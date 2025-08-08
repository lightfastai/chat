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

# Step 2: Run the migration with pagination
echo ""
echo "🚀 Starting migration..."
echo "This will process messages in batches of 100."
echo ""

cursor=""
total_migrated=0
total_skipped=0
batch_num=0

while true; do
    batch_num=$((batch_num + 1))
    echo "Processing batch $batch_num..."
    
    # Run migration with cursor
    if [ -z "$cursor" ]; then
        result=$(npx convex run migrations:migrateMessagesToParts --batchSize 100 2>&1)
    else
        result=$(npx convex run migrations:migrateMessagesToParts --batchSize 100 --cursor "$cursor" 2>&1)
    fi
    
    # Extract values from the result
    migrated=$(echo "$result" | grep -oE '"migrated":[0-9]+' | grep -oE '[0-9]+' | head -1)
    skipped=$(echo "$result" | grep -oE '"skipped":[0-9]+' | grep -oE '[0-9]+' | head -1)
    isDone=$(echo "$result" | grep -oE '"isDone":(true|false)' | grep -oE '(true|false)' | head -1)
    newCursor=$(echo "$result" | grep -oE '"continueCursor":"[^"]*"' | sed 's/"continueCursor":"//' | sed 's/"$//')
    
    # Update totals
    if [ -n "$migrated" ]; then
        total_migrated=$((total_migrated + migrated))
    fi
    if [ -n "$skipped" ]; then
        total_skipped=$((total_skipped + skipped))
    fi
    
    echo "  Migrated: $migrated, Skipped: $skipped"
    
    # Check if we're done
    if [ "$isDone" = "true" ] || [ -z "$newCursor" ] || [ "$migrated" = "0" -a "$skipped" = "0" ]; then
        echo ""
        echo "✅ Migration complete!"
        echo "  Total migrated: $total_migrated"
        echo "  Total skipped: $total_skipped"
        break
    fi
    
    # Update cursor for next iteration
    cursor="$newCursor"
done

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

# Step 4: Clean up legacy fields with pagination
echo ""
echo "🧹 Cleaning up legacy fields..."

cursor=""
total_cleaned=0
total_skipped=0
batch_num=0

while true; do
    batch_num=$((batch_num + 1))
    echo "Processing cleanup batch $batch_num..."
    
    # Run cleanup with cursor
    if [ -z "$cursor" ]; then
        result=$(npx convex run migrations:cleanupLegacyFields --batchSize 100 2>&1)
    else
        result=$(npx convex run migrations:cleanupLegacyFields --batchSize 100 --cursor "$cursor" 2>&1)
    fi
    
    # Extract values from the result
    cleaned=$(echo "$result" | grep -oE '"cleaned":[0-9]+' | grep -oE '[0-9]+' | head -1)
    skipped=$(echo "$result" | grep -oE '"skipped":[0-9]+' | grep -oE '[0-9]+' | head -1)
    isDone=$(echo "$result" | grep -oE '"isDone":(true|false)' | grep -oE '(true|false)' | head -1)
    newCursor=$(echo "$result" | grep -oE '"continueCursor":"[^"]*"' | sed 's/"continueCursor":"//' | sed 's/"$//')
    
    # Update totals
    if [ -n "$cleaned" ]; then
        total_cleaned=$((total_cleaned + cleaned))
    fi
    if [ -n "$skipped" ]; then
        total_skipped=$((total_skipped + skipped))
    fi
    
    echo "  Cleaned: $cleaned, Skipped: $skipped"
    
    # Check if we're done
    if [ "$isDone" = "true" ] || [ -z "$newCursor" ] || [ "$cleaned" = "0" -a "$skipped" = "0" ]; then
        echo ""
        echo "✅ Cleanup complete!"
        echo "  Total cleaned: $total_cleaned"
        echo "  Total skipped: $total_skipped"
        break
    fi
    
    # Update cursor for next iteration
    cursor="$newCursor"
done

echo ""
echo "🎉 Migration finished successfully!"