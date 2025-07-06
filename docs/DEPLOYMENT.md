# MCP Quotes Server Deployment Guide

## Table of Contents
- [Prerequisites](#prerequisites)
- [Deployment Options](#deployment-options)
- [Environment Configuration](#environment-configuration)
- [Transport Modes](#transport-modes)
- [Docker Deployment](#docker-deployment)
- [Production Deployment](#production-deployment)
- [Security Considerations](#security-considerations)
- [Monitoring and Logging](#monitoring-and-logging)
- [Scaling Considerations](#scaling-considerations)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements
- Node.js >= 18.0.0
- npm >= 8.0.0
- RAM: Minimum 512MB, recommended 1GB
- Disk Space: 200MB for application and dependencies

### Required API Keys
- **Serper.dev API Key**: Required for quote searches
  - Sign up at https://serper.dev
  - Free tier includes 2,500 queries/month
  - Set as `SERPER_API_KEY` environment variable

## Deployment Options

### 1. Local Development
```bash
# Clone the repository
git clone https://github.com/yourusername/mcp-quotes-server.git
cd mcp-quotes-server

# Install dependencies
npm install

# Build the project
npm run build

# Set environment variables
export SERPER_API_KEY="your-api-key"

# Run the server (STDIO mode)
node dist/index.js
```

### 2. NPM Global Installation
```bash
# Install globally
npm install -g mcp-quotes-server

# Run with environment variable
SERPER_API_KEY="your-api-key" mcp-quotes-server
```

### 3. Direct Execution with npx
```bash
# Run without installation
SERPER_API_KEY="your-api-key" npx mcp-quotes-server
```

## Environment Configuration

### Required Environment Variables
| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `SERPER_API_KEY` | Serper.dev API key for quote searches | Yes | None |

### Optional Environment Variables
| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode (development/production) | development |
| `LOG_LEVEL` | Logging level (debug/info/warn/error) | info |
| `MCP_TRANSPORT` | Transport type (stdio/http) | stdio |
| `MCP_HTTP_PORT` | HTTP server port | 3000 |
| `MCP_HTTP_HOST` | HTTP server host | localhost |
| `MCP_HTTP_PATH` | HTTP endpoint path | /mcp |
| `API_TIMEOUT` | API request timeout (ms) | 5000 |
| `MAX_RETRIES` | Maximum retry attempts | 3 |
| `CACHE_TTL` | Cache time-to-live (seconds) | 3600 |

### Configuration File (.env)
Create a `.env` file in the project root:
```env
# Required
SERPER_API_KEY=your-serper-api-key

# Optional
NODE_ENV=production
LOG_LEVEL=info
MCP_TRANSPORT=http
MCP_HTTP_PORT=3000
MCP_HTTP_HOST=0.0.0.0
MCP_HTTP_PATH=/mcp
```

## Transport Modes

### STDIO Transport (Default)
STDIO transport is used for direct integration with Claude Desktop or other MCP clients.

```bash
# Start in STDIO mode (default)
SERPER_API_KEY="your-api-key" node dist/index.js
```

**Claude Desktop Configuration:**
```json
{
  "mcpServers": {
    "quotes": {
      "command": "node",
      "args": ["/path/to/mcp-quotes-server/dist/index.js"],
      "env": {
        "SERPER_API_KEY": "your-api-key"
      }
    }
  }
}
```

### HTTP Transport
HTTP transport enables remote access and better scalability.

```bash
# Start in HTTP mode
MCP_TRANSPORT=http \
MCP_HTTP_PORT=3000 \
MCP_HTTP_HOST=0.0.0.0 \
SERPER_API_KEY="your-api-key" \
node dist/index.js
```

**Endpoints:**
- **MCP Protocol**: `POST http://localhost:3000/mcp`
- **Health Check**: `GET http://localhost:3000/health`

**Testing HTTP Mode:**
```bash
# Initialize session
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
        "name": "curl-client",
        "version": "1.0.0"
      }
    }
  }'
```

## Docker Deployment

### Dockerfile
```dockerfile
FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm ci --only=production

# Bundle app source
COPY dist ./dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
USER nodejs

# Expose port for HTTP transport
EXPOSE 3000

# Start the server
CMD ["node", "dist/index.js"]
```

### docker-compose.yml
```yaml
version: '3.8'
services:
  mcp-quotes-server:
    build: .
    environment:
      - SERPER_API_KEY=${SERPER_API_KEY}
      - MCP_TRANSPORT=http
      - MCP_HTTP_HOST=0.0.0.0
      - MCP_HTTP_PORT=3000
      - NODE_ENV=production
      - LOG_LEVEL=info
    ports:
      - "3000:3000"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

### Building and Running
```bash
# Build the Docker image
docker build -t mcp-quotes-server .

# Run with Docker
docker run -d \
  --name mcp-quotes \
  -p 3000:3000 \
  -e SERPER_API_KEY="your-api-key" \
  -e MCP_TRANSPORT=http \
  mcp-quotes-server

# Run with docker-compose
docker-compose up -d
```

## Production Deployment

### 1. Process Management with PM2
```bash
# Install PM2
npm install -g pm2

# Create ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'mcp-quotes-server',
    script: './dist/index.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      MCP_TRANSPORT: 'http',
      MCP_HTTP_PORT: 3000,
      MCP_HTTP_HOST: '0.0.0.0',
      SERPER_API_KEY: process.env.SERPER_API_KEY
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
EOF

# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save
pm2 startup
```

### 2. Systemd Service
```ini
# /etc/systemd/system/mcp-quotes-server.service
[Unit]
Description=MCP Quotes Server
After=network.target

[Service]
Type=simple
User=nodejs
WorkingDirectory=/opt/mcp-quotes-server
ExecStart=/usr/bin/node /opt/mcp-quotes-server/dist/index.js
Restart=on-failure
RestartSec=10
Environment="NODE_ENV=production"
Environment="MCP_TRANSPORT=http"
Environment="MCP_HTTP_PORT=3000"
Environment="MCP_HTTP_HOST=0.0.0.0"
EnvironmentFile=/etc/mcp-quotes-server/config.env

[Install]
WantedBy=multi-user.target
```

### 3. Reverse Proxy with Nginx
```nginx
server {
    listen 80;
    server_name quotes.example.com;

    location / {
        return 301 https://$server_name$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name quotes.example.com;

    ssl_certificate /etc/letsencrypt/live/quotes.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/quotes.example.com/privkey.pem;

    location /mcp {
        proxy_pass http://localhost:3000/mcp;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    location /health {
        proxy_pass http://localhost:3000/health;
    }
}
```

## Security Considerations

### 1. API Key Management
- **Never commit API keys** to version control
- Use environment variables or secure key management services
- Rotate API keys regularly
- Use different keys for development and production

### 2. Network Security
- **Bind to localhost** for local deployments
- Use **HTTPS** for production HTTP transport
- Implement **rate limiting** for public endpoints
- Use **firewall rules** to restrict access

### 3. Authentication (HTTP Transport)
- Consider implementing API key authentication for HTTP endpoints
- Use OAuth 2.0 for production deployments
- Implement request signing for additional security

### 4. Input Validation
- The server validates all inputs automatically
- Additional validation can be added for specific deployment needs

### 5. Security Headers (HTTP Transport)
Add security headers in your reverse proxy:
```nginx
add_header X-Content-Type-Options nosniff;
add_header X-Frame-Options DENY;
add_header X-XSS-Protection "1; mode=block";
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

## Monitoring and Logging

### 1. Log Files
Logs are stored in the `logs/` directory:
- `error.log`: Error-level messages only
- `combined.log`: All log messages
- `debug.log`: Debug messages (development only)

### 2. Health Monitoring
```bash
# Check health endpoint
curl http://localhost:3000/health

# Response:
{
  "status": "ok",
  "transport": "http",
  "sessions": 0
}
```

### 3. Metrics to Monitor
- **Response Times**: Target < 2 seconds
- **Error Rates**: Monitor 4xx and 5xx errors
- **API Usage**: Track Serper.dev API calls
- **Cache Hit Rate**: Target > 60%
- **Memory Usage**: Should stay under 500MB

### 4. Monitoring Tools
- **Prometheus + Grafana**: For metrics visualization
- **ELK Stack**: For log aggregation
- **Uptime Robot**: For availability monitoring
- **New Relic / DataDog**: For APM

### 5. Alerting
Set up alerts for:
- Server downtime
- High error rates (> 5%)
- Slow response times (> 5s)
- API quota warnings
- Memory usage > 80%

## Scaling Considerations

### 1. Horizontal Scaling (HTTP Transport)
- Deploy multiple instances behind a load balancer
- Use sticky sessions for WebSocket connections
- Consider using Redis for shared cache

### 2. Caching Strategy
- Local cache handles most repeated queries
- Cache TTL is configurable (default: 1 hour)
- Pre-warming cache for popular quotes

### 3. Rate Limiting
- Implement rate limiting at reverse proxy level
- Consider per-client rate limits
- Monitor Serper.dev API quota usage

### 4. Database Integration (Future)
- Consider adding database for persistent cache
- Store popular quotes locally
- Reduce external API dependency

## Troubleshooting

### Common Issues

**1. Server Won't Start**
- Check Node.js version: `node --version` (must be >= 18)
- Verify build completed: `npm run build`
- Check for port conflicts (HTTP mode)
- Review error logs in `logs/error.log`

**2. API Key Issues**
```bash
# Test API key directly
curl -X POST https://google.serper.dev/search \
  -H "X-API-KEY: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"q": "test"}'
```

**3. HTTP Transport Connection Issues**
- Verify server is running: `ps aux | grep node`
- Check port availability: `netstat -tulpn | grep 3000`
- Test with curl before using MCP client
- Check firewall rules

**4. High Memory Usage**
- Review cache size and TTL settings
- Check for memory leaks with `node --inspect`
- Monitor with: `pm2 monit`

**5. Slow Response Times**
- Check Serper.dev API response times
- Review network latency
- Monitor cache hit rates
- Consider increasing `API_TIMEOUT`

### Debug Mode
```bash
# Enable debug logging
LOG_LEVEL=debug \
NODE_ENV=development \
SERPER_API_KEY="your-api-key" \
node dist/index.js
```

### Support
- GitHub Issues: [Report bugs and request features]
- Documentation: Check `/docs` folder
- Logs: Review `logs/` directory for detailed error information