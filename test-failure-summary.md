# Test Failure Quick Summary

## Failing Test Suites: 7
1. `tests/unit/utils/config.test.ts` - 2 failures
2. `tests/unit/utils/errors.enhanced.test.ts` - 2 failures  
3. `tests/unit/utils/errors.test.ts` - 7 failures
4. `tests/unit/services/serperClient.test.ts` - TypeScript compilation errors
5. `tests/unit/resources/promptTemplate.test.ts` - TypeScript compilation errors
6. `tests/unit/server.test.ts` - TypeScript compilation errors
7. `tests/integration/server.integration.test.ts` - TypeScript compilation errors (file doesn't exist)

## Primary Issues
1. **Enhanced Error Messages**: All error classes now provide detailed user guidance, but tests expect simple messages
2. **Type Mismatches**: SerperSearchResult vs Quote interface confusion
3. **MCP SDK Integration**: Request handler signatures don't match SDK expectations
4. **Missing Async/Await**: Several tests missing await on async calls

## Quick Fixes Needed
1. Update all error message assertions to match enhanced messages
2. Fix SerperSearchResult usage - use correct properties (snippet, not text)
3. Add missing `extra` parameter to MCP request handlers
4. Add missing await keywords in promptTemplate tests
5. Update NODE_ENV test to expect 'test' instead of 'development'

## Detailed analysis available in: `/workspaces/mcp-quotes-server-claude-code/test-failure-analysis.md`