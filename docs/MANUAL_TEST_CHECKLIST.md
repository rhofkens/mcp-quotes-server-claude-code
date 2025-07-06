# Manual Test Validation Checklist

Use this checklist to validate the MCP Quotes Server before release or deployment. Each section must pass completely before proceeding.

**Test Date:** _______________  
**Tester:** _______________  
**Version:** _______________

## Pre-Test Setup ✓

- [ ] Node.js version >= 18.0.0 confirmed (`node --version`)
- [ ] Fresh build completed (`npm run build`)
- [ ] All unit tests pass (`npm test`)
- [ ] SERPER_API_KEY is set and valid
- [ ] Logs directory exists and is writable

## 1. Basic Functionality Tests ✓

### 1.1 getQuotes Tool - STDIO Mode
- [ ] Start server: `node dist/index.js`
- [ ] Launch MCP Inspector: `npx @modelcontextprotocol/inspector dist/index.js`
- [ ] Navigate to Tools section
- [ ] Execute getQuotes with:
  ```json
  {
    "person": "Albert Einstein",
    "numberOfQuotes": 3
  }
  ```
- [ ] ✅ Returns exactly 3 quotes
- [ ] ✅ Each quote has text, author, and source
- [ ] ✅ Response time < 2 seconds

### 1.2 getQuotes with Topic Filter
- [ ] Execute getQuotes with:
  ```json
  {
    "person": "Maya Angelou",
    "numberOfQuotes": 2,
    "topic": "courage"
  }
  ```
- [ ] ✅ Returns 2 quotes related to courage
- [ ] ✅ Quotes are from Maya Angelou

### 1.3 getResilientQuotes Tool
- [ ] Execute getResilientQuotes with:
  ```json
  {
    "person": "Steve Jobs",
    "numberOfQuotes": 5
  }
  ```
- [ ] ✅ Returns quotes with metadata
- [ ] ✅ Metadata includes cacheHit status
- [ ] ✅ First call: cacheHit = false
- [ ] Execute same request again immediately
- [ ] ✅ Second call: cacheHit = true
- [ ] ✅ Second response faster than first

### 1.4 Resource Access
- [ ] Navigate to Resources section
- [ ] Access `quote-prompt://list`
- [ ] ✅ Returns list of 3 templates
- [ ] Access `quote-prompt://default`
- [ ] ✅ Returns complete template with metadata

## 2. Error Handling Tests ✓

### 2.1 Invalid Parameters
- [ ] Test numberOfQuotes > 10:
  ```json
  {
    "person": "Einstein",
    "numberOfQuotes": 15
  }
  ```
- [ ] ✅ Returns clear error message
- [ ] ✅ Error mentions 1-10 constraint

### 2.2 Missing Required Parameters
- [ ] Test without person parameter:
  ```json
  {
    "numberOfQuotes": 5
  }
  ```
- [ ] ✅ Returns error about missing person

### 2.3 Unknown Person
- [ ] Test with fictional person:
  ```json
  {
    "person": "Fictional Person XYZ123",
    "numberOfQuotes": 3
  }
  ```
- [ ] ✅ Returns empty array or appropriate message
- [ ] ✅ No server crash

## 3. HTTP Transport Tests ✓

### 3.1 Server Startup
- [ ] Stop any running server
- [ ] Start with HTTP transport:
  ```bash
  MCP_TRANSPORT=http node dist/index.js
  ```
- [ ] ✅ Logs show: "MCP HTTP Server listening at http://localhost:3000/mcp"
- [ ] ✅ No duplicate startup messages

### 3.2 Health Check
- [ ] Execute: `curl http://localhost:3000/health`
- [ ] ✅ Returns JSON with status "ok"
- [ ] ✅ Shows transport as "http"

### 3.3 Session Management
- [ ] Initialize session:
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
        "clientInfo": {"name": "test", "version": "1.0"}
      }
    }' -i
  ```
- [ ] ✅ Returns 200 status
- [ ] ✅ Contains Mcp-Session-Id header
- [ ] ✅ Response includes serverInfo

### 3.4 Tool Execution via HTTP
- [ ] Use session ID from above
- [ ] List tools:
  ```bash
  curl -X POST http://localhost:3000/mcp \
    -H "Content-Type: application/json" \
    -H "Mcp-Session-Id: SESSION_ID" \
    -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'
  ```
- [ ] ✅ Returns 2 tools (getQuotes, getResilientQuotes)

## 4. Resilience Tests ✓

### 4.1 Invalid API Key Handling
- [ ] Restart server with invalid key:
  ```bash
  SERPER_API_KEY="invalid" node dist/index.js
  ```
- [ ] Test getResilientQuotes
- [ ] ✅ Returns error but doesn't crash
- [ ] ✅ Error message is user-friendly

### 4.2 Pre-warmed Cache
- [ ] Restart with valid API key
- [ ] Immediately test getResilientQuotes for "Albert Einstein"
- [ ] ✅ Response time < 500ms (from pre-warmed cache)

## 5. Performance Validation ✓

### 5.1 Response Times
- [ ] Cold start getQuotes: ✅ < 2 seconds
- [ ] Cached getResilientQuotes: ✅ < 200ms
- [ ] Resource access: ✅ < 100ms

### 5.2 Concurrent Requests
- [ ] Send 5 simultaneous requests
- [ ] ✅ All complete successfully
- [ ] ✅ No errors or timeouts

### 5.3 Memory Usage
- [ ] Monitor server for 5 minutes of use
- [ ] ✅ Memory stays under 300MB
- [ ] ✅ No memory leaks observed

## 6. Integration Tests ✓

### 6.1 MCP Inspector Compatibility
- [ ] All tools visible in Inspector
- [ ] All resources accessible
- [ ] ✅ No console errors in Inspector

### 6.2 Claude Desktop Integration (if available)
- [ ] Configure in Claude Desktop
- [ ] ✅ Server starts without errors
- [ ] ✅ Tools callable from Claude

## 7. Security & Configuration ✓

### 7.1 API Key Security
- [ ] API key not logged in console
- [ ] ✅ API key not in error messages
- [ ] ✅ Logs don't contain sensitive data

### 7.2 Environment Variables
- [ ] Test with minimal config (only SERPER_API_KEY)
- [ ] ✅ Server uses sensible defaults
- [ ] Test with all optional variables set
- [ ] ✅ All configurations respected

## 8. Documentation Validation ✓

### 8.1 README Accuracy
- [ ] Installation instructions work
- [ ] ✅ All examples execute correctly
- [ ] ✅ Troubleshooting steps are accurate

### 8.2 API Documentation
- [ ] All endpoints documented
- [ ] ✅ Examples match actual responses
- [ ] ✅ Error codes are accurate

## Final Validation

### Summary
- [ ] Total Tests: _____
- [ ] Passed: _____
- [ ] Failed: _____

### Critical Issues
List any issues that must be fixed before release:
1. _________________________________
2. _________________________________
3. _________________________________

### Non-Critical Issues
List any minor issues for future improvement:
1. _________________________________
2. _________________________________
3. _________________________________

### Sign-off
- [ ] All critical tests passed
- [ ] No blocking issues identified
- [ ] Ready for release/deployment

**Approved by:** _______________ **Date:** _______________

## Quick Test Commands Reference

```bash
# Unit tests
npm test

# Start STDIO mode
node dist/index.js

# Start HTTP mode
MCP_TRANSPORT=http node dist/index.js

# MCP Inspector
npx @modelcontextprotocol/inspector dist/index.js

# Health check
curl http://localhost:3000/health

# Quick quote test
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Mcp-Session-Id: SESSION_ID" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"getQuotes","arguments":{"person":"Einstein","numberOfQuotes":1}}}'
```