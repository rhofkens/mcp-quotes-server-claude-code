# Performance Validation Guide

This guide provides benchmarks, metrics, and procedures for validating the performance of the MCP Quotes Server.

## Performance Targets

### Response Time Benchmarks
| Operation | Target | Maximum | Notes |
|-----------|--------|---------|-------|
| getQuotes (cold) | < 1.5s | 2s | First API call |
| getQuotes (warm) | < 1s | 1.5s | Subsequent calls |
| getResilientQuotes (cache hit) | < 100ms | 200ms | From cache |
| getResilientQuotes (cache miss) | < 1.5s | 2s | API call |
| Resource access | < 50ms | 100ms | Local resources |
| HTTP health check | < 10ms | 50ms | Simple endpoint |

### Throughput Targets
- **Concurrent requests**: Handle 10 simultaneous requests
- **Requests per minute**: 60+ for cached operations
- **API rate limit**: 100 requests/minute (Serper.dev limit)

### Resource Usage Targets
- **Memory**: < 300MB typical, < 500MB peak
- **CPU**: < 50% on single core during normal operation
- **Startup time**: < 2 seconds

## Performance Testing Procedures

### 1. Response Time Testing

#### Basic Response Time Test
```bash
# Using time command
time curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Mcp-Session-Id: SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "getQuotes",
      "arguments": {
        "person": "Albert Einstein",
        "numberOfQuotes": 3
      }
    }
  }'
```

#### Automated Response Time Script
```bash
#!/bin/bash
# save as perf-test.sh

ITERATIONS=10
TOOL="getResilientQuotes"
PERSON="Steve Jobs"

echo "Testing $TOOL performance ($ITERATIONS iterations)..."

for i in $(seq 1 $ITERATIONS); do
  START=$(date +%s.%N)
  
  curl -s -X POST http://localhost:3000/mcp \
    -H "Content-Type: application/json" \
    -H "Mcp-Session-Id: $SESSION_ID" \
    -d "{
      \"jsonrpc\": \"2.0\",
      \"id\": $i,
      \"method\": \"tools/call\",
      \"params\": {
        \"name\": \"$TOOL\",
        \"arguments\": {
          \"person\": \"$PERSON\",
          \"numberOfQuotes\": 3
        }
      }
    }" > /dev/null
  
  END=$(date +%s.%N)
  DIFF=$(echo "$END - $START" | bc)
  echo "Request $i: ${DIFF}s"
done
```

### 2. Cache Performance Testing

#### Cache Hit Rate Monitoring
```javascript
// Test script for cache effectiveness
const testCachePerformance = async () => {
  const people = [
    "Albert Einstein",
    "Maya Angelou", 
    "Steve Jobs",
    "Marie Curie",
    "Mark Twain"
  ];
  
  // First pass - populate cache
  console.log("Populating cache...");
  for (const person of people) {
    await callTool("getResilientQuotes", { person, numberOfQuotes: 3 });
  }
  
  // Second pass - measure cache hits
  console.log("\nMeasuring cache performance...");
  let cacheHits = 0;
  
  for (const person of people) {
    const start = Date.now();
    const result = await callTool("getResilientQuotes", { person, numberOfQuotes: 3 });
    const duration = Date.now() - start;
    
    if (result.metadata.cacheHit) {
      cacheHits++;
      console.log(`✅ Cache hit for ${person}: ${duration}ms`);
    } else {
      console.log(`❌ Cache miss for ${person}: ${duration}ms`);
    }
  }
  
  console.log(`\nCache hit rate: ${(cacheHits/people.length * 100).toFixed(1)}%`);
};
```

### 3. Load Testing

#### Concurrent Request Test
```bash
#!/bin/bash
# Concurrent request testing

CONCURRENT=10
echo "Sending $CONCURRENT concurrent requests..."

# Create a function for single request
send_request() {
  local id=$1
  local start=$(date +%s.%N)
  
  curl -s -X POST http://localhost:3000/mcp \
    -H "Content-Type: application/json" \
    -H "Mcp-Session-Id: $SESSION_ID" \
    -d "{
      \"jsonrpc\": \"2.0\",
      \"id\": $id,
      \"method\": \"tools/call\",
      \"params\": {
        \"name\": \"getResilientQuotes\",
        \"arguments\": {
          \"person\": \"Person $id\",
          \"numberOfQuotes\": 2
        }
      }
    }" > response_$id.json
  
  local end=$(date +%s.%N)
  local diff=$(echo "$end - $start" | bc)
  echo "Request $id completed in ${diff}s"
}

# Send concurrent requests
for i in $(seq 1 $CONCURRENT); do
  send_request $i &
done

# Wait for all to complete
wait

echo "All requests completed"
```

#### Sustained Load Test
```bash
# Test sustained load over time
DURATION=60  # seconds
REQUESTS_PER_SECOND=2

echo "Running sustained load test for $DURATION seconds..."

END_TIME=$(($(date +%s) + DURATION))

while [ $(date +%s) -lt $END_TIME ]; do
  curl -s -X POST http://localhost:3000/mcp \
    -H "Content-Type: application/json" \
    -H "Mcp-Session-Id: $SESSION_ID" \
    -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"getResilientQuotes","arguments":{"person":"Einstein","numberOfQuotes":1}}}' &
  
  sleep $(echo "scale=2; 1/$REQUESTS_PER_SECOND" | bc)
done

wait
echo "Load test completed"
```

### 4. Memory Usage Monitoring

#### Basic Memory Monitoring
```bash
#!/bin/bash
# Monitor memory usage over time

PID=$(pgrep -f "node dist/index.js")
DURATION=300  # 5 minutes

echo "Monitoring PID $PID for $DURATION seconds..."
echo "Time,VSZ(KB),RSS(KB),CPU%"

for i in $(seq 1 $DURATION); do
  ps -p $PID -o time,vsz,rss,%cpu --no-headers | tr -s ' ' ','
  sleep 1
done > memory_log.csv

echo "Memory log saved to memory_log.csv"
```

#### Memory Leak Detection
```bash
# Run extended test to check for memory leaks
#!/bin/bash

echo "Starting memory leak test..."

# Get initial memory
PID=$(pgrep -f "node dist/index.js")
INITIAL_RSS=$(ps -p $PID -o rss --no-headers)

echo "Initial memory: ${INITIAL_RSS}KB"

# Run 1000 requests
for i in $(seq 1 1000); do
  curl -s -X POST http://localhost:3000/mcp \
    -H "Content-Type: application/json" \
    -H "Mcp-Session-Id: $SESSION_ID" \
    -d "{\"jsonrpc\":\"2.0\",\"id\":$i,\"method\":\"tools/call\",\"params\":{\"name\":\"getQuotes\",\"arguments\":{\"person\":\"Person$i\",\"numberOfQuotes\":1}}}" > /dev/null
  
  if [ $((i % 100)) -eq 0 ]; then
    CURRENT_RSS=$(ps -p $PID -o rss --no-headers)
    echo "After $i requests: ${CURRENT_RSS}KB"
  fi
done

# Final memory check
FINAL_RSS=$(ps -p $PID -o rss --no-headers)
INCREASE=$((FINAL_RSS - INITIAL_RSS))

echo "Final memory: ${FINAL_RSS}KB"
echo "Memory increase: ${INCREASE}KB"

if [ $INCREASE -gt 50000 ]; then
  echo "⚠️  WARNING: Significant memory increase detected"
else
  echo "✅ Memory usage acceptable"
fi
```

### 5. Circuit Breaker Performance

#### Circuit Breaker State Transitions
```bash
# Test circuit breaker performance

echo "Testing circuit breaker behavior..."

# Force failures with invalid API key
SERPER_API_KEY="invalid" node dist/index.js &
SERVER_PID=$!
sleep 3

# Send 10 requests to trigger circuit breaker
for i in $(seq 1 10); do
  START=$(date +%s.%N)
  
  curl -s -X POST http://localhost:3000/mcp \
    -H "Content-Type: application/json" \
    -H "Mcp-Session-Id: test" \
    -d '{"jsonrpc":"2.0","id":'$i',"method":"tools/call","params":{"name":"getResilientQuotes","arguments":{"person":"Einstein","numberOfQuotes":1}}}' \
    > cb_response_$i.json
  
  END=$(date +%s.%N)
  DIFF=$(echo "$END - $START" | bc)
  
  if grep -q "circuit breaker is open" cb_response_$i.json; then
    echo "Request $i: Circuit breaker OPEN (${DIFF}s)"
  else
    echo "Request $i: Normal failure (${DIFF}s)"
  fi
done

kill $SERVER_PID
```

## Performance Optimization Tips

### 1. Cache Optimization
```javascript
// Pre-warm cache for common queries
const preWarmCache = async () => {
  const popularPeople = [
    "Albert Einstein",
    "Steve Jobs",
    "Maya Angelou",
    "Mark Twain",
    "Marie Curie"
  ];
  
  console.log("Pre-warming cache...");
  for (const person of popularPeople) {
    await getResilientQuotes({ person, numberOfQuotes: 5 });
  }
  console.log("Cache pre-warming complete");
};
```

### 2. Connection Pooling
For production deployments, consider:
- HTTP keep-alive connections
- Connection pooling for database (if added)
- Reusing HTTP clients

### 3. Request Batching
```javascript
// Example batch request handler
const batchQuotes = async (requests) => {
  const results = await Promise.all(
    requests.map(req => 
      getResilientQuotes(req).catch(err => ({ error: err.message }))
    )
  );
  return results;
};
```

## Performance Monitoring Setup

### 1. Application Metrics
Key metrics to track:
- Response time percentiles (p50, p95, p99)
- Cache hit/miss ratio
- Circuit breaker state changes
- API call success rate
- Memory usage over time

### 2. Logging Performance Data
```javascript
// Add to your logging
logger.info('Performance metric', {
  operation: 'getQuotes',
  duration: endTime - startTime,
  cacheHit: false,
  resultCount: quotes.length,
  person: params.person
});
```

### 3. Monitoring Dashboard
Consider implementing:
- Prometheus metrics endpoint
- Grafana dashboards
- Real-time performance alerts

## Performance Troubleshooting

### Slow Response Times
1. Check cache hit rates
2. Verify API response times
3. Look for retry storms
4. Check circuit breaker state

### High Memory Usage
1. Check cache size
2. Look for memory leaks
3. Verify log rotation
4. Check for large responses

### CPU Spikes
1. Check for infinite loops
2. Verify retry logic
3. Look for parsing issues
4. Check concurrent request handling

## Benchmark Results

### Expected Performance Profile
```
Operation: getQuotes (cold start)
├── Network request: 800-1200ms
├── Parsing: 10-20ms
├── Validation: 1-5ms
└── Total: 900-1400ms

Operation: getResilientQuotes (cache hit)
├── Cache lookup: 1-5ms
├── Deserialization: 5-10ms
├── Response prep: 1-5ms
└── Total: 20-50ms

Operation: Concurrent handling (10 requests)
├── All complete: < 3s
├── No errors: ✓
├── Memory delta: < 20MB
└── CPU peak: < 80%
```

## Performance Validation Checklist

Before deployment, ensure:
- [ ] Cold start response < 2s
- [ ] Cache hit response < 200ms
- [ ] Memory usage < 300MB after 1 hour
- [ ] Can handle 10 concurrent requests
- [ ] Circuit breaker responds < 50ms when open
- [ ] No memory leaks over 1000 requests
- [ ] CPU usage reasonable under load
- [ ] All performance logs working