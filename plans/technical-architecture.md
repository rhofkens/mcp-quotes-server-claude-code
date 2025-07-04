# MCP Quotes Server - Technical Architecture

## 1. Overall System Architecture

### Overview
The MCP Quotes Server is a TypeScript-based Model Context Protocol server that provides quote retrieval capabilities through tools and resources. The architecture follows a modular, service-oriented design pattern with clear separation of concerns.

### Architecture Diagram
```
┌─────────────────────────────────────────────────────┐
│                  MCP Client                         │
│              (Claude Desktop, etc.)                 │
└─────────────────────┬───────────────────────────────┘
                      │ MCP Protocol
                      │ (STDIO/HTTP)
┌─────────────────────▼───────────────────────────────┐
│                 MCP Server Core                     │
│  ┌────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │   Server   │  │   Transport  │  │  Protocol  │ │
│  │ Bootstrap  │  │   Handler    │  │  Handler   │ │
│  └────────────┘  └──────────────┘  └────────────┘ │
└─────────────────────┬───────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────┐
│              Handler Layer                          │
│  ┌────────────────┐      ┌────────────────────┐   │
│  │  Tool Handler  │      │ Resource Handler   │   │
│  │  (getQuotes)   │      │ (quote-template)   │   │
│  └────────┬───────┘      └────────────────────┘   │
└───────────┼─────────────────────────────────────────┘
            │
┌───────────▼─────────────────────────────────────────┐
│              Service Layer                          │
│  ┌──────────────┐  ┌──────────────┐               │
│  │ Quote Service│  │ Serper API   │               │
│  │              │  │   Client     │               │
│  └──────────────┘  └──────────────┘               │
└─────────────────────────────────────────────────────┘
```

## 2. Component Breakdown and Responsibilities

### Core Components

#### 2.1 Server Component (`src/server/index.ts`)
- **Responsibility**: Initialize and configure the MCP server
- **Functions**:
  - Bootstrap the server with appropriate transport (STDIO/HTTP)
  - Register tools and resources
  - Handle lifecycle events
  - Configure error handling

#### 2.2 Tool Handler Component (`src/tools/getQuotes.ts`)
- **Responsibility**: Implement the quote retrieval tool
- **Functions**:
  - Validate input parameters (person, numberOfQuotes, topic)
  - Delegate to Quote Service for data retrieval
  - Format and return response according to MCP protocol

#### 2.3 Resource Handler Component (`src/resources/quoteTemplate.ts`)
- **Responsibility**: Provide the quote prompt template resource
- **Functions**:
  - Return structured template for quote-related prompts
  - Ensure consistent format for AI model interactions

#### 2.4 Quote Service (`src/services/quoteService.ts`)
- **Responsibility**: Business logic for quote operations
- **Functions**:
  - Construct search queries
  - Handle caching (future enhancement)
  - Process and filter quote results
  - Apply business rules

#### 2.5 Serper API Client (`src/services/serperClient.ts`)
- **Responsibility**: Interface with Serper.dev API
- **Functions**:
  - Make HTTP requests to Serper API
  - Handle authentication via API key
  - Parse API responses
  - Implement retry logic
  - Handle rate limiting

## 3. Data Flow and State Management

### Request Flow
1. **Client Request** → MCP Server receives tool invocation
2. **Validation** → Tool handler validates parameters
3. **Service Call** → Quote Service constructs search query
4. **API Call** → Serper Client makes external API request
5. **Response Processing** → Parse and extract quotes
6. **Response Return** → Format and send back via MCP protocol

### State Management
- **Stateless Design**: Each request is independent
- **Configuration State**: Loaded once at startup (API keys, server config)
- **No Session State**: No user sessions or persistent state between requests
- **Future Consideration**: In-memory cache for frequently requested quotes

## 4. API/Tool Design Patterns

### Tool Definition Pattern
```typescript
interface GetQuotesTool {
  name: "getQuotes";
  description: "Retrieve quotes from a specific person on an optional topic";
  inputSchema: {
    type: "object";
    properties: {
      person: {
        type: "string";
        description: "The person whose quotes to retrieve";
      };
      numberOfQuotes: {
        type: "number";
        description: "Number of quotes to return";
        minimum: 1;
        maximum: 10;
      };
      topic?: {
        type: "string";
        description: "Optional topic to filter quotes";
      };
    };
    required: ["person", "numberOfQuotes"];
  };
}
```

### Resource Definition Pattern
```typescript
interface QuoteTemplateResource {
  uri: "quote-template://prompt";
  name: "Quote Prompt Template";
  description: "Template for generating quote-related prompts";
  mimeType: "text/plain";
}
```

## 5. Error Handling Strategy

### Error Categories
1. **Validation Errors**: Invalid input parameters
2. **API Errors**: Serper.dev API failures
3. **Network Errors**: Connection timeouts, DNS failures
4. **Rate Limit Errors**: API quota exceeded
5. **Configuration Errors**: Missing API keys

### Error Handling Approach
```typescript
class QuoteServerError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public isRetryable: boolean = false
  ) {
    super(message);
  }
}
```

### Error Response Pattern
- Use MCP protocol error responses
- Include helpful error messages
- Log errors with appropriate severity
- Implement exponential backoff for retryable errors

## 6. Project Structure

```
mcp-quotes-server/
├── src/
│   ├── server/
│   │   ├── index.ts          # Server bootstrap and initialization
│   │   └── config.ts         # Configuration management
│   ├── tools/
│   │   ├── index.ts          # Tool registry
│   │   └── getQuotes.ts      # Get quotes tool implementation
│   ├── resources/
│   │   ├── index.ts          # Resource registry
│   │   └── quoteTemplate.ts  # Quote template resource
│   ├── services/
│   │   ├── quoteService.ts   # Business logic for quotes
│   │   └── serperClient.ts   # Serper.dev API client
│   ├── types/
│   │   ├── index.ts          # Main type exports
│   │   ├── tools.ts          # Tool type definitions
│   │   ├── resources.ts      # Resource type definitions
│   │   └── api.ts            # API response types
│   └── utils/
│       ├── validation.ts     # Input validation utilities
│       ├── errors.ts         # Error handling utilities
│       └── logger.ts         # Logging utilities
├── tests/
│   ├── unit/
│   │   ├── tools/
│   │   ├── services/
│   │   └── utils/
│   └── integration/
│       └── server.test.ts
├── plans/
│   └── technical-architecture.md
├── docs/
│   ├── PRD/
│   └── API.md
├── .github/
│   └── workflows/
│       └── ci.yml
├── package.json
├── tsconfig.json
├── .env.example
├── .gitignore
└── README.md
```

## 7. Technical Decisions

### Language and Runtime
- **TypeScript 5.x**: For type safety and better developer experience
- **Node.js 20.x**: LTS version for stability
- **ES Modules**: Modern module system

### Dependencies
```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "axios": "^1.6.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "vitest": "^1.0.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "eslint": "^8.0.0",
    "prettier": "^3.0.0",
    "tsx": "^4.0.0"
  }
}
```

### TypeScript Configuration
```typescript
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022"],
    "moduleResolution": "bundler",
    "rootDir": "./src",
    "outDir": "./dist",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### Build Process
- **Build Tool**: Native TypeScript compiler (tsc)
- **Development**: tsx for direct TypeScript execution
- **Testing**: Vitest for fast unit testing
- **CI/CD**: GitHub Actions for automated testing and publishing

### Code Organization Principles
1. **Single Responsibility**: Each module has one clear purpose
2. **Dependency Injection**: Services receive dependencies as constructor parameters
3. **Interface-First**: Define interfaces before implementations
4. **Error Boundaries**: Catch errors at appropriate levels
5. **Immutability**: Prefer immutable data structures
6. **Pure Functions**: Minimize side effects in business logic

### Testing Strategy
- **Unit Tests**: For all services and utilities
- **Integration Tests**: For server initialization and tool execution
- **Mocking**: Mock external API calls in tests
- **Coverage Target**: 80% code coverage

### Security Considerations
- **API Key Management**: Use environment variables, never commit keys
- **Input Validation**: Strict validation using Zod schemas
- **Rate Limiting**: Implement client-side rate limiting
- **Error Messages**: Don't expose sensitive information

### Performance Considerations
- **Async/Await**: Use throughout for non-blocking operations
- **Connection Pooling**: Reuse HTTP connections
- **Timeout Management**: Set appropriate timeouts for API calls
- **Future Enhancement**: Implement caching layer

## 8. Implementation Priorities

### Phase 1: Core Implementation
1. Server setup and configuration
2. Basic tool implementation
3. Serper API integration
4. Error handling

### Phase 2: Enhancement
1. Resource implementation
2. Comprehensive testing
3. Documentation
4. CI/CD setup

### Phase 3: Production Ready
1. Performance optimization
2. Enhanced error handling
3. Monitoring and logging
4. NPM publishing setup

## 9. Key Design Decisions

1. **Modular Architecture**: Enables easy testing and future extensions
2. **Service Layer Pattern**: Separates business logic from protocol handling
3. **TypeScript Strict Mode**: Catches errors at compile time
4. **Zod for Validation**: Runtime type checking with TypeScript integration
5. **Environment-Based Config**: Flexible deployment configurations
6. **Stateless Design**: Simplifies scaling and deployment

This architecture provides a solid foundation for the MCP Quotes Server while maintaining flexibility for future enhancements and ensuring code quality through proper structure and testing.