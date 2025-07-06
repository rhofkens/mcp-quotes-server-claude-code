# Testing the MCP Quotes Server

## Table of Contents
- [Prerequisites](#prerequisites)
- [Unit Testing](#unit-testing)
- [MCP Inspector Testing](#mcp-inspector-testing)
- [HTTP Transport Testing](#http-transport-testing)
- [Resilience Testing](#resilience-testing)
- [Performance Testing](#performance-testing)
- [Test Data](#test-data)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Setup
1. **Install Dependencies**
   ```bash
   npm install
   npm run build
   ```

2. **Set Environment Variables**
   ```bash
   export SERPER_API_KEY="your-api-key"
   
   # Optional for HTTP testing
   export MCP_TRANSPORT=http
   export MCP_HTTP_PORT=3000
   ```

3. **Verify Build**
   ```bash
   npm run typecheck
   npm test
   ```

## Unit Testing

### Running Unit Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test -- tests/unit/tools/getQuotes.test.ts

# Run with coverage (informational only)
npm test -- --coverage
```

### Test Results
All 197 unit tests should pass:
- Tools: getQuotes, getResilientQuotes
- Services: SerperClient, ResilientSerperClient
- Utils: validation, errors, config, logger
- Resources: promptTemplate

## MCP Inspector Testing

### 1. Basic Setup
```bash
# Start the server with MCP Inspector
npx @modelcontextprotocol/inspector dist/index.js
```

This will open a browser interface for testing.

### 2. Testing getQuotes Tool

#### Test Case 1: Basic Quote Search
1. Navigate to **Tools** section
2. Select `getQuotes`
3. Enter parameters:
   ```json
   {
     "person": "Albert Einstein",
     "numberOfQuotes": 3
   }
   ```
4. Click **Execute**
5. **Expected**: 3 quotes from Einstein with text, author, and source

#### Test Case 2: Topic-Filtered Search
1. Enter parameters:
   ```json
   {
     "person": "Maya Angelou",
     "numberOfQuotes": 2,
     "topic": "courage"
   }
   ```
2. **Expected**: 2 quotes about courage from Maya Angelou

#### Test Case 3: Error Handling
1. Test missing API key:
   - Unset SERPER_API_KEY and restart
   - **Expected**: Clear error about missing API key
   
2. Test invalid parameters:
   ```json
   {
     "person": "Einstein",
     "numberOfQuotes": 15
   }
   ```
   - **Expected**: Error that numberOfQuotes must be 1-10

### 3. Testing getResilientQuotes Tool

#### Test Case 1: Cache Behavior
1. First request:
   ```json
   {
     "person": "Steve Jobs",
     "numberOfQuotes": 5
   }
   ```
   - **Expected**: `cacheHit: false` in metadata

2. Immediate second request (same parameters):
   - **Expected**: `cacheHit: true`, faster response

#### Test Case 2: Resilience Features
1. Test with common person (should be pre-warmed):
   ```json
   {
     "person": "Albert Einstein",
     "numberOfQuotes": 3
   }
   ```
   - **Expected**: Very fast response, possibly from pre-warmed cache

### 4. Testing Resources

#### Test Case 1: List All Templates
1. Navigate to **Resources** section
2. Access URI: `quote-prompt://list`
3. **Expected**: List of 3 templates (default, research, creative)

#### Test Case 2: Access Specific Template
1. Access URI: `quote-prompt://default`
2. **Expected**: Complete template with metadata, template text, and variables

## HTTP Transport Testing

### 1. Start Server in HTTP Mode
```bash
MCP_TRANSPORT=http \
MCP_HTTP_PORT=3000 \
SERPER_API_KEY="your-api-key" \
node dist/index.js
```

Server should log: `MCP HTTP Server listening at http://localhost:3000/mcp`

### 2. Test with curl

#### Initialize Session
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {
        "name": "curl-test",
        "version": "1.0.0"
      }
    }
  }' -i
```

**Expected**: 
- Status 200
- Session ID in `Mcp-Session-Id` header
- Server info in response

#### List Tools (use session ID from above)
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Mcp-Session-Id: YOUR_SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list",
    "params": {}
  }'
```

**Expected**: List of 2 tools (getQuotes, getResilientQuotes)

#### Call Tool
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Mcp-Session-Id: YOUR_SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "getQuotes",
      "arguments": {
        "person": "Mark Twain",
        "numberOfQuotes": 2
      }
    }
  }'
```

**Expected**: 2 quotes from Mark Twain

### 3. Test Health Endpoint
```bash
curl http://localhost:3000/health
```

**Expected**:
```json
{
  "status": "ok",
  "transport": "http",
  "sessions": 1
}
```

## Resilience Testing

### 1. API Failure Simulation

#### Test Circuit Breaker
1. Temporarily set invalid API key:
   ```bash
   SERPER_API_KEY="invalid" node dist/index.js
   ```

2. Call getResilientQuotes multiple times (6+ requests)
3. **Expected**: 
   - First 5 requests: API errors
   - 6th request: Circuit breaker open error
   - Fallback to cached data if available

### 2. Rate Limit Testing

#### Simulate Rate Limit
1. Make rapid successive calls (10+ in quick succession)
2. **Expected**:
   - Some requests succeed
   - Later requests may show rate limit errors
   - getResilientQuotes should handle gracefully

### 3. Timeout Testing
1. Test with person unlikely to have quotes:
   ```json
   {
     "person": "Random Unknown Person 12345",
     "numberOfQuotes": 10
   }
   ```
2. **Expected**: 
   - Retry attempts with broader searches
   - Eventually returns empty array or partial results

## Performance Testing

### 1. Response Time Validation

#### Cold Start
1. Restart server
2. First request timing:
   ```bash
   time curl -X POST http://localhost:3000/mcp \
     -H "Content-Type: application/json" \
     -H "Mcp-Session-Id: SESSION_ID" \
     -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"getQuotes","arguments":{"person":"Einstein","numberOfQuotes":3}}}'
   ```
3. **Expected**: < 2 seconds

#### Cached Response (getResilientQuotes)
1. Make same request twice
2. **Expected**: Second request < 200ms

### 2. Concurrent Request Handling
```bash
# Run 10 concurrent requests
for i in {1..10}; do
  curl -X POST http://localhost:3000/mcp \
    -H "Content-Type: application/json" \
    -H "Mcp-Session-Id: SESSION_ID" \
    -d '{"jsonrpc":"2.0","id":'$i',"method":"tools/call","params":{"name":"getResilientQuotes","arguments":{"person":"Einstein","numberOfQuotes":1}}}' &
done
wait
```

**Expected**: All requests complete successfully

### 3. Memory Usage Monitoring
```bash
# Start server and note PID
MCP_TRANSPORT=http node dist/index.js &
PID=$!

# Monitor memory
while true; do
  ps -p $PID -o pid,vsz,rss,comm
  sleep 5
done
```

**Expected**: Memory stays under 500MB during normal operation

## Test Data

### Well-Known People (Good for Testing)
- Albert Einstein
- Maya Angelou
- Mark Twain
- Steve Jobs
- Marie Curie
- Martin Luther King Jr.
- Winston Churchill
- Mahatma Gandhi

### Edge Cases to Test
1. **Single name**: "Plato", "Aristotle", "Socrates"
2. **With titles**: "Dr. Martin Luther King Jr."
3. **Non-English names**: "Confucius", "Rumi"
4. **Modern figures**: "Elon Musk", "Bill Gates"
5. **Fictional characters**: Should return no results

### Topics for Testing
- science
- life
- success
- courage
- love
- education
- technology
- wisdom

## Troubleshooting

### Common Issues and Solutions

1. **"No API Key" Error**
   ```bash
   # Check if set
   echo $SERPER_API_KEY
   
   # Set correctly
   export SERPER_API_KEY="your-actual-key"
   ```

2. **Server Won't Start**
   ```bash
   # Check Node version
   node --version  # Must be >= 18
   
   # Rebuild
   npm run clean
   npm install
   npm run build
   ```

3. **HTTP Transport Not Working**
   ```bash
   # Check port availability
   lsof -i :3000
   
   # Try different port
   MCP_HTTP_PORT=8080 node dist/index.js
   ```

4. **No Quotes Found**
   - Try without topic filter
   - Use well-known person from test data
   - Check API key validity at https://serper.dev

5. **Slow Performance**
   ```bash
   # Enable debug logging
   LOG_LEVEL=debug node dist/index.js
   
   # Check logs
   tail -f logs/combined.log
   ```

### Debug Mode
For detailed troubleshooting:
```bash
NODE_ENV=development \
LOG_LEVEL=debug \
MCP_TRANSPORT=http \
SERPER_API_KEY="your-api-key" \
node dist/index.js
```

Check debug logs in `logs/debug.log`