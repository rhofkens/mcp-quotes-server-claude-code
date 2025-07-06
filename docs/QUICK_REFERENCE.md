# MCP Quotes Server Quick Reference

## Installation & Setup
```bash
# Install globally
npm install -g mcp-quotes-server

# Set API key
export SERPER_API_KEY="your-api-key"

# Run server
mcp-quotes-server
```

## Tools

### getQuotes
```json
{
  "person": "Albert Einstein",
  "numberOfQuotes": 3,
  "topic": "science"  // optional
}
```

### getResilientQuotes
```json
{
  "person": "Maya Angelou",
  "numberOfQuotes": 5,
  "topic": "courage"  // optional
}
```
Returns quotes with caching, retry logic, and fallback mechanisms.

## Resources

- `quote-prompt://default` - Standard template
- `quote-prompt://research` - Academic template
- `quote-prompt://creative` - Creative writing template
- `quote-prompt://list` - List all templates

## Transport Modes

### STDIO (Default)
```bash
node dist/index.js
```

### HTTP Transport
```bash
MCP_TRANSPORT=http node dist/index.js
# Server at http://localhost:3000/mcp
# Health check: http://localhost:3000/health
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SERPER_API_KEY` | Yes | - | Serper.dev API key |
| `MCP_TRANSPORT` | No | stdio | Transport type (stdio/http) |
| `MCP_HTTP_PORT` | No | 3000 | HTTP server port |
| `LOG_LEVEL` | No | info | Log level (debug/info/warn/error) |

## Testing

```bash
# With MCP Inspector
npx @modelcontextprotocol/inspector dist/index.js

# HTTP mode test
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Mcp-Session-Id: SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "getQuotes",
      "arguments": {
        "person": "Einstein",
        "numberOfQuotes": 2
      }
    }
  }'
```

## Claude Desktop Configuration

```json
{
  "mcpServers": {
    "quotes": {
      "command": "npx",
      "args": ["mcp-quotes-server"],
      "env": {
        "SERPER_API_KEY": "your-api-key"
      }
    }
  }
}
```

## Common Issues

**API Key Error:**
```bash
export SERPER_API_KEY="your-api-key"
```

**Port Already in Use (HTTP):**
```bash
MCP_HTTP_PORT=3001 node dist/index.js
```

**No Quotes Found:**
- Check person name spelling
- Try without topic filter
- Use common name variations

## Performance Tips

- getResilientQuotes caches results for 1 hour
- Pre-warmed cache for popular people
- Circuit breaker prevents API overload
- Request deduplication reduces API calls

## Key Features

✅ **Two search tools** - Standard and resilient versions  
✅ **Caching** - 1-hour TTL with stale-while-revalidate  
✅ **Circuit breaker** - Prevents cascading failures  
✅ **Retry logic** - Exponential backoff up to 3 attempts  
✅ **Fallback** - Returns cached data when API fails  
✅ **Transport modes** - STDIO and HTTP support  
✅ **Type safety** - Full TypeScript implementation  
✅ **Error handling** - User-friendly error messages  

## Scripts

```bash
npm run build        # Build project
npm run dev         # Development mode
npm test           # Run tests
npm run typecheck  # Type checking
npm run lint       # Linting
```

## Documentation

- [README](../README.md) - Complete documentation
- [API Docs](API.md) - Detailed API reference
- [Deployment](DEPLOYMENT.md) - Production setup
- [Testing](../TESTING.md) - Testing guide
- [Performance](PERFORMANCE.md) - Benchmarks