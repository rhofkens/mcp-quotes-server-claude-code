# MCP Quotes Server

A Model Context Protocol (MCP) server that provides a simple tool for searching quotes from famous and not-so-famous people using the Serper.dev API.

## Features

- **Quote Search**: Search for quotes from any person using web search
- **Topic Filtering**: Optionally filter quotes by specific topics
- **Flexible Results**: Request 1-10 quotes per search
- **Prompt Template**: Resource providing structured templates for quote requests
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
- `npm run typecheck` - Run TypeScript type checking
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

### Testing

```bash
# Run unit tests
npm test

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

## Architecture

The server is built with:
- TypeScript for type safety
- MCP SDK for protocol implementation
- Axios for HTTP requests to Serper.dev
- Zod for input validation
- Jest for unit testing

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