# Backend Scripts

This directory contains various scripts used for backend operations.

## backup/laa-state-backup.sh

**Purpose:**
Tars a state directory and rsyncs the archive to a local directory or an SSH target, then keeps only the newest
14 `laa-state-*.tar.gz` archives there. Other files in the target are never touched. If the archive or the copy
fails, the script exits non-zero before any old archive is deleted.

**Usage (from the repository root):**

```bash
export STATE_DIR=/path/to/state/directory
export BACKUP_TARGET=/path/to/backup/target   # or user@host:/path/to/backup/target
export BACKUP_KEEP=14                          # optional
bash apps/backend/scripts/backup/laa-state-backup.sh
```