# Backend Scripts

This directory contains various scripts used for backend operations.

## laa-state-backup.sh

**Purpose:**
Tars a given state directory and rsyncs it to a target specified by environment variables, keeping the last 14 archives.

**Usage:**
Set the `BACKUP_TARGET` and `STATE_DIR` environment variables before running the script.

```bash
export BACKUP_TARGET=/path/to/backup/target
export STATE_DIR=/path/to/state/directory
./laa-state-backup.sh
```
