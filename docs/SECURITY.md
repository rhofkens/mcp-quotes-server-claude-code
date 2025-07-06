# Security Policy

## Supported Versions

We release patches for security vulnerabilities for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of the MCP Quotes Server seriously. If you believe you have found a security vulnerability in any version of our code, please report it to us as described below.

### How to Report a Security Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via email to the maintainer. You can find contact information in the package.json file.

Please include the following information (as much as you can provide) to help us better understand the nature and scope of the possible issue:

- Type of issue (e.g., buffer overflow, SQL injection, cross-site scripting, etc.)
- Full paths of source file(s) related to the manifestation of the issue
- The location of the affected source code (tag/branch/commit or direct URL)
- Any special configuration required to reproduce the issue
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit the issue

This information will help us triage your report more quickly.

### What to Expect

If the issue is confirmed as a vulnerability, we will:

1. Acknowledge receipt of your vulnerability report within 72 hours
2. Provide a more detailed response within 7 days indicating the next steps in handling your report
3. Keep you informed about the progress towards a fix and full announcement
4. Give credit to you for the discovery when announcing the vulnerability (unless you prefer to remain anonymous)

## Security Best Practices for Users

When using the MCP Quotes Server, please follow these security best practices:

### API Key Management

1. **Never commit API keys to version control**
   - Use environment variables or `.env` files
   - Add `.env` to your `.gitignore`
   
2. **Rotate API keys regularly**
   - Replace API keys periodically
   - Immediately replace any keys that may have been exposed

3. **Use minimal permissions**
   - Only grant the permissions necessary for the server to function
   - Review API key permissions regularly

### Environment Security

1. **Secure your environment files**
   ```bash
   chmod 600 .env  # Restrict file permissions
   ```

2. **Use strong API keys**
   - Generate keys using secure random methods
   - Avoid predictable or weak keys

3. **Monitor API usage**
   - Regularly check your API provider's dashboard for unusual activity
   - Set up alerts for unexpected usage patterns

### Network Security

1. **Use HTTPS for all external communications**
   - The server uses HTTPS for all API calls by default
   - Ensure your deployment environment supports secure connections

2. **Implement rate limiting**
   - Configure appropriate rate limits in your environment
   - Monitor for potential abuse

### Deployment Security

1. **Keep dependencies updated**
   ```bash
   npm audit
   npm update
   ```

2. **Use minimal Docker images if containerizing**
   - Start from official Node.js Alpine images
   - Don't include development dependencies in production

3. **Principle of least privilege**
   - Run the server with minimal system permissions
   - Use dedicated service accounts

## Security Features

The MCP Quotes Server includes several security features:

1. **Input Validation**
   - All inputs are validated using Zod schemas
   - Strict type checking prevents injection attacks

2. **Error Handling**
   - Errors don't leak sensitive information
   - Stack traces only shown in development mode

3. **Sanitized Logging**
   - Sensitive data is redacted from logs
   - API keys and tokens are never logged

4. **Secure Configuration**
   - Environment variables for sensitive data
   - Configuration validation on startup

5. **API Key Protection**
   - Keys are never exposed in responses
   - Keys are validated before use

## Known Security Considerations

1. **Third-party API Dependencies**
   - The server relies on external APIs (e.g., Serper.dev)
   - Security depends partially on these services

2. **Rate Limiting**
   - Currently relies on API provider rate limits
   - Consider implementing application-level rate limiting for production use

## Compliance

This server is designed with security best practices in mind but has not been formally audited for specific compliance standards (SOC2, HIPAA, etc.). If you require specific compliance guarantees, please conduct your own security assessment.

## Updates and Patches

Security updates will be released as:
- **Patch versions** (x.x.PATCH) for non-breaking security fixes
- **Minor versions** (x.MINOR.x) if security fixes require small API changes
- **Major versions** (MAJOR.x.x) if security fixes require breaking changes

Subscribe to our GitHub releases to be notified of security updates.