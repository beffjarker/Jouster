#!/usr/bin/env bash
# Archive an LAA state directory and copy it to a local or SSH target, keeping the newest N archives.
#   STATE_DIR      directory to archive (required)
#   BACKUP_TARGET  local directory or rsync SSH target such as user@host:/backups/laa (required)
#   BACKUP_KEEP    number of archives to keep at the target (default 14)
set -euo pipefail

: "${STATE_DIR:?STATE_DIR must be set}"
: "${BACKUP_TARGET:?BACKUP_TARGET must be set}"
KEEP="${BACKUP_KEEP:-14}"
PATTERN='laa-state-*.tar.gz'

if [ ! -d "$STATE_DIR" ]; then
  echo "Error: STATE_DIR '$STATE_DIR' is not a directory." >&2
  exit 1
fi
case "$KEEP" in
  ''|*[!0-9]*|0) echo "Error: BACKUP_KEEP must be a positive integer." >&2; exit 1 ;;
esac

WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT
ARCHIVE="$WORK_DIR/laa-state-$(date -u +%Y%m%dT%H%M%SZ).tar.gz"

# set -e stops here if tar, rsync or ssh fails, so retention never runs after a failed copy.
tar -czf "$ARCHIVE" -C "$STATE_DIR" .

# Delete all but the newest $KEEP archives; only files matching $PATTERN, null-delimited for odd names.
prune_cmd() {
  printf 'find %q -maxdepth 1 -type f -name %q -print0 | sort -zr | tail -zn +%d | xargs -0r rm -f --' \
    "$1" "$PATTERN" "$((KEEP + 1))"
}

if [[ "$BACKUP_TARGET" =~ ^[^/]+: ]]; then
  REMOTE_HOST="${BACKUP_TARGET%%:*}"
  REMOTE_DIR="${BACKUP_TARGET#*:}"
  REMOTE_DIR="${REMOTE_DIR:-.}"
  ssh "$REMOTE_HOST" "mkdir -p $(printf %q "$REMOTE_DIR")"
  rsync -a "$ARCHIVE" "$REMOTE_HOST:$REMOTE_DIR/"
  ssh "$REMOTE_HOST" "$(prune_cmd "$REMOTE_DIR")"
else
  mkdir -p "$BACKUP_TARGET"
  rsync -a "$ARCHIVE" "$BACKUP_TARGET/"
  bash -c "$(prune_cmd "$BACKUP_TARGET")"
fi

echo "Backed up $STATE_DIR to $BACKUP_TARGET/$(basename "$ARCHIVE") (keeping $KEEP)."