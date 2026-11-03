#!/bin/bash

# Ensure BACKUP_TARGET is set
if [ -z "$BACKUP_TARGET" ]; then
  echo "Error: BACKUP_TARGET environment variable must be set"
  exit 1
fi

# Ensure STATE_DIR is set
if [ -z "$STATE_DIR" ]; then
  echo "Error: STATE_DIR environment variable must be set"
  exit 1
fi

# Create a timestamped backup file
TIMESTAMP=$(date +%Y%m%d%H%M%S)
BACKUP_FILE="laa-state-backup-$TIMESTAMP.tar.gz"
tar -czf "$BACKUP_FILE" "$STATE_DIR"

# Rsync the backup to the target directory, keeping only the last 14 archives
rsync --remove-source-files "$BACKUP_FILE" "$BACKUP_TARGET/"
cd "$BACKUP_TARGET"
ls -t | tail -n +15 | xargs rm -f
