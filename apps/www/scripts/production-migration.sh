#!/bin/bash

# Production-ready migration script for legacy messages
# Usage: ./scripts/production-migration.sh [--prod]

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check for production flag
PROD_FLAG=""
ENV_NAME="development"
if [[ "$1" == "--prod" || "$1" == "--production" ]]; then
    PROD_FLAG=""  # Convex uses environment selection, not --prod flag
    ENV_NAME="PRODUCTION"
    echo -e "${RED}⚠️  PRODUCTION MODE ENABLED${NC}"
    echo -e "${YELLOW}Make sure CONVEX_DEPLOYMENT is set to your production deployment${NC}"
fi

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}                    Legacy Message Migration Tool                              ${NC}"
echo -e "${BLUE}                    Environment: ${ENV_NAME}                                   ${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Function to check migration status
check_status() {
    echo -e "${YELLOW}📊 Checking migration status...${NC}"
    npx convex run --query migrations:status
    echo ""
}

# Function to run the body to parts migration
run_body_to_parts() {
    echo -e "${YELLOW}🚀 Starting body → parts migration...${NC}"
    echo -e "This migration will:"
    echo -e "  • Convert 'thinkingContent' fields to reasoning parts"
    echo -e "  • Convert 'body' fields to text parts"
    echo -e "  • Preserve all original data"
    echo ""
    
    if [[ "$ENV_NAME" == "PRODUCTION" ]]; then
        echo -e "${RED}⚠️  WARNING: You are about to run a migration in PRODUCTION!${NC}"
        echo -e "${RED}⚠️  This will modify real user data.${NC}"
        echo ""
        echo -e "Type 'MIGRATE PRODUCTION' to continue, or anything else to cancel:"
        read -r confirmation
        if [[ "$confirmation" != "MIGRATE PRODUCTION" ]]; then
            echo -e "${YELLOW}Migration cancelled.${NC}"
            exit 0
        fi
    else
        echo -e "Continue with migration? (y/n)"
        read -r response
        if [[ "$response" != "y" ]]; then
            echo -e "${YELLOW}Migration cancelled.${NC}"
            exit 0
        fi
    fi
    
    echo ""
    echo -e "${GREEN}Running migration...${NC}"
    npx convex run migrations:runBodyToParts
    
    echo ""
    echo -e "${GREEN}✅ Migration started successfully!${NC}"
    echo -e "The migration runs asynchronously. Check status with:"
    echo -e "  npx convex run --query migrations:status"
}

# Function to run cleanup
run_cleanup() {
    echo -e "${YELLOW}🧹 Starting cleanup of legacy fields...${NC}"
    echo -e "${RED}⚠️  WARNING: This will permanently remove:${NC}"
    echo -e "  • body"
    echo -e "  • thinkingContent"
    echo -e "  • streamChunks"
    echo -e "  • All other deprecated fields"
    echo ""
    echo -e "${RED}Make sure the bodyToParts migration is complete before running this!${NC}"
    echo ""
    
    if [[ "$ENV_NAME" == "PRODUCTION" ]]; then
        echo -e "${RED}⚠️  PRODUCTION CLEANUP - THIS CANNOT BE UNDONE!${NC}"
        echo -e "Type 'CLEANUP PRODUCTION' to continue:"
        read -r confirmation
        if [[ "$confirmation" != "CLEANUP PRODUCTION" ]]; then
            echo -e "${YELLOW}Cleanup cancelled.${NC}"
            exit 0
        fi
    else
        echo -e "Continue with cleanup? (y/n)"
        read -r response
        if [[ "$response" != "y" ]]; then
            echo -e "${YELLOW}Cleanup cancelled.${NC}"
            exit 0
        fi
    fi
    
    echo ""
    echo -e "${GREEN}Running cleanup...${NC}"
    npx convex run migrations:runCleanupLegacyFields
    
    echo ""
    echo -e "${GREEN}✅ Cleanup started successfully!${NC}"
}

# Main menu
while true; do
    echo -e "${BLUE}Select an option:${NC}"
    echo "  1) Check migration status"
    echo "  2) Run body → parts migration"
    echo "  3) Run cleanup (remove legacy fields)"
    echo "  4) Exit"
    echo ""
    echo -n "Enter your choice (1-4): "
    read -r choice
    echo ""
    
    case $choice in
        1)
            check_status
            ;;
        2)
            run_body_to_parts
            ;;
        3)
            run_cleanup
            ;;
        4)
            echo -e "${GREEN}Goodbye!${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}Invalid option. Please try again.${NC}"
            echo ""
            ;;
    esac
    
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
done