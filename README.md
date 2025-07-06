# MCP Quotes Server

A Model Context Protocol (MCP) server that provides a simple tool for searching quotes from famous and not-so-famous people using the Serper.dev API.

## Features

- **Quote Search**: Search for quotes from any person using web search
- **Topic Filtering**: Optionally filter quotes by specific topics
- **Flexible Results**: Request 1-10 quotes per search
- **Prompt Template**: Resource providing structured templates for quote requests
- **Enhanced Error Messages**: Actionable error messages with clear recovery steps
- **Comprehensive Examples**: Extensive usage examples and integration patterns
- **Robust Error Handling**: Graceful fallbacks and retry mechanisms
- **TypeScript Support**: Full type safety with exported types
- **MCP Protocol**: Full compliance with MCP standards for use with Claude and other AI assistants

## Installation

```bash
npm install -g mcp-quotes-server
```

## Usage

### Running the Server

```bash
# Set your Serper.dev API key
export SERPER_API_KEY="your-serper-api-key"

# Run the server
mcp-quotes-server
```

### Testing with MCP Inspector

```bash
# Test the server using MCP Inspector
npx @modelcontextprotocol/inspector mcp-quotes-server
```

### Using with Claude Desktop

Add the server to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "quotes": {
      "command": "npx",
      "args": ["mcp-quotes-server"],
      "env": {
        "SERPER_API_KEY": "your-serper-api-key"
      }
    }
  }
}
```

### Using HTTP Transport

The server supports both STDIO (default) and HTTP transport modes. To use HTTP transport:

```bash
# Start the server with HTTP transport
export MCP_TRANSPORT=http
export MCP_HTTP_PORT=3000
export MCP_HTTP_HOST=localhost
export MCP_HTTP_PATH=/mcp
export SERPER_API_KEY="your-serper-api-key"

mcp-quotes-server
```

The server will start on `http://localhost:3000/mcp` and accept POST requests following the MCP Streamable HTTP transport specification (2025-03-26).

#### HTTP Transport Configuration

- `MCP_TRANSPORT`: Set to `http` to enable HTTP transport (default: `stdio`)
- `MCP_HTTP_PORT`: Port for the HTTP server (default: `3000`)
- `MCP_HTTP_HOST`: Host for the HTTP server (default: `localhost`)
- `MCP_HTTP_PATH`: Path for the MCP endpoint (default: `/mcp`)

#### Testing HTTP Transport

```bash
# Start server in HTTP mode
MCP_TRANSPORT=http SERPER_API_KEY="your-key" npm run dev

# The server will log the HTTP endpoint URL
# Use MCP clients that support HTTP transport to connect
```

## API

### Tools

#### getQuotes
Search for quotes from a specific person.

**Parameters:**
- `person` (string, required): The name of the person whose quotes you want to find
- `numberOfQuotes` (number, required): The number of quotes to return (1-10)
- `topic` (string, optional): A specific topic to filter the quotes by

**Example:**
```json
{
  "person": "Albert Einstein",
  "numberOfQuotes": 3,
  "topic": "science"
}
```

### Resources

#### promptTemplate
Provides a structured template for generating quote-related prompts.

**URI:** `quotes://prompt-template`

## Documentation

- [Comprehensive Usage Examples](docs/EXAMPLES.md) - Detailed examples and integration patterns
- [API Documentation](docs/API.md) - Complete API reference
- [Testing Guide](TESTING.md) - Testing strategies and examples

## Development

### Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/mcp-quotes-server.git
cd mcp-quotes-server

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env and add your SERPER_API_KEY

# Build the project
npm run build
```

### Scripts

- `npm run build` - Build the TypeScript project
- `npm run dev` - Run in development mode with hot reload
- `npm test` - Run unit tests
- `npm run test:integration` - Run integration tests
- `npm run test:coverage` - Run tests with coverage report
- `npm run typecheck` - Run TypeScript type checking
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

### Testing

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests
npm run test:integration

# Run tests with coverage
npm run test:coverage

# Test the server manually
npm run dev
# In another terminal:
npx @modelcontextprotocol/inspector dist/index.js
```

## Configuration

The server requires the following environment variable:

- `SERPER_API_KEY` (required): Your Serper.dev API key for searching quotes

Optional configuration:
- `NODE_ENV`: Set to 'production' for production deployments
- `LOG_LEVEL`: Set logging level (debug, info, warn, error)
- `MCP_TRANSPORT`: Transport type - 'stdio' (default) or 'http'
- `MCP_HTTP_PORT`: HTTP server port when using HTTP transport (default: 3000)
- `MCP_HTTP_HOST`: HTTP server host when using HTTP transport (default: localhost)
- `MCP_HTTP_PATH`: HTTP endpoint path when using HTTP transport (default: /mcp)

## Architecture

The server is built with:
- TypeScript for type safety
- MCP SDK for protocol implementation
- Axios for HTTP requests to Serper.dev
- Zod for input validation
- Jest for unit testing

## Troubleshooting

### Common Issues

#### SERPER_API_KEY not found
```
Error: Configuration error: Missing or invalid SERPER_API_KEY
```

**Solution:**
```bash
# Set the API key in your environment
export SERPER_API_KEY="your-api-key-here"

# Or add to .env file
echo "SERPER_API_KEY=your-api-key-here" >> .env
```

#### Authentication Failed
```
Error: Authentication failed for serper
```

**Solution:**
1. Verify your API key is correct
2. Check if the key is active at https://serper.dev/dashboard
3. Ensure you haven't exceeded your plan limits

#### Rate Limit Exceeded
```
Error: Rate limit exceeded for serper
```

**Solution:**
1. Wait a few minutes before retrying
2. Reduce the numberOfQuotes parameter
3. Space out your requests over time
4. Consider upgrading your Serper.dev plan

#### No Quotes Found
If the server returns an empty quotes array:
1. Check the person's name spelling
2. Try without a topic filter first
3. Use more common name variations
4. Ensure the person is publicly known

### Debug Mode

Enable debug logging for detailed troubleshooting:

```bash
export LOG_LEVEL=debug
export NODE_ENV=development
npx mcp-quotes-server
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built using the [Model Context Protocol SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- Powered by [Serper.dev](https://serper.dev) for web search capabilities
- Enhanced with comprehensive error handling and user guidance