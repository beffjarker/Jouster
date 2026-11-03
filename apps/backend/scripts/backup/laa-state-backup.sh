#!/bin/bash

# Check if required environment variables are set
if [ -z "$BACKUP_TARGET" ] || [ -z "$STATE_DIR" ]; then
  echo "Error: BACKUP_TARGET and STATE_DIR must be set."
  exit 1
fi

# Create a timestamped archive of the state directory
ARCHIVE_NAME="laa-state-$(date +%Y%m%d%H%M%S).tar.gz"
if ! tar -czf "$ARCHIVE_NAME" -C "$STATE_DIR" .; then
  echo "Error: Failed to create archive of $STATE_DIR."
  exit 1
fi

cd "$BACKUP_TARGET" || { echo "Error: Could not change directory to $BACKUP_TARGET."; rm "$ARCHIVE_NAME"; exit 1; }

# Retain only the last 14 LAA archive files
shopt -s nullglob
LAA_ARCHIVES=(*laa-state-*.tar.gz)
if [ ${#LAA_ARCHIVES[@]} -gt 14 ]; then
  sorted_archives=($(printf "%s\n" "${LAA_ARCHIVES[@]}" | sort))
  for ((i=0; i<${#sorted_archives[@]}-14; i++)); do
    rm "${sorted_archives[i]}"
  done
fi

# Move the newly created archive to the backup target
cp "$ARCHIVE_NAME" . || { echo "Error: Failed to copy $ARCHIVE_NAME to $BACKUP_TARGET."; exit 1; }
rm "$ARCHIVE_NAME"
