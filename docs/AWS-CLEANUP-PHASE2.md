# AWS Cleanup - Phase 2: Workflow Enhancements

**Date**: 2025-11-13  
**Priority**: Medium  
**Estimated Time**: 2-3 hours

---

## 🎯 Objectives

Enhance existing GitHub Actions workflows to ensure complete and reliable cleanup when branches are deleted or PRs are closed.

---

## Task 1: Enhance PR Preview Cleanup Workflow

### Current State
**File**: `.github/workflows/pull-request-delete-preview.yml`

**What it does**:
- ✅ Deletes S3 bucket on PR close
- ✅ Attempts to delete Route53 DNS records
- ⚠️ Limited error handling
- ⚠️ No cleanup for CloudFront (if used)
- ⚠️ No notification on failure

### Improvements Needed

**1. Add Better Error Handling**
```yaml
- name: Delete preview S3 bucket and contents
  continue-on-error: true  # Don't fail workflow if bucket doesn't exist
  run: |
    # ... existing code ...
    
- name: Report cleanup status
  if: always()  # Run even if previous steps failed
  run: |
    echo "Cleanup completed for PR #${{ github.event.pull_request.number }}"
```

**2. Add CloudFront Distribution Cleanup** (if applicable)
```yaml
- name: Delete CloudFront distribution (if exists)
  run: |
    # Check if distribution exists for this PR
    # Disable distribution
    # Wait for disabled
    # Delete distribution
```

**3. Add Slack/Email Notification on Failure**
```yaml
- name: Notify on cleanup failure
  if: failure()
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    text: 'Failed to cleanup PR #${{ github.event.pull_request.number }}'
```

---

## Task 2: Add Branch Deletion Cleanup Workflow

### Problem
When feature branches are deleted (without PR), resources aren't cleaned up.

### Solution
Create new workflow: `.github/workflows/branch-delete-cleanup.yml`

```yaml
name: Cleanup Resources on Branch Delete

on:
  delete:
    # This triggers when any branch is deleted

env:
  AWS_REGION: us-west-2

permissions:
  contents: read

jobs:
  cleanup-branch-resources:
    if: github.event.ref_type == 'branch'
    runs-on: ubuntu-latest
    timeout-minutes: 10

    steps:
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-west-2

      - name: Generate resource names
        id: resources
        run: |
          # Sanitize branch name for S3 bucket naming
          BRANCH_NAME="${{ github.event.ref }}"
          SANITIZED=$(echo "$BRANCH_NAME" | tr '[:upper:]' '[:lower:]' | tr -cd 'a-z0-9-')
          BUCKET_NAME="jouster-branch-${SANITIZED}"
          echo "bucket=$BUCKET_NAME" >> $GITHUB_OUTPUT

      - name: Check and delete S3 bucket
        run: |
          BUCKET="${{ steps.resources.outputs.bucket }}"
          
          if aws s3 ls "s3://${BUCKET}" 2>&1 | grep -q 'NoSuchBucket'; then
            echo "No bucket found for branch: ${BUCKET}"
          else
            echo "Deleting bucket: ${BUCKET}"
            aws s3 rb "s3://${BUCKET}" --force
            echo "✅ Bucket deleted"
          fi

      - name: Check and delete DNS records
        run: |
          BUCKET="${{ steps.resources.outputs.bucket }}"
          DNS_NAME="${BUCKET}.jouster.org"
          
          # Get hosted zone
          ZONE_ID=$(aws route53 list-hosted-zones \
            --query "HostedZones[?Name=='jouster.org.'].Id" \
            --output text | sed 's|/hostedzone/||')
          
          # Check if record exists and delete
          # ... (similar to PR cleanup)
```

### Benefits
- ✅ Cleans up resources when branches deleted without PR
- ✅ Prevents orphaned resources
- ✅ Automatic and event-driven

---

## Task 3: Add Dry-Run Testing Mode

### Problem
Hard to test cleanup workflows without actually deleting resources.

### Solution
Add environment variable to enable dry-run mode:

```yaml
env:
  DRY_RUN: ${{ github.event.inputs.dry_run || 'false' }}

jobs:
  cleanup:
    steps:
      - name: Delete S3 bucket
        run: |
          if [ "$DRY_RUN" == "true" ]; then
            echo "[DRY RUN] Would delete: s3://${BUCKET_NAME}"
          else
            aws s3 rb "s3://${BUCKET_NAME}" --force
          fi
```

### Workflow Dispatch for Manual Testing
```yaml
on:
  workflow_dispatch:
    inputs:
      dry_run:
        description: 'Run in dry-run mode (no actual deletions)'
        required: false
        default: 'true'
        type: boolean
      pr_number:
        description: 'PR number to clean up'
        required: true
        type: number
```

---

## Task 4: Add Resource Inventory Logging

### Problem
No record of what resources existed before deletion.

### Solution
Log inventory before deletion:

```yaml
- name: Inventory resources before deletion
  run: |
    BUCKET="${{ steps.bucket.outputs.name }}"
    
    echo "📋 Resource inventory for PR #${{ github.event.pull_request.number }}"
    echo "Bucket: ${BUCKET}"
    echo ""
    echo "Contents:"
    aws s3 ls "s3://${BUCKET}" --recursive --summarize || echo "Bucket doesn't exist"
    echo ""
    echo "Size and object count:"
    aws s3 ls "s3://${BUCKET}" --recursive --summarize | grep "Total"
```

### Upload as Artifact
```yaml
- name: Upload cleanup report
  uses: actions/upload-artifact@v3
  with:
    name: cleanup-report-pr-${{ github.event.pull_request.number }}
    path: cleanup-report.txt
    retention-days: 30
```

---

## Task 5: Add Retry Logic

### Problem
AWS API calls can fail due to rate limiting or transient errors.

### Solution
Add retry logic with exponential backoff:

```yaml
- name: Delete S3 bucket with retry
  uses: nick-invision/retry@v2
  with:
    timeout_minutes: 5
    max_attempts: 3
    retry_wait_seconds: 10
    command: |
      aws s3 rb "s3://${{ steps.bucket.outputs.name }}" --force
```

Or use bash retry logic:

```bash
retry() {
  local max_attempts=3
  local attempt=1
  local delay=5
  
  while [ $attempt -le $max_attempts ]; do
    if "$@"; then
      return 0
    fi
    echo "Attempt $attempt failed. Retrying in ${delay}s..."
    sleep $delay
    delay=$((delay * 2))
    attempt=$((attempt + 1))
  done
  
  echo "All $max_attempts attempts failed"
  return 1
}

retry aws s3 rb "s3://${BUCKET_NAME}" --force
```

---

## Implementation Checklist

### Enhancement 1: PR Preview Cleanup
- [ ] Add `continue-on-error` to non-critical steps
- [ ] Add cleanup status reporting
- [ ] Add notification on failure (optional)
- [ ] Test with closed PR

### Enhancement 2: Branch Deletion Cleanup
- [ ] Create new workflow file
- [ ] Test branch name sanitization
- [ ] Test with deleted branch
- [ ] Document behavior

### Enhancement 3: Dry-Run Mode
- [ ] Add `DRY_RUN` environment variable
- [ ] Update all deletion commands
- [ ] Add `workflow_dispatch` trigger
- [ ] Test dry-run mode

### Enhancement 4: Resource Inventory
- [ ] Add inventory logging before deletion
- [ ] Upload as artifact (optional)
- [ ] Test artifact upload

### Enhancement 5: Retry Logic
- [ ] Add retry to S3 operations
- [ ] Add retry to Route53 operations
- [ ] Test retry behavior

---

## Testing Plan

### Test 1: PR Preview Cleanup
1. Create test PR
2. Deploy preview environment
3. Close PR
4. Verify workflow runs
5. Verify bucket deleted
6. Verify DNS records deleted

### Test 2: Branch Deletion Cleanup
1. Create feature branch
2. Create resources for branch (manual)
3. Delete branch
4. Verify workflow runs
5. Verify resources cleaned up

### Test 3: Dry-Run Mode
1. Trigger workflow manually
2. Enable dry-run mode
3. Verify no actual deletions
4. Check logs show what would be deleted

---

## Success Criteria

- ✅ PR cleanup workflow handles errors gracefully
- ✅ Branch deletion cleanup workflow works
- ✅ Dry-run mode allows safe testing
- ✅ Resource inventory logged before deletion
- ✅ Retry logic handles transient failures
- ✅ All tests pass
- ✅ Documentation updated

---

**Next Steps**: Implement enhancements, test thoroughly, move to Phase 3

