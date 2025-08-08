#!/bin/bash

# Script to run the usage to metadata migration in batches
# This handles pagination automatically to avoid memory limits

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting usage → metadata migration...${NC}"
echo ""

# Initialize variables
TOTAL_PROCESSED=0
TOTAL_SKIPPED=0
CURSOR=""
BATCH_NUM=1
IS_DONE=false

# Run migration in batches
while [ "$IS_DONE" = "false" ]; do
  echo -e "${YELLOW}Running batch $BATCH_NUM...${NC}"
  
  # Build the command with optional cursor
  if [ -z "$CURSOR" ]; then
    RESULT=$(npx convex run --prod migrationRunners:runUsageToMetadata "{}")
  else
    RESULT=$(npx convex run --prod migrationRunners:runUsageToMetadata "{\"cursor\": \"$CURSOR\"}")
  fi
  
  # Parse the result
  PROCESSED=$(echo "$RESULT" | grep -o '"processed":[0-9]*' | cut -d':' -f2)
  SKIPPED=$(echo "$RESULT" | grep -o '"skipped":[0-9]*' | cut -d':' -f2)
  IS_DONE=$(echo "$RESULT" | grep -o '"isDone":[a-z]*' | cut -d':' -f2)
  CURSOR=$(echo "$RESULT" | grep -o '"continueCursor":"[^"]*"' | cut -d'"' -f4 || echo "")
  
  # Update totals
  TOTAL_PROCESSED=$((TOTAL_PROCESSED + PROCESSED))
  TOTAL_SKIPPED=$((TOTAL_SKIPPED + SKIPPED))
  
  echo "  Processed: $PROCESSED messages"
  echo "  Skipped: $SKIPPED messages"
  echo ""
  
  BATCH_NUM=$((BATCH_NUM + 1))
  
  # Small delay to avoid rate limiting
  sleep 0.5
done

echo -e "${GREEN}✅ Migration complete!${NC}"
echo "  Total processed: $TOTAL_PROCESSED messages"
echo "  Total skipped: $TOTAL_SKIPPED messages"
echo ""

# Check final status
echo -e "${BLUE}Checking final migration status...${NC}"
npx convex run --prod migrationStatus:check | grep -A2 "usageToMetadata"