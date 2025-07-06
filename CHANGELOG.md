# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-01-06

### Added
- Two quote retrieval tools (`getQuotes` and `getResilientQuotes`) for flexible quote fetching
- Serper.dev API integration for web-based quote searching
- STDIO and HTTP transport support for MCP server communication
- Resilience patterns including:
  - In-memory caching with TTL support
  - Circuit breaker pattern for fault tolerance
  - Exponential backoff retry logic
  - Rate limiting protection
- Quote prompt template resources for easy integration
- Comprehensive error handling with detailed error messages
- Full TypeScript implementation with strict type safety
- Complete test suite with unit tests for all components
- Extensive documentation including:
  - README with setup instructions
  - API documentation
  - Architecture overview
  - Development guide

[1.0.0]: https://github.com/YOUR_USERNAME/mcp-quotes-server/releases/tag/v1.0.0