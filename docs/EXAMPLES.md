# MCP Quotes Server - Usage Examples

This document provides comprehensive examples of using the MCP Quotes Server in various scenarios.

## Table of Contents
- [Basic Usage](#basic-usage)
- [Advanced Features](#advanced-features)
- [Error Handling](#error-handling)
- [Integration Patterns](#integration-patterns)
- [Troubleshooting](#troubleshooting)

## Basic Usage

### Getting Started

First, ensure your server is running with the correct environment variables:

```bash
export SERPER_API_KEY="your-api-key-here"
npx mcp-quotes-server
```

### Simple Quote Request

The most basic usage is requesting quotes from a person:

```json
{
  "tool": "getQuotes",
  "arguments": {
    "person": "Albert Einstein",
    "numberOfQuotes": 3
  }
}
```

**Expected Response:**
```json
{
  "quotes": [
    {
      "text": "Imagination is more important than knowledge.",
      "author": "Albert Einstein",
      "source": "https://example.com/einstein-quotes"
    },
    {
      "text": "Life is like riding a bicycle. To keep your balance, you must keep moving.",
      "author": "Albert Einstein",
      "source": "https://example.com/einstein-bicycle"
    },
    {
      "text": "The important thing is not to stop questioning.",
      "author": "Albert Einstein",
      "source": "https://example.com/einstein-curiosity"
    }
  ]
}
```

### Topic-Specific Quotes

Filter quotes by a specific topic:

```json
{
  "tool": "getQuotes",
  "arguments": {
    "person": "Maya Angelou",
    "numberOfQuotes": 2,
    "topic": "courage"
  }
}
```

### Using the Prompt Template

First, retrieve the prompt template:

```json
{
  "resource": "quotes://prompt-template"
}
```

This returns a structured template:

```json
{
  "template": "Find {numberOfQuotes} quotes from {person} {topic}. Return them in a structured format with proper attribution.",
  "variables": {
    "person": {
      "description": "The person whose quotes you want to retrieve. Can be any famous or notable individual.",
      "required": true,
      "examples": ["Albert Einstein", "Maya Angelou", "Steve Jobs", "Marie Curie"]
    },
    "numberOfQuotes": {
      "description": "The number of quotes to retrieve. Must be between 1 and 10.",
      "required": true,
      "default": 3,
      "minimum": 1,
      "maximum": 10
    },
    "topic": {
      "description": "Optional topic to filter quotes. When provided, quotes will be related to this subject.",
      "required": false,
      "examples": ["success", "innovation", "life", "education", "happiness"]
    }
  },
  "instructions": "To use this template, replace the variables in curly braces with your desired values.",
  "exampleUsage": {
    "request": "Find 3 quotes from Albert Einstein about imagination.",
    "expectedFormat": "1. \"Imagination is more important than knowledge.\" - Albert Einstein\n..."
  }
}
```

## Advanced Features

### Handling Different Person Names

The tool handles various name formats:

```json
// Full names with titles
{
  "person": "Dr. Martin Luther King Jr.",
  "numberOfQuotes": 3
}

// Names with special characters
{
  "person": "Jean-Paul Sartre",
  "numberOfQuotes": 2
}

// Single names
{
  "person": "Plato",
  "numberOfQuotes": 4
}

// Contemporary figures
{
  "person": "Elon Musk",
  "numberOfQuotes": 2,
  "topic": "innovation"
}
```

### Multiple Topic Searches

For broader searches, you can make multiple requests with different topics:

```javascript
const topics = ["success", "failure", "perseverance"];
const allQuotes = [];

for (const topic of topics) {
  const result = await mcpClient.callTool("getQuotes", {
    person: "Winston Churchill",
    numberOfQuotes: 2,
    topic: topic
  });
  allQuotes.push(...result.quotes);
}
```

## Error Handling

### Missing API Key

If the SERPER_API_KEY is not set:

```json
{
  "error": {
    "code": "CONFIG_ERROR",
    "message": "Configuration error: Missing or invalid SERPER_API_KEY. Please set the SERPER_API_KEY environment variable with your API key from https://serper.dev. You can export it in your terminal or add it to a .env file."
  }
}
```

**Solution:**
```bash
# Set the API key before starting the server
export SERPER_API_KEY="your-api-key"
# Or add to .env file
echo "SERPER_API_KEY=your-api-key" >> .env
```

### Invalid Parameters

Request with invalid numberOfQuotes:

```json
{
  "tool": "getQuotes",
  "arguments": {
    "person": "Albert Einstein",
    "numberOfQuotes": 20
  }
}
```

**Error Response:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid value for field 'numberOfQuotes': Value must be between 1 and 10. The numberOfQuotes field must be a number between 1 and 10."
  }
}
```

### Rate Limiting

When you exceed the API rate limits:

```json
{
  "error": {
    "code": "API_RATE_LIMIT",
    "message": "Rate limit exceeded for serper. To avoid this:\n1. Wait a few minutes before retrying\n2. Reduce the number of quotes requested\n3. Space out your requests over time\n4. Consider upgrading your API plan if this happens frequently"
  }
}
```

### Network Issues

When the server cannot reach the API:

```json
{
  "error": {
    "code": "API_TIMEOUT",
    "message": "The request timed out (serper). This may be due to network issues or server load. Please try again in a few moments."
  }
}
```

## Integration Patterns

### With Claude Desktop

Add to your Claude Desktop configuration (`~/.claude/config.json`):

```json
{
  "mcpServers": {
    "quotes": {
      "command": "npx",
      "args": ["mcp-quotes-server"],
      "env": {
        "SERPER_API_KEY": "your-api-key",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

Usage in Claude:
```
"Can you find me 5 inspirational quotes from Nelson Mandela about freedom?"
```

### Programmatic Usage with MCP Client

```typescript
import { McpClient } from '@modelcontextprotocol/sdk';

const client = new McpClient();

// Connect to the server
await client.connect({
  command: 'npx',
  args: ['mcp-quotes-server'],
  env: { SERPER_API_KEY: process.env.SERPER_API_KEY }
});

// Get quotes
const result = await client.callTool('getQuotes', {
  person: 'Steve Jobs',
  numberOfQuotes: 3,
  topic: 'innovation'
});

console.log(result.quotes);
```

### Building a Quote Collection

```typescript
// Function to collect quotes from multiple people on a topic
async function collectQuotesOnTopic(topic: string, people: string[]) {
  const collection = [];
  
  for (const person of people) {
    try {
      const result = await client.callTool('getQuotes', {
        person,
        numberOfQuotes: 2,
        topic
      });
      collection.push({
        person,
        quotes: result.quotes
      });
    } catch (error) {
      console.error(`Failed to get quotes from ${person}:`, error.message);
    }
  }
  
  return collection;
}

// Usage
const wisdomCollection = await collectQuotesOnTopic('wisdom', [
  'Socrates',
  'Confucius',
  'Buddha',
  'Marcus Aurelius'
]);
```

### Error Recovery Pattern

```typescript
async function getQuotesWithRetry(params, maxRetries = 3) {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await client.callTool('getQuotes', params);
    } catch (error) {
      lastError = error;
      
      // Handle specific error types
      if (error.code === 'API_RATE_LIMIT') {
        // Wait longer for rate limits
        await new Promise(resolve => setTimeout(resolve, 60000));
      } else if (error.code === 'API_TIMEOUT') {
        // Shorter wait for timeouts
        await new Promise(resolve => setTimeout(resolve, 5000));
      } else if (error.code === 'VALIDATION_ERROR') {
        // Don't retry validation errors
        throw error;
      }
    }
  }
  
  throw lastError;
}
```

## Troubleshooting

### Common Issues and Solutions

#### 1. Server Won't Start

**Issue:** Server fails to start with configuration error

**Solution:**
```bash
# Check if API key is set
echo $SERPER_API_KEY

# If empty, set it
export SERPER_API_KEY="your-api-key"

# Or use a .env file
echo "SERPER_API_KEY=your-api-key" > .env
```

#### 2. No Quotes Found

**Issue:** Server returns empty quotes array

**Possible Causes:**
- Person name is misspelled
- Person is not well-known enough
- Topic is too specific

**Solutions:**
```json
// Try without topic first
{
  "person": "Albert Einstein",
  "numberOfQuotes": 3
}

// Try different name variations
{
  "person": "Einstein",
  "numberOfQuotes": 3
}

// Try broader topics
{
  "person": "Albert Einstein",
  "numberOfQuotes": 3,
  "topic": "science"  // instead of "quantum mechanics"
}
```

#### 3. Authentication Failures

**Issue:** Consistent authentication errors

**Debugging Steps:**
```bash
# Test your API key directly
curl -X POST https://google.serper.dev/search \
  -H 'X-API-KEY: your-api-key' \
  -H 'Content-Type: application/json' \
  -d '{"q": "test"}'

# Check API key status at https://serper.dev/dashboard
```

#### 4. Slow Response Times

**Issue:** Quotes take too long to retrieve

**Solutions:**
- Reduce numberOfQuotes
- Remove topic filter for faster searches
- Check network connectivity
- Consider caching frequently requested quotes

### Debug Mode

Enable debug logging for troubleshooting:

```bash
export LOG_LEVEL=debug
export NODE_ENV=development
npx mcp-quotes-server
```

This will show detailed logs including:
- API request/response details
- Search query construction
- Quote extraction process
- Error stack traces

## Best Practices

1. **Start Simple**: Begin with basic requests before adding topics
2. **Handle Errors Gracefully**: Always wrap tool calls in try-catch blocks
3. **Respect Rate Limits**: Space out requests when making multiple calls
4. **Cache When Possible**: Store frequently requested quotes locally
5. **Validate Input**: Check parameters before sending to avoid validation errors
6. **Use the Template**: Reference the prompt template for correct formatting
7. **Monitor Usage**: Keep track of API calls to stay within limits

## Example Applications

### Daily Quote Widget
```typescript
async function getDailyQuote() {
  const people = [
    'Marcus Aurelius', 'Lao Tzu', 'Rumi', 
    'Maya Angelou', 'Nelson Mandela'
  ];
  const person = people[Math.floor(Math.random() * people.length)];
  
  const result = await client.callTool('getQuotes', {
    person,
    numberOfQuotes: 1,
    topic: 'wisdom'
  });
  
  return result.quotes[0];
}
```

### Quote Search API
```typescript
app.get('/api/quotes', async (req, res) => {
  try {
    const { person, count = 5, topic } = req.query;
    
    if (!person) {
      return res.status(400).json({ error: 'Person parameter required' });
    }
    
    const result = await client.callTool('getQuotes', {
      person,
      numberOfQuotes: Math.min(parseInt(count), 10),
      topic
    });
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      error: error.message,
      guidance: error.getUserMessage?.() || 'Please try again'
    });
  }
});
```

### Educational Quote Collector
```typescript
async function collectEducationalQuotes() {
  const educators = [
    'John Dewey', 'Maria Montessori', 'Paulo Freire',
    'bell hooks', 'Howard Gardner'
  ];
  
  const quotes = await Promise.allSettled(
    educators.map(person =>
      client.callTool('getQuotes', {
        person,
        numberOfQuotes: 3,
        topic: 'education'
      })
    )
  );
  
  return quotes
    .filter(result => result.status === 'fulfilled')
    .map(result => result.value.quotes)
    .flat();
}
```