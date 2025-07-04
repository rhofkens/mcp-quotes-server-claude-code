# MCP Quotes Server API Documentation

## Overview

The MCP Quotes Server provides a simple tool for searching quotes from famous and not-so-famous people using the Serper.dev API.

## Tools

### getQuotes
Search for quotes from a specific person using the Serper.dev search API.

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

## Resources

### promptTemplate
Provides a structured template for generating quote-related prompts.

**URI:** `quotes://prompt-template`

**Returns:** A prompt template that can be used to format quote requests consistently.

**Example Response:**
```json
{
  "template": "Find {numberOfQuotes} quotes from {person} about {topic}. Format each quote with the text, attribution, and source.",
  "variables": [
    {
      "name": "person",
      "description": "The name of the person whose quotes to find",
      "required": true
    },
    {
      "name": "numberOfQuotes",
      "description": "How many quotes to return",
      "required": true
    },
    {
      "name": "topic",
      "description": "Optional topic to filter quotes",
      "required": false
    }
  ]
}
```

## Error Handling

### Common Error Codes
- `INVALID_PARAMETERS`: Missing or invalid request parameters
- `API_ERROR`: Serper.dev API error or unavailable
- `NO_RESULTS`: No quotes found for the given search criteria
- `RATE_LIMIT`: API rate limit exceeded

## Configuration

The server requires the following environment variable:
- `SERPER_API_KEY`: Your Serper.dev API key for searching quotes