# Repository Cleanup Checklist

## Files to Remove

### Root Directory
```bash
# Test and analysis files
rm test-output.txt
rm test-failure-analysis.md
rm test-failure-summary.md
rm TEST_FIX_SUMMARY.md
rm PHASE3_REVIEW.md

# Log files
rm http-server.log

# Development tools (verify if needed first)
# rm claude-flow
```

### Coverage Reports
```bash
# Remove entire coverage directory
rm -rf coverage/
```

### Logs Directory
```bash
# Remove all log files
rm -rf logs/
```

### Memory Backups
```bash
# Remove all backup files
rm -rf memory/backups/*.json
```

## Files to Move

### Documentation Files
```bash
# Move misplaced documentation to docs/
mv src/utils/resilience-implementation.md docs/
mv TESTING.md docs/
```

## Files to Create

### LICENSE File
```bash
# Create MIT LICENSE file
cat > LICENSE << 'EOF'
MIT License

Copyright (c) 2025 MCP Quotes Server Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
EOF
```

## Update .gitignore

✅ **Note: The .gitignore file is already properly configured with all necessary entries!**

Current .gitignore already includes:
```
# Coverage reports
coverage/
*.lcov

# Logs
logs/
*.log

# Memory backups
memory/backups/

# Test outputs
test-output.txt
test-*.md

# Development files
PHASE*.md
*REVIEW*.md
TEST_FIX_*.md

# OS files
.DS_Store
Thumbs.db

# Editor directories
.idea/
.vscode/
*.swp
*.swo
```

## Cleanup Script

To execute all cleanup tasks at once:
```bash
#!/bin/bash
# cleanup.sh - Run this script to clean up the repository

echo "Starting repository cleanup..."

# Remove test and analysis files
echo "Removing test output files..."
rm -f test-output.txt test-failure-analysis.md test-failure-summary.md TEST_FIX_SUMMARY.md PHASE3_REVIEW.md

# Remove log files
echo "Removing log files..."
rm -f http-server.log
rm -rf logs/

# Remove coverage reports
echo "Removing coverage reports..."
rm -rf coverage/

# Clean up memory backups
echo "Cleaning up memory backups..."
rm -f memory/backups/*.json

# Move documentation files
echo "Moving documentation files..."
if [ -f "src/utils/resilience-implementation.md" ]; then
  mv src/utils/resilience-implementation.md docs/
fi
if [ -f "TESTING.md" ]; then
  mv TESTING.md docs/
fi

echo "Cleanup complete!"
echo "Don't forget to:"
echo "1. Create LICENSE file"
echo "2. Update .gitignore"
echo "3. Verify if claude-flow is needed"
echo "4. Consider removing phase task lists from plans/"
```

## Post-Cleanup Verification

After cleanup, verify:
- [ ] All test files removed
- [ ] No log files remain
- [ ] Coverage directory deleted
- [ ] Memory backups cleaned
- [ ] Documentation files moved to docs/
- [ ] LICENSE file created
- [ ] .gitignore updated
- [ ] Repository is clean for production release