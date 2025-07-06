# GitHub Actions Workflows

This directory contains GitHub Actions workflows for the MCP Quotes Server project.

## CI Workflow (ci.yml)

The CI workflow runs on every push to the main branch and on all pull requests. It:

- Tests the project on Node.js 18.x and 20.x
- Runs linting checks
- Performs TypeScript type checking
- Executes the test suite
- Builds the project
- Uploads build artifacts and coverage reports

## Release Workflow (release.yml)

The Release workflow is triggered when a version tag (v*) is pushed. It:

- Runs tests to ensure code quality
- Builds the project
- Verifies that the package.json version matches the Git tag
- Generates a changelog from commit messages
- Publishes the package to NPM (requires NPM_TOKEN secret)
- Creates a GitHub release with the changelog
- Uploads release artifacts

### Release Process

1. Update the version in package.json: `npm version patch/minor/major`
2. Push the changes and tags: `git push && git push --tags`
3. The release workflow will automatically publish to NPM and create a GitHub release

### Required Secrets

- `NPM_TOKEN`: NPM authentication token for publishing packages

### Workflow Features

- **Matrix builds**: Tests across multiple Node.js versions
- **Caching**: NPM dependencies are cached for faster builds
- **Error handling**: Workflows include proper error handling and validation
- **Artifact uploads**: Build and coverage artifacts are preserved
- **Automated changelog**: Release notes are generated from commit history