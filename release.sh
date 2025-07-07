#!/bin/bash

# Release automation script for MCP Quotes Server
# This script handles the complete release process

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Clear screen for better visibility
clear

echo -e "${BLUE}╔═══════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     MCP Quotes Server Claude Code Release Tool     ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════╝${NC}"
echo ""

# Run pre-release checks
echo -e "${CYAN}Step 1: Running pre-release checks...${NC}"
echo ""

if ! ./pre-release-check.sh; then
    echo ""
    echo -e "${RED}Pre-release checks failed. Please fix the issues and try again.${NC}"
    exit 1
fi

echo ""
echo -e "${CYAN}Step 2: Version Selection${NC}"
echo ""

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
if [ -z "$CURRENT_VERSION" ]; then
    echo -e "${RED}Error: Could not read current version from package.json${NC}"
    exit 1
fi
echo -e "Current version: ${YELLOW}$CURRENT_VERSION${NC}"
echo ""

# Calculate next versions using Node.js to avoid triggering npm lifecycle scripts
PATCH_VERSION=$(node -e "const v='$CURRENT_VERSION'.split('.'); v[2]=parseInt(v[2])+1; console.log(v.join('.'))")
MINOR_VERSION=$(node -e "const v='$CURRENT_VERSION'.split('.'); v[1]=parseInt(v[1])+1; v[2]=0; console.log(v.join('.'))")
MAJOR_VERSION=$(node -e "const v='$CURRENT_VERSION'.split('.'); v[0]=parseInt(v[0])+1; v[1]=0; v[2]=0; console.log(v.join('.'))")

# Validate that version calculations succeeded
if [ -z "$PATCH_VERSION" ] || [ -z "$MINOR_VERSION" ] || [ -z "$MAJOR_VERSION" ]; then
    echo -e "${RED}Error: Failed to calculate next versions${NC}"
    echo "Current version: $CURRENT_VERSION"
    echo "Please ensure the version in package.json is in valid semver format (x.y.z)"
    exit 1
fi

# Show version options
echo "Select release type:"
echo -e "  1) Patch (${CURRENT_VERSION} → ${GREEN}${PATCH_VERSION}${NC}) - Bug fixes and minor changes"
echo -e "  2) Minor (${CURRENT_VERSION} → ${YELLOW}${MINOR_VERSION}${NC}) - New features, backwards compatible"
echo -e "  3) Major (${CURRENT_VERSION} → ${RED}${MAJOR_VERSION}${NC}) - Breaking changes"
echo -e "  4) Cancel"
echo ""

# Read user choice
read -p "Enter your choice (1-4): " choice

case $choice in
    1)
        VERSION_TYPE="patch"
        NEW_VERSION=$PATCH_VERSION
        ;;
    2)
        VERSION_TYPE="minor"
        NEW_VERSION=$MINOR_VERSION
        ;;
    3)
        VERSION_TYPE="major"
        NEW_VERSION=$MAJOR_VERSION
        ;;
    4)
        echo -e "${YELLOW}Release cancelled.${NC}"
        exit 0
        ;;
    *)
        echo -e "${RED}Invalid choice. Release cancelled.${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${CYAN}Step 3: Release Preview${NC}"
echo ""

# Show what will be included in the release
echo -e "${YELLOW}The following will be included in the release:${NC}"
echo ""

# Show recent commits since last tag
LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
if [ -n "$LAST_TAG" ]; then
    echo -e "${BLUE}Commits since $LAST_TAG:${NC}"
    git log $LAST_TAG..HEAD --oneline --pretty=format:"  - %s" | head -10
    COMMIT_COUNT=$(git log $LAST_TAG..HEAD --oneline | wc -l)
    if [ $COMMIT_COUNT -gt 10 ]; then
        echo "  ... and $((COMMIT_COUNT - 10)) more commits"
    fi
else
    echo -e "${BLUE}Recent commits:${NC}"
    git log HEAD~10..HEAD --oneline --pretty=format:"  - %s"
fi

echo ""
echo ""

# Show files that will be published
echo -e "${BLUE}Files to be published:${NC}"
echo "  - dist/          (compiled JavaScript)"
echo "  - README.md      (documentation)"
echo "  - LICENSE        (license file)"
echo "  - docs/          (additional documentation)"
echo "  - package.json   (package metadata)"
echo ""

# Show release summary
echo -e "${CYAN}Release Summary:${NC}"
echo -e "  • Current version: ${YELLOW}$CURRENT_VERSION${NC}"
echo -e "  • New version:     ${GREEN}$NEW_VERSION${NC}"
echo -e "  • Release type:    ${VERSION_TYPE}"
echo -e "  • Git tag:         v$NEW_VERSION"
echo -e "  • NPM registry:    $(node -p "require('./package.json').publishConfig?.access || 'default'")"
echo ""

# Final confirmation
echo -e "${YELLOW}⚠️  This will:${NC}"
echo "  1. Update version in package.json to $NEW_VERSION"
echo "  2. Format code and stage changes"
echo "  3. Create git commit and tag v$NEW_VERSION"
echo "  4. Push to remote repository (including tags)"
echo ""

read -p "Do you want to proceed with the release? (y/N): " confirm

if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Release cancelled.${NC}"
    exit 0
fi

echo ""
echo -e "${CYAN}Step 4: Creating Release${NC}"
echo ""

# Run the npm version command
echo -e "${YELLOW}Running npm version $VERSION_TYPE...${NC}"
if ! npm run release:$VERSION_TYPE; then
    echo -e "${RED}✗ Release failed${NC}"
    echo "  The npm version command failed. Please check the error above."
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Release Successful!${NC}"
echo ""
echo -e "Version ${GREEN}$NEW_VERSION${NC} has been created and pushed."
echo ""
echo -e "${CYAN}Next steps:${NC}"
echo "  1. Check GitHub for the new tag: https://github.com/rhofkens/mcp-quotes-server-claude-code/releases/tag/v$NEW_VERSION"
echo "  2. Create a GitHub release with release notes"
echo "  3. Publish to npm: ${YELLOW}npm publish${NC}"
echo ""
echo -e "${BLUE}To publish to npm, run:${NC}"
echo -e "  ${YELLOW}npm publish${NC}"
echo ""