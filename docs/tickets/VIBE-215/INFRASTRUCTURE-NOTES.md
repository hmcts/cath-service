# VIBE-215: Infrastructure Configuration and Storage Limitations

## Overview

This document outlines the infrastructure configuration for the flat file viewing feature (VIBE-215) and the critical storage limitations that affect deployment.

## Current Configuration

### File Storage

**Location**: `storage/temp/uploads/` (relative to container working directory)
**Implementation**: Node.js filesystem operations (`fs` module)
**File Format**: `{uuid}.pdf` (all flat files are PDFs)

### Helm Chart Configuration

Updated `/workspaces/cath-service/apps/web/helm/values.yaml`:

```yaml
nodejs:
  # Single pod deployment required due to ephemeral filesystem storage
  # Files are stored in container storage at storage/temp/uploads/
  # Multiple pods would have isolated filesystems causing file access issues
  # TODO: Enable autoscaling after Azure Blob Storage implementation (follow-up ticket)
  replicas: 1
  autoscaling:
    enabled: false
```

## Critical Storage Limitations

### 1. Ephemeral Container Storage

**Issue**: Container filesystems are ephemeral and wiped on pod restart

**Impact**:
- Files uploaded to one pod instance are lost when that pod restarts
- Pod restarts occur during:
  - Deployments (new image versions)
  - Node scaling/maintenance
  - Pod evictions
  - Container crashes

**Mitigation**: Single pod deployment minimizes restart frequency, but data loss is still possible

### 2. Multi-Pod Isolation

**Issue**: Multiple pod replicas each have isolated filesystems

**Impact**:
- File upload request may hit Pod A
- File retrieval request may hit Pod B (due to load balancing)
- Results in "404 File Not Found" errors despite successful upload
- Horizontal scaling is completely broken

**Mitigation**: Single pod deployment (`replicas: 1`) ensures all requests hit the same pod

### 3. No Persistent Volume Configuration

**Current State**: No persistent volume claim (PVC) or volume mounts configured

**Impact**:
- No data persistence across pod restarts
- No shared storage between pods
- No backup/recovery mechanism

## Deployment Strategy

### Development Environment

**Status**: No changes required
- Local filesystem storage works correctly
- Single-instance application
- Files persist across development sessions

### Non-Production Environments (Demo, Test, Staging)

**Configuration**:
- Deploy with `replicas: 1` and `autoscaling.enabled: false`
- Accept file loss on pod restarts
- Suitable for testing and demonstration purposes

**Acceptable Risks**:
- Test data loss is acceptable
- Low traffic doesn't require scaling
- Pod restarts are infrequent in lower environments

### Production Environment

**Status**: REQUIRES FOLLOW-UP WORK BEFORE PRODUCTION RELEASE

**Critical Requirements**:
1. Implement persistent storage solution (Azure Blob Storage recommended)
2. Update file-retrieval service to support blob storage
3. Enable horizontal pod autoscaling after storage migration
4. Plan migration strategy for existing files

**Unacceptable Risks**:
- Production data loss on pod restarts
- Service unavailability during scaling events
- Poor user experience with file access failures

## Recommended Production Storage Solution

### Azure Blob Storage (Recommended)

**Architecture**:
- Provision Azure Storage Account in each environment
- Create blob container for publication files
- Use Azure managed identity for authentication
- Update `file-retrieval.ts` to use Azure SDK

**Benefits**:
- Cloud-native and highly scalable
- No single point of failure
- Automatic replication and redundancy
- Cost-effective for large files
- CDN integration possible
- Supports horizontal pod autoscaling

**Environment Variables Required**:
```yaml
nodejs:
  environment:
    AZURE_STORAGE_ACCOUNT_NAME: cathstorage{{ .Values.global.environment }}
    AZURE_STORAGE_CONTAINER_NAME: publications
    STORAGE_TYPE: blob  # 'filesystem' or 'blob'

  keyVaults:
    pip-ss-kv-{{ .Values.global.environment }}:
      secrets:
        - name: storage-account-connection-string
          alias: AZURE_STORAGE_CONNECTION_STRING
```

**Code Changes Required**:
1. Install `@azure/storage-blob` package
2. Create blob storage adapter in `file-retrieval.ts`
3. Add environment-based storage selection
4. Maintain backward compatibility with filesystem storage

**Infrastructure Changes**:
1. Provision Azure Storage Account via Terraform
2. Configure managed identity access
3. Update Key Vault with connection string
4. Update Helm chart with blob configuration
5. Re-enable autoscaling after verification

### Alternative: Kubernetes Persistent Volume (Not Recommended)

**Architecture**:
- Add persistent volume claim to Helm chart
- Mount volume to `/app/storage` in pods
- Use Azure Files (ReadWriteMany support)

**Limitations**:
- Single point of failure (shared volume)
- Lower performance than Blob Storage
- Limited scalability
- Not cloud-native
- Azure Files has lower throughput than Blob Storage

**Only Consider If**:
- Short-term solution needed quickly
- Azure Blob Storage integration is delayed
- File volumes are small (<10GB)

## Migration Strategy

### Phase 1: Current Implementation (VIBE-215)
- Deploy with single pod configuration
- Use ephemeral filesystem storage
- Document limitations clearly
- Suitable for non-production environments

### Phase 2: Azure Blob Storage Implementation (Follow-up Ticket)
1. **Provision Azure Resources** (Infrastructure Team)
   - Create storage account
   - Create blob container
   - Configure managed identity
   - Update Key Vault

2. **Update Code** (Development Team)
   - Install Azure SDK
   - Create blob storage adapter
   - Add storage type configuration
   - Update file upload flow
   - Update file retrieval flow
   - Add tests for blob operations

3. **Migration** (Infrastructure + Development)
   - Deploy blob storage code to staging
   - Test file upload/download operations
   - Migrate existing files (if any)
   - Update Helm chart for autoscaling
   - Deploy to production

4. **Enable Autoscaling**
   - Set `replicas: 2` (minimum)
   - Set `autoscaling.enabled: true`
   - Configure autoscaling thresholds
   - Monitor performance

### Phase 3: Production Optimization (Future)
- CDN integration for file delivery
- Response compression
- Partial content support (HTTP 206)
- ETag headers for caching

## Monitoring Requirements

### Key Metrics to Track

1. **File Retrieval Failures**
   - Track "FILE_NOT_FOUND" errors
   - Correlate with pod restart events
   - Alert on high failure rate

2. **Pod Restart Frequency**
   - Monitor pod restart reasons
   - Track restart impact on file availability
   - Alert on unexpected restarts

3. **Storage Usage** (when persistent volume added)
   - Track disk usage growth
   - Alert on approaching capacity
   - Plan for storage expansion

### Logging

Log all file operations with pod identity:
```typescript
console.error("File retrieval failed", {
  artefactId,
  error: "FILE_NOT_FOUND",
  timestamp: new Date().toISOString(),
  podName: process.env.HOSTNAME  // Kubernetes pod name
});
```

## Security Considerations

### Current Implementation (Filesystem)
- Path traversal prevention implemented
- File validation before serving
- No directory listing exposure
- No additional configuration required

### Future Implementation (Blob Storage)
- Use managed identity (no connection strings in code)
- Configure private endpoints (no public access)
- Implement blob access policies
- Store connection string in Key Vault
- Enable blob versioning for audit trail
- Configure blob lifecycle policies for cleanup

## Testing in Different Environments

### Local Development
- Files persist across restarts
- No special configuration needed
- Test with `yarn dev`

### CI Pipeline
- Use TestContainers or mock filesystem
- No actual file persistence needed
- E2E tests create temporary files

### Demo/Staging
- Single pod deployment acceptable
- Document that files may be lost
- Refresh test data regularly

### Production
- MUST implement persistent storage before release
- Validate horizontal scaling works
- Load test with multiple pods
- Verify file availability across all pods

## Follow-up Ticket Requirements

Create JIRA ticket for Azure Blob Storage implementation with:

**Title**: Implement Azure Blob Storage for CaTH File Uploads

**Description**:
- Migrate from ephemeral filesystem to Azure Blob Storage
- Enable horizontal pod autoscaling
- Implement blob storage adapter
- Migrate existing files (if any)

**Acceptance Criteria**:
- Files stored in Azure Blob Storage
- Horizontal pod autoscaling enabled
- Files accessible from all pod replicas
- No file loss on pod restarts
- Backward compatibility maintained

**Infrastructure Tasks**:
- Provision Azure Storage Account (per environment)
- Create blob containers
- Configure managed identity
- Update Terraform configurations
- Update Key Vault with secrets

**Development Tasks**:
- Install Azure SDK package
- Implement blob storage adapter
- Update file upload flow
- Update file retrieval flow
- Add unit tests for blob operations
- Update E2E tests

**Migration Tasks**:
- Document migration procedure
- Create file migration script
- Test in staging first
- Plan production cutover

## Risks and Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| File loss on pod restart | High | Medium | Document limitation, implement blob storage |
| Multi-pod file access failures | High | Low (single pod) | Keep single pod until migration |
| Storage capacity limits | Medium | Low | Monitor usage, expand as needed |
| Migration complexity | Medium | Medium | Thorough testing, staged rollout |
| Performance degradation | Low | Low | Load testing, CDN integration |

## Conclusion

The current filesystem-based storage implementation is suitable for:
- Development environments
- Non-production testing
- Initial feature demonstration

However, **production deployment requires Azure Blob Storage implementation** to ensure:
- Data persistence across pod restarts
- Support for horizontal pod autoscaling
- Reliable file access under load
- Production-grade reliability

The single-pod configuration mitigates immediate risks but should be considered a temporary solution until persistent storage is implemented.
