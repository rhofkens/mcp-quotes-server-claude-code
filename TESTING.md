# Testing the MCP Quotes Server

## Prerequisites
- Set your Serper.dev API key: `export SERPER_API_KEY="your-api-key"`
- Build the project: `npm run build`

## Testing with MCP Inspector

1. **Start the MCP Inspector**:
   ```bash
   npx @modelcontextprotocol/inspector dist/index.js
   ```

2. **Test the getQuotes tool**:
   - In the Inspector, navigate to the Tools section
   - Select the `getQuotes` tool
   - Enter parameters:
     ```json
     {
       "person": "Albert Einstein",
       "numberOfQuotes": 3,
       "topic": "science"
     }
     ```
   - Click "Execute"

3. **Test the promptTemplate resource**:
   - Navigate to the Resources section
   - Look for `quotes://prompt-template`
   - Click to view the template

## Manual Testing with Node

```bash
# Start the server
node dist/index.js

# The server will wait for MCP protocol commands on STDIO
# Use Ctrl+C to stop
```

## Expected Results

### getQuotes Tool
- Should return an array of quotes from the specified person
- Each quote should have: text, author, and optional source
- Error messages if API key is missing or invalid

### promptTemplate Resource
- Should return a JSON object with:
  - Template string with placeholders
  - Variable definitions
  - Usage instructions

## Troubleshooting

1. **No API Key Error**: Make sure `SERPER_API_KEY` is set
2. **Build Errors**: Run `npm run typecheck` to check for TypeScript issues
3. **No Quotes Found**: Try a well-known person like "Albert Einstein" or "Mark Twain"
4. **Server Won't Start**: Check logs in `logs/combined.log`