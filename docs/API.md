# MCP Quotes Server API Documentation

## Overview

The MCP Quotes Server provides tools for searching quotes from famous and not-so-famous people using the Serper.dev API. The server supports both STDIO and HTTP transport modes, offering standard and resilient versions of the quote retrieval tool.

## Transport Modes

### STDIO Transport (Default)
- Direct integration with Claude Desktop and other MCP clients
- Communication via standard input/output streams
- No network configuration required

### HTTP Transport
- RESTful API endpoints for remote access
- Session-based communication with MCP protocol
- Health monitoring endpoint

## HTTP Endpoints

### POST /mcp
Main MCP protocol endpoint for all tool and resource operations.

**Headers:**
- `Content-Type: application/json`
- `Mcp-Session-Id: <session-id>` (required after initialization)

**Response Headers:**
- `Mcp-Session-Id: <session-id>` (returned on initialization)

### GET /health
Health check endpoint for monitoring.

**Response:**
```json
{
  "status": "ok",
  "transport": "http",
  "sessions": 2
}
```

## Tools

### getQuotes
Search for quotes from a specific person using the Serper.dev search API. This is the standard version with basic error handling and retry logic.

**Parameters:**
- `person` (string, required): The name of the person whose quotes you want to find
- `numberOfQuotes` (number, required): The number of quotes to return (minimum: 1, maximum: 10)
- `topic` (string, optional): A specific topic to filter the quotes by

**Returns:** 
- An array of quote objects containing:
  - `text`: The quote text
  - `author`: The person who said the quote
  - `source`: Where the quote was found (if available)

**Example Request:**
```json
{
  "person": "Albert Einstein",
  "numberOfQuotes": 3,
  "topic": "science"
}
```

**Example Response:**
```json
{
  "quotes": [
    {
      "text": "Imagination is more important than knowledge.",
      "author": "Albert Einstein",
      "source": "https://example.com/einstein-quotes"
    },
    {
      "text": "The important thing is not to stop questioning.",
      "author": "Albert Einstein",
      "source": "https://example.com/einstein-science"
    },
    {
      "text": "Science without religion is lame, religion without science is blind.",
      "author": "Albert Einstein",
      "source": "https://example.com/einstein-philosophy"
    }
  ]
}
```

**Performance Characteristics:**
- Average response time: 1-2 seconds
- Timeout: 30 seconds
- Retry attempts: Up to 3 with broader searches
- Circuit breaker: Opens after 5 consecutive failures

### getResilientQuotes
Enhanced version of getQuotes with advanced resilience patterns including caching, circuit breaker, and automatic fallback to cached data.

**Parameters:**
- `person` (string, required): The name of the person whose quotes you want to find
- `numberOfQuotes` (number, required): The number of quotes to return (minimum: 1, maximum: 10)
- `topic` (string, optional): A specific topic to filter the quotes by

**Returns:** 
- An object containing:
  - `quotes`: Array of quote objects
  - `metadata`: Information about the request processing
    - `cacheHit`: Whether quotes were served from cache
    - `fallbackUsed`: Whether stale cache data was used
    - `retryCount`: Number of retry attempts made
    - `searchQueries`: Array of search queries attempted

**Example Request:**
```json
{
  "person": "Maya Angelou",
  "numberOfQuotes": 5,
  "topic": "courage"
}
```

**Example Response:**
```json
{
  "quotes": [
    {
      "text": "I've learned that people will forget what you said, people will forget what you did, but people will never forget how you made them feel.",
      "author": "Maya Angelou",
      "source": "https://example.com/angelou-quotes"
    },
    {
      "text": "If you don't like something, change it. If you can't change it, change your attitude.",
      "author": "Maya Angelou",
      "source": "https://example.com/angelou-wisdom"
    }
  ],
  "metadata": {
    "cacheHit": false,
    "fallbackUsed": false,
    "retryCount": 0,
    "searchQueries": ["Maya Angelou courage quotes"]
  }
}
```

**Performance Characteristics:**
- Average response time: 0.5-2 seconds (faster with cache hits)
- Cache TTL: 1 hour (configurable)
- Cache hit rate: 60-80% for popular queries
- Pre-warmed cache for common people
- Automatic fallback to stale cache data during outages
- Circuit breaker: Opens after 5 failures, half-open after 30 seconds

## Resources

### Quote Prompt Templates
The server provides multiple prompt templates for different use cases. Each template includes metadata, variables, and usage instructions.

#### List All Templates
**URI:** `quote-prompt://list`

**Returns:** A list of all available quote prompt templates.

**Example Response:**
```json
{
  "templates": [
    {
      "id": "default",
      "name": "Default Quote Prompt",
      "description": "Standard template for requesting quotes"
    },
    {
      "id": "research", 
      "name": "Research Quote Prompt",
      "description": "Template for academic research and citations"
    },
    {
      "id": "creative",
      "name": "Creative Quote Prompt", 
      "description": "Template for creative writing and inspiration"
    }
  ]
}
```

#### Default Template
**URI:** `quote-prompt://default`

**Returns:** Standard template for requesting quotes with basic formatting.

**Example Response:**
```json
{
  "metadata": {
    "version": "1.0.0",
    "category": "general",
    "description": "Standard template for requesting quotes from any person"
  },
  "template": {
    "base": "Please find {numberOfQuotes} quotes from {person}{topicPhrase}.",
    "format": "Format each quote with:\n- The exact quote text\n- Attribution to {person}\n- Source URL if available"
  },
  "variables": {
    "person": {
      "type": "string",
      "required": true,
      "description": "The name of the person whose quotes to find"
    },
    "numberOfQuotes": {
      "type": "number",
      "required": true,
      "min": 1,
      "max": 10,
      "description": "Number of quotes to return"
    },
    "topic": {
      "type": "string",
      "required": false,
      "description": "Optional topic to filter quotes"
    }
  }
}
```

#### Research Template
**URI:** `quote-prompt://research`

**Returns:** Template optimized for academic research with citation requirements.

#### Creative Template
**URI:** `quote-prompt://creative`

**Returns:** Template designed for creative writing and inspirational content.

## Error Handling

### Error Response Format
All errors follow a consistent format with helpful recovery suggestions:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "suggestion": "How to fix the error",
      "documentation": "Link to relevant docs"
    }
  }
}
```

### Common Error Responses

#### Invalid Parameters
```json
{
  "error": {
    "code": "INVALID_PARAMETERS",
    "message": "Invalid request parameters",
    "details": {
      "errors": ["numberOfQuotes must be between 1 and 10"],
      "suggestion": "Please check the parameter constraints and try again"
    }
  }
}
```

#### API Error
```json
{
  "error": {
    "code": "API_ERROR",
    "message": "Failed to fetch quotes from search API",
    "details": {
      "suggestion": "The search service is temporarily unavailable. Please try again later.",
      "fallback": "Consider using getResilientQuotes for automatic failover"
    }
  }
}
```

#### No Results Found
```json
{
  "error": {
    "code": "NO_RESULTS",
    "message": "No quotes found for 'Unknown Person'",
    "details": {
      "searchQuery": "Unknown Person quotes",
      "suggestion": "Try searching for a more well-known person or remove the topic filter"
    }
  }
}
```

#### Rate Limit Exceeded
```json
{
  "error": {
    "code": "RATE_LIMIT",
    "message": "API rate limit exceeded",
    "details": {
      "retryAfter": 3600,
      "suggestion": "Please wait before making more requests or upgrade your API plan"
    }
  }
}
```

## Rate Limiting

### Serper.dev API Limits
- **Free Tier**: 2,500 searches per month
- **Rate Limit**: 100 requests per minute
- **Quota Reset**: Monthly on the 1st

### Server-Level Protection
- **Circuit Breaker**: Prevents cascading failures
  - Opens after 5 consecutive failures
  - Attempts recovery after 30 seconds
- **Retry Logic**: Automatic retry with exponential backoff
  - Maximum 3 retry attempts
  - Backoff: 1s, 2s, 4s
- **Request Timeout**: 30 seconds per request
- **Caching**: Reduces API calls by 60-80%

### Recommendations
1. Use `getResilientQuotes` for better rate limit handling
2. Implement client-side rate limiting for high-volume applications
3. Monitor API usage through Serper.dev dashboard
4. Consider caching frequently requested quotes

## Performance Considerations

### Response Times
| Scenario | getQuotes | getResilientQuotes |
|----------|-----------|-------------------|
| Cache Hit | N/A | 50-200ms |
| API Call | 1-2s | 1-2s |
| With Retries | 3-8s | 3-8s |
| Fallback | N/A | 100-300ms |

### Optimization Tips
1. **Use getResilientQuotes** for frequently requested quotes
2. **Pre-warm cache** for popular figures
3. **Batch requests** when possible
4. **Monitor cache hit rates** to optimize performance

## Configuration

### Required Environment Variables
- `SERPER_API_KEY`: Your Serper.dev API key for searching quotes

### Optional Environment Variables
- `CACHE_TTL`: Cache time-to-live in seconds (default: 3600)
- `MAX_RETRIES`: Maximum retry attempts (default: 3)
- `API_TIMEOUT`: Request timeout in milliseconds (default: 5000)
- `LOG_LEVEL`: Logging verbosity (default: info)