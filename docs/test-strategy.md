# MCP Quotes Server - Test Strategy Document

## Executive Summary

This document outlines a comprehensive testing strategy for the MCP Quotes Server project, targeting 50% code coverage with strategic Human-In-The-Loop (HITL) checkpoints throughout the development lifecycle.

## Test Framework Selection

**Primary Framework: Jest**
- **Rationale**: Industry-standard for TypeScript projects with excellent mocking capabilities
- **Key Benefits**:
  - Native TypeScript support
  - Rich assertion library
  - Built-in code coverage
  - Extensive community support
  - Compatible with MCP ecosystem

## Unit Testing Strategy (50% Coverage Target)

### Critical Components to Test

#### 1. Quote Retrieval Tool (High Priority)
- Parameter validation (person, numberOfQuotes, topic)
- Query construction logic
- Serper.dev API interaction
- Response parsing and quote extraction
- Error handling for API failures

#### 2. MCP Server Core (High Priority)
- Tool registration
- Resource registration
- Request/response handling
- Error propagation

#### 3. Prompt Template Resource (Medium Priority)
- Template structure validation
- Resource accessibility
- Template formatting

#### 4. Configuration Management (Medium Priority)
- Environment variable loading
- API key validation
- Default configuration handling

### Mock Strategy

```typescript
// Example: Mocking Serper.dev API
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

mockedAxios.get.mockResolvedValue({
  data: {
    organic: [
      { snippet: "Imagination is more important than knowledge." },
      { snippet: "Life is like riding a bicycle..." }
    ]
  }
});
```

### Test File Organization

```
src/
  tools/
    quoteRetrieval.ts
    __tests__/
      quoteRetrieval.test.ts
  resources/
    promptTemplate.ts
    __tests__/
      promptTemplate.test.ts
  server/
    index.ts
    __tests__/
      server.test.ts
  utils/
    queryBuilder.ts
    responseParser.ts
    __tests__/
      queryBuilder.test.ts
      responseParser.test.ts
test/
  fixtures/
    serperResponses.json
    mockQuotes.json
```

## HITL Testing Checkpoints

### Development Phase Checkpoints

#### 1. Initial Setup
- [ ] Verify TypeScript configuration
- [ ] Ensure MCP SDK installation
- [ ] Validate project structure

#### 2. Tool Implementation
- [ ] Test tool registration with MCP Inspector
- [ ] Verify parameter validation
- [ ] Test Serper.dev API integration

#### 3. Integration Phase
- [ ] Test with Claude Desktop
- [ ] Verify STDIO communication
- [ ] Test HTTP streaming (if implemented)

#### 4. Pre-Release
- [ ] Full end-to-end testing with npx
- [ ] Documentation review
- [ ] Performance validation

## Manual Testing Procedures

### 1. MCP Server Startup Verification

```bash
# Set environment variable
export SERPER_API_KEY="your-api-key"

# Start the server
npm start

# Expected: Server starts without errors
```

### 2. Tool Invocation Testing

```bash
# Start MCP Inspector
npx @modelcontextprotocol/inspector

# Test cases:
# - Valid person with topic
# - Valid person without topic
# - Non-existent person
# - Special characters in names
```

### 3. Error Scenario Testing
- Invalid API key handling
- Network disconnection
- Malformed requests
- Rate limiting

### 4. Performance Validation
- Response time < 2 seconds
- Stable memory usage
- No dropped requests under load

## Example Unit Tests

### Test 1: Quote Retrieval with Valid Parameters

```typescript
describe('Quote Retrieval Tool', () => {
  it('should retrieve quotes for valid person and topic', async () => {
    const input = {
      person: 'Albert Einstein',
      numberOfQuotes: 3,
      topic: 'science'
    };
    
    const result = await quoteRetrieval.execute(input);
    
    expect(result.quotes).toHaveLength(3);
    expect(result.quotes[0]).toHaveProperty('text');
    expect(result.quotes[0]).toHaveProperty('attribution');
  });
});
```

### Test 2: Parameter Validation

```typescript
describe('Parameter Validation', () => {
  it('should throw error for missing required parameters', async () => {
    const invalidInput = {
      numberOfQuotes: 3
      // missing 'person' parameter
    };
    
    await expect(quoteRetrieval.execute(invalidInput))
      .rejects.toThrow('Parameter "person" is required');
  });
});
```

### Test 3: MCP Server Registration

```typescript
describe('MCP Server', () => {
  it('should register quote retrieval tool', () => {
    const server = new MCPServer();
    const tools = server.getRegisteredTools();
    
    expect(tools).toContainEqual(
      expect.objectContaining({
        name: 'get_quotes',
        description: expect.stringContaining('quotes')
      })
    );
  });
});
```

## CI/CD Pipeline Configuration

### GitHub Actions Workflow

```yaml
name: Test and Build
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test -- --coverage
      - run: npm run build
```

### Coverage Thresholds

```json
{
  "jest": {
    "coverageThreshold": {
      "global": {
        "statements": 50,
        "branches": 40,
        "functions": 50,
        "lines": 50
      }
    }
  }
}
```

## Testing Priorities

### Phase 1 (Essential)
- Core quote retrieval functionality
- Parameter validation
- Basic error handling
- MCP tool registration

### Phase 2 (Important)
- Comprehensive error scenarios
- Performance testing
- Resource functionality
- Configuration management

### Phase 3 (Nice to Have)
- Edge case handling
- Stress testing
- Security testing
- Internationalization support

## Test Data and Fixtures

### serperResponses.json
```json
{
  "success": {
    "organic": [
      {
        "snippet": "Imagination is more important than knowledge.",
        "link": "https://example.com/einstein-quotes"
      }
    ]
  },
  "error": {
    "error": "Invalid API key"
  }
}
```

### mockQuotes.json
```json
[
  {
    "person": "Albert Einstein",
    "quote": "Imagination is more important than knowledge.",
    "topic": "science"
  }
]
```

## Success Metrics

- 50% code coverage achieved
- All critical paths tested
- Manual testing checklist completed
- Performance benchmarks met
- Documentation validated

## Next Steps

1. Set up Jest and TypeScript configuration
2. Create test file structure
3. Implement unit tests for critical components
4. Set up CI/CD pipeline
5. Create manual testing checklist
6. Document test execution procedures

This test strategy provides a balanced approach between automated testing and manual verification, ensuring the MCP Quotes Server is reliable, performant, and maintainable.