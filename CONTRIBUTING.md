# Contributing to MCP Quotes Server

Thank you for your interest in contributing to MCP Quotes Server! We welcome contributions from the community and are grateful for any help you can provide.

## Table of Contents

- [How to Report Issues](#how-to-report-issues)
- [How to Submit Pull Requests](#how-to-submit-pull-requests)
- [Code Style Guidelines](#code-style-guidelines)
- [Testing Requirements](#testing-requirements)
- [Documentation Standards](#documentation-standards)

## How to Report Issues

If you find a bug or have a feature request, please open an issue on GitHub:

1. **Check existing issues** first to avoid duplicates
2. **Use the issue templates** if available
3. **Provide a clear title** that summarizes the issue
4. **Include relevant information**:
   - Node.js version
   - Operating system
   - Steps to reproduce (for bugs)
   - Expected vs actual behavior
   - Error messages or logs
   - Code samples (if applicable)

### Security Issues

For security vulnerabilities, please email the maintainers directly instead of opening a public issue.

## How to Submit Pull Requests

1. **Fork the repository** and create your branch from `main`
2. **Install dependencies**: `npm install`
3. **Make your changes** following our code style guidelines
4. **Add tests** for any new functionality
5. **Update documentation** as needed
6. **Run the test suite**: `npm test`
7. **Run linting**: `npm run lint`
8. **Run type checking**: `npm run typecheck`
9. **Commit your changes** using conventional commit messages
10. **Push to your fork** and submit a pull request

### Pull Request Guidelines

- **PR title** should clearly describe the change
- **PR description** should include:
  - What the change does
  - Why it's needed
  - Any breaking changes
  - Related issues (use "Fixes #123" syntax)
- **Keep PRs focused** - one feature/fix per PR
- **Add tests** - all new code must have test coverage
- **Update CHANGELOG.md** for user-facing changes

## Code Style Guidelines

We use TypeScript and follow these conventions:

### TypeScript/JavaScript

- Use ES modules (`import`/`export`)
- Destructure imports when possible
- Use `const` for constants, `let` for variables (no `var`)
- Use async/await instead of Promise chains
- Add JSDoc comments for public APIs
- Use meaningful variable and function names
- Keep functions small and focused

### File Organization

```
src/
├── index.ts          # Main entry point
├── server.ts         # MCP server setup
├── tools/            # MCP tool implementations
├── services/         # External service clients
├── resources/        # MCP resource providers
├── utils/            # Utility functions
└── types/            # TypeScript type definitions
```

### Naming Conventions

- **Files**: camelCase (e.g., `serperClient.ts`)
- **Classes**: PascalCase (e.g., `SerperClient`)
- **Functions/Variables**: camelCase (e.g., `getQuotes`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_RETRIES`)
- **Types/Interfaces**: PascalCase with 'I' prefix for interfaces (e.g., `IQuoteOptions`)

### Error Handling

- Always handle errors appropriately
- Use custom error classes from `utils/errors.ts`
- Provide meaningful error messages
- Log errors using the logger utility

## Testing Requirements

All code must have appropriate test coverage:

### Unit Tests

- Test files should be in `tests/unit/` mirroring the source structure
- Use `.test.ts` suffix for test files
- Write tests for:
  - Happy path scenarios
  - Error cases
  - Edge cases
  - Input validation

### Test Structure

```typescript
describe('ComponentName', () => {
  describe('methodName', () => {
    it('should do something when condition is met', () => {
      // Arrange
      // Act
      // Assert
    });
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Coverage Requirements

- Minimum 80% code coverage
- All new code must have tests
- Critical paths require 100% coverage

## Documentation Standards

### Code Documentation

- Add JSDoc comments for all public functions and classes
- Include parameter descriptions and return types
- Add examples for complex functions

```typescript
/**
 * Retrieves quotes based on the provided query
 * @param query - Search query for quotes
 * @param options - Additional options for the search
 * @returns Array of quotes matching the query
 * @throws {ValidationError} If query is invalid
 * @example
 * const quotes = await getQuotes('motivation', { limit: 5 });
 */
```

### README Updates

Update README.md when:
- Adding new features
- Changing installation steps
- Modifying configuration options
- Adding new environment variables

### API Documentation

- Document all MCP tools and resources
- Include parameter schemas
- Provide usage examples
- Document error responses

### Changelog

- Update CHANGELOG.md following [Keep a Changelog](https://keepachangelog.com/) format
- Group changes by type: Added, Changed, Deprecated, Removed, Fixed, Security
- Include issue/PR references

## Getting Help

If you need help:

1. Check the [documentation](./docs/)
2. Look for similar issues on GitHub
3. Ask in discussions (if enabled)
4. Contact maintainers

Thank you for contributing to MCP Quotes Server!