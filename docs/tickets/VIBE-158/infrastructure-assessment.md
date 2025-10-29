# VIBE-158: Infrastructure Assessment

## Summary

**Status:** No infrastructure changes required

All required infrastructure components for the manual upload form feature are already in place and operational.

## Infrastructure Requirements Analysis

### 1. Redis Service

**Status:** ✅ Operational

**Configuration:**
- Service: Redis 8 Alpine (docker-compose.yml)
- Container name: cath-redis
- Port mapping: 6380 (host) -> 6379 (container)
- Persistence: Enabled with appendonly mode
- Health checks: Configured with redis-cli ping
- Volume: redis_data (persistent)

**Verification:**
```bash
docker ps --filter "name=cath-redis"
# Output: Up 3 days (healthy)
```

**Location:** /Users/christopher.stacey/development/git-projects/cath-service/docker-compose.yml (lines 20-33)

### 2. Redis Client Configuration

**Status:** ✅ Configured

**Implementation:**
- Package: redis@5.9.0 (apps/web/package.json)
- Client creation: apps/web/src/app.ts (lines 62-68)
- Connection URL: redis://localhost:6380 (default) or via REDIS_URL env var

**Configuration Files:**
- Default URL: apps/web/config/default.json (line 7)
- Environment variable: apps/web/config/custom-environment-variables.json (line 4)

### 3. Session Management

**Status:** ✅ Configured with Redis Backend

**Implementation:**
- Package: connect-redis@9.0.0, express-session@1.18.2
- Middleware: expressSessionRedis from @hmcts/web-core
- Configuration: apps/web/src/app.ts (line 31)
- Session prefix: "sess:"
- Session cookie: 4 hours (default)

**Session Store:**
- Backend: Redis
- Store implementation: libs/web-core/src/middleware/session-stores/redis-store.ts
- Secret: Configured via SESSION_SECRET environment variable

### 4. File Storage Requirements

**Status:** ✅ No additional infrastructure needed

**Design:**
- Temporary storage: Redis (1 hour TTL)
- Key format: `manual-upload:${uuid}`
- Data format: JSON string with base64-encoded file
- Maximum file size: 2MB (enforced by application, well within Redis limits)

**Redis Configuration Check:**
- Default maxmemory: Unlimited (docker-compose.yml uses default)
- Eviction policy: Default (no eviction if maxmemory not set)
- Persistence: AOF enabled (appendonly yes)

### 5. Environment Variables

**Status:** ✅ No new variables required

**Existing Variables:**
- `REDIS_URL` - Redis connection URL (already configured)
- `SESSION_SECRET` - Session secret (already configured)
- `PORT` - Application port (already configured)

### 6. Container Orchestration

**Status:** ✅ No changes required

**Docker Configuration:**
- Web app Dockerfile: apps/web/Dockerfile (production ready)
- No Dockerfile changes needed
- No Kubernetes manifests exist (development-focused repository)
- No Helm charts exist

### 7. CI/CD Pipeline

**Status:** ✅ No changes required

**Rationale:**
- Feature uses existing Redis infrastructure
- No new services or dependencies
- No deployment configuration changes
- No new environment variables

## Known Issues and Recommendations

### Issue 1: Missing @hmcts/redis Module

**Problem:**
The specification (docs/tickets/VIBE-158/specification.md) references `@hmcts/redis` module, but this module does not exist in the codebase.

**Current Implementation:**
Redis client is created directly in apps/web/src/app.ts using the `redis` package.

**Impact:**
The manual-upload-storage.ts service cannot import from `@hmcts/redis` as specified.

**Recommendations:**

**Option 1 (Recommended - YAGNI):**
Use dependency injection pattern:
```typescript
// manual-upload-storage.ts
export async function storeManualUpload(
  redisClient: RedisClientType,
  data: ManualUploadData
): Promise<string> {
  // Implementation
}
```

**Option 2:**
Create @hmcts/redis module to export Redis client factory:
```typescript
// libs/redis/src/index.ts
import { createClient } from "redis";
import config from "config";

export async function getRedisClient() {
  const redisClient = createClient({ url: config.get("redis.url") });
  await redisClient.connect();
  return redisClient;
}
```

**Option 3:**
Export getRedisClient from apps/web and import where needed (violates architecture boundaries).

**Decision Required:** Development team should decide on approach before implementation begins.

### Issue 2: Redis Memory Management

**Observation:**
Docker Compose configuration does not set maxmemory limit for Redis.

**Risk Level:** Low (for manual upload feature)

**Analysis:**
- File uploads limited to 2MB per file
- 1-hour TTL ensures automatic cleanup
- Expected usage: Unlikely to exceed available memory

**Recommendation:**
Consider adding maxmemory configuration if production environment has memory constraints:
```yaml
command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
```

**Status:** Monitor in development; address if issues arise.

## Testing Verification

### Development Environment

**Redis Connectivity:**
```bash
# Verify Redis is running
docker ps --filter "name=cath-redis"

# Test Redis connection
docker exec cath-redis redis-cli ping
# Expected: PONG

# Check Redis memory usage
docker exec cath-redis redis-cli info memory | grep used_memory_human
```

**Session Store:**
```bash
# Verify session keys in Redis
docker exec cath-redis redis-cli --scan --pattern "sess:*"

# Check session TTL
docker exec cath-redis redis-cli TTL "sess:session-key-here"
```

### Test Environment

**Required:**
- Redis service must be available for E2E tests
- Recommend using TestContainers for isolated test environment
- Alternative: Use existing docker-compose setup

**Configuration:**
E2E tests should use same Redis configuration as development environment.

## Security Considerations

### Data Sensitivity

**File Storage:**
- Files stored temporarily (1 hour) in Redis
- Files base64-encoded (not encrypted)
- Redis not exposed to internet (localhost only in docker-compose)

**Session Storage:**
- Session cookies: httpOnly, secure (in production)
- Session secret: Configured via environment variable
- Session data stored in Redis with prefix "sess:"

**Recommendations:**
- Ensure REDIS_URL uses TLS in production (rediss://)
- Ensure Redis requires authentication in production (AUTH command)
- Consider encrypting sensitive file data before Redis storage

### Network Security

**Current:**
- Redis exposed on localhost:6380 only
- No authentication configured in docker-compose

**Production Considerations:**
- Redis should be in private network
- Enable Redis AUTH
- Use TLS for Redis connections
- Restrict access via network policies

## Performance Considerations

### Redis Performance

**File Upload Storage:**
- 2MB file -> ~2.7MB base64 encoded
- 1-hour TTL with automatic expiration
- Expected load: Low (manual uploads by administrators)

**Bottlenecks:**
- None anticipated for this feature
- Redis can handle thousands of 2MB objects

**Monitoring:**
- Monitor Redis memory usage
- Track number of manual-upload:* keys
- Alert if memory usage exceeds threshold

### Session Performance

**Current Configuration:**
- 4-hour session timeout
- Redis-backed session store
- No anticipated issues

## Deployment Checklist

### Development Environment
- [x] Redis container running
- [x] Redis health checks passing
- [x] Session middleware configured
- [x] Environment variables set

### Production Environment (Future)
- [ ] Verify Redis TLS enabled (rediss://)
- [ ] Verify Redis authentication configured
- [ ] Verify Redis memory limits appropriate
- [ ] Verify Redis backup/persistence strategy
- [ ] Verify SESSION_SECRET is strong and unique
- [ ] Verify session cookie secure flag enabled
- [ ] Monitor Redis connection pool
- [ ] Set up Redis monitoring/alerting

## Conclusion

All infrastructure requirements for VIBE-158 are met with existing configuration. No infrastructure changes, deployments, or environment variable updates are needed.

The primary concern is the specification referencing a non-existent `@hmcts/redis` module. This should be resolved through dependency injection or by creating the module before implementation begins.

**Infrastructure Status:** READY FOR IMPLEMENTATION

**Blocker:** None

**Action Required:** Development team to decide on Redis client access pattern (see Issue 1 recommendations).
