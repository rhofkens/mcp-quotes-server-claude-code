# Release Process

This document outlines the release process for MCP Quotes Server.

## Pre-Release Checklist

Before creating a release, ensure all items are checked:

### Code Quality
- [ ] All tests pass: `npm test`
- [ ] No linting errors: `npm run lint`
- [ ] TypeScript compiles without errors: `npm run typecheck`
- [ ] Code coverage meets minimum requirements (80%): `npm run test:coverage`
- [ ] All PRs for the release have been merged
- [ ] No critical security vulnerabilities in dependencies: `npm audit`

### Documentation
- [ ] README.md is up to date
- [ ] API documentation reflects all changes
- [ ] CHANGELOG.md has been updated with all changes
- [ ] Migration guide written (if breaking changes)
- [ ] All new features are documented
- [ ] Examples are updated and working

### Testing
- [ ] Manual testing completed using [MANUAL_TEST_CHECKLIST.md](./MANUAL_TEST_CHECKLIST.md)
- [ ] Integration tests pass (if applicable)
- [ ] Performance benchmarks meet requirements
- [ ] Tested on all supported Node.js versions
- [ ] Tested on all supported operating systems

## Version Bump Process

1. **Determine version number** following [Semantic Versioning](https://semver.org/):
   - MAJOR (x.0.0): Breaking changes
   - MINOR (0.x.0): New features, backwards compatible
   - PATCH (0.0.x): Bug fixes, backwards compatible

2. **Update version** in multiple places:
   ```bash
   # Update package.json version
   npm version <major|minor|patch>
   ```

3. **Prepare Release Notes**:
   - Review all commits since last release
   - Group changes by type (Added, Changed, Fixed, etc.)
   - Highlight breaking changes if any

4. **Commit version bump**:
   ```bash
   git add package.json package-lock.json CHANGELOG.md
   git commit -m "chore: bump version to vX.Y.Z"
   ```

## Build and Test

1. **Clean build**:
   ```bash
   rm -rf dist/
   npm run build
   ```

2. **Run full test suite**:
   ```bash
   npm run test:coverage
   npm run lint
   npm run typecheck
   ```

3. **Test the built package locally**:
   ```bash
   # Pack the package
   npm pack
   
   # Test in a separate directory
   cd /tmp
   mkdir test-mcp-quotes
   cd test-mcp-quotes
   npm init -y
   npm install /path/to/mcp-quotes-server-X.Y.Z.tgz
   
   # Verify it works
   node -e "console.log(require('mcp-quotes-server'))"
   ```

## NPM Publish Steps

1. **Login to npm** (if not already):
   ```bash
   npm login
   ```

2. **Publish to npm**:
   ```bash
   # For regular release
   npm publish
   
   # For pre-release (beta, rc, etc.)
   npm publish --tag beta
   ```

3. **Verify publication**:
   ```bash
   npm view mcp-quotes-server
   ```

## Git Release

1. **Create and push tag**:
   ```bash
   git tag -a vX.Y.Z -m "Release version X.Y.Z"
   git push origin vX.Y.Z
   ```

2. **Create GitHub release**:
   - Go to GitHub releases page
   - Click "Create a new release"
   - Select the tag you just created
   - Use "vX.Y.Z" as release title
   - Copy relevant section from CHANGELOG.md to release notes
   - Attach any additional assets if needed
   - Publish release

## Post-Release Verification

1. **Verify npm package**:
   ```bash
   # Install from npm in a clean directory
   cd /tmp
   mkdir verify-release
   cd verify-release
   npm init -y
   npm install mcp-quotes-server@X.Y.Z
   
   # Run basic smoke test
   npx mcp-quotes-server --version
   ```

2. **Test MCP integration**:
   - Install in a test MCP client
   - Verify tools are available
   - Test basic functionality

3. **Monitor for issues**:
   - Check GitHub issues for new reports
   - Monitor npm download stats
   - Check for any error reports

## Rollback Procedure

If critical issues are found:

1. **Deprecate the broken version**:
   ```bash
   npm deprecate mcp-quotes-server@X.Y.Z "Critical bug found, please use version X.Y.Z-1"
   ```

2. **Fix the issue** and create a patch release immediately

3. **Document the issue** in CHANGELOG.md

## Communication

After successful release:

1. **Update project status**:
   - Update badges in README if needed
   - Update project website (if applicable)

2. **Announce the release**:
   - Create announcement for major/minor releases
   - Post in relevant communities
   - Update any integration documentation

3. **Thank contributors**:
   - Mention contributors in release notes
   - Thank community for bug reports and feedback

## Release Schedule

- **Patch releases**: As needed for bug fixes
- **Minor releases**: When new features are ready
- **Major releases**: Only when necessary for breaking changes

## Security Releases

For security fixes:

1. Follow the regular process but expedite testing
2. Include security notice in CHANGELOG.md
3. Use `npm publish --tag security` initially
4. Move to latest tag after verification
5. Consider notifying users directly for critical vulnerabilities

## Automation Notes

Consider automating these steps in the future:
- Version bumping with conventional commits
- Changelog generation
- GitHub release creation
- NPM publishing via CI/CD
- Automated testing across Node versions

---

Remember: Take your time with releases. It's better to delay a release than to publish broken code.