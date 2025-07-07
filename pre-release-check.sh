#!/bin/bash

# Pre-release check script for MCP Quotes Server
# This script validates that the project is ready for release

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Pre-Release Check ===${NC}"
echo ""

# Function to check if command exists
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}✗ $1 is not installed${NC}"
        exit 1
    fi
}

# Check required tools
echo -e "${YELLOW}Checking required tools...${NC}"
check_command git
check_command npm
check_command node
echo -e "${GREEN}✓ All required tools installed${NC}"
echo ""

# Check for uncommitted changes
# echo -e "${YELLOW}Checking for uncommitted changes...${NC}"
# if ! git diff --quiet || ! git diff --cached --quiet; then
#     echo -e "${RED}✗ You have uncommitted changes${NC}"
#     echo "  Please commit or stash your changes before releasing."
#     git status --short
#     exit 1
# fi
# echo -e "${GREEN}✓ No uncommitted changes${NC}"
# echo ""

# Check current branch
echo -e "${YELLOW}Checking current branch...${NC}"
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo -e "${RED}✗ Not on main branch${NC}"
    echo "  Current branch: $CURRENT_BRANCH"
    echo "  Please switch to main branch before releasing."
    exit 1
fi
echo -e "${GREEN}✓ On main branch${NC}"
echo ""

# Check if remote is up to date
# echo -e "${YELLOW}Checking if branch is up to date with remote...${NC}"
# git fetch origin main --quiet
# LOCAL=$(git rev-parse HEAD)
# REMOTE=$(git rev-parse origin/main)
# 
# if [ "$LOCAL" != "$REMOTE" ]; then
#     echo -e "${RED}✗ Branch is not up to date with remote${NC}"
#     echo "  Please pull the latest changes or push your commits."
#     exit 1
# fi
# echo -e "${GREEN}✓ Branch is up to date with remote${NC}"
# echo ""

# Run build
echo -e "${YELLOW}Running build...${NC}"
if ! npm run build > /dev/null 2>&1; then
    echo -e "${RED}✗ Build failed${NC}"
    echo "  Please fix build errors before releasing."
    npm run build
    exit 1
fi
echo -e "${GREEN}✓ Build successful${NC}"
echo ""

# Run type check
echo -e "${YELLOW}Running type check...${NC}"
if ! npm run typecheck > /dev/null 2>&1; then
    echo -e "${RED}✗ Type check failed${NC}"
    echo "  Please fix TypeScript errors before releasing."
    npm run typecheck
    exit 1
fi
echo -e "${GREEN}✓ Type check passed${NC}"
echo ""

# Run linter
echo -e "${YELLOW}Running linter...${NC}"
if ! npm run lint > /dev/null 2>&1; then
    echo -e "${RED}✗ Linting failed${NC}"
    echo "  Please fix linting errors before releasing."
    npm run lint
    exit 1
fi
echo -e "${GREEN}✓ Linting passed${NC}"
echo ""

# Check formatting
# echo -e "${YELLOW}Checking code formatting...${NC}"
#if ! npm run format:check > /dev/null 2>&1; then
#    echo -e "${RED}✗ Code formatting issues found${NC}"
#    echo "  Please run 'npm run format' to fix formatting."
#    exit 1
#fi
#echo -e "${GREEN}✓ Code formatting is correct${NC}"
#echo ""

# Run tests
echo -e "${YELLOW}Running tests...${NC}"
if ! npm test > /dev/null 2>&1; then
    echo -e "${RED}✗ Tests failed${NC}"
    echo "  Please fix failing tests before releasing."
    npm test
    exit 1
fi
echo -e "${GREEN}✓ All tests passed${NC}"
echo ""

# Check if package-lock.json is in sync
# Note: Skipping this check as npm ci --dry-run has side effects in some environments
# echo -e "${YELLOW}Checking package-lock.json...${NC}"
# if npm ci --dry-run 2>&1 | grep -q "would have caused changes"; then
#     echo -e "${RED}✗ package-lock.json is out of sync${NC}"
#     echo "  Please run 'npm install' to update package-lock.json"
#     exit 1
# fi
# echo -e "${GREEN}✓ package-lock.json is in sync${NC}"
# echo ""

# All checks passed
echo -e "${GREEN}=== All Pre-Release Checks Passed! ===${NC}"
echo ""
echo "Current version: $(node -p "require('./package.json').version")"
echo "Ready for release!"