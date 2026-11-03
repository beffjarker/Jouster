#!/usr/bin/env bash
# Blue/green release helper for the jouster-ui frontend.
#
#   GREEN = staging bucket (stg.jouster.org), auto-deployed from main.
#   BLUE  = production bucket behind the jouster.org CloudFront distribution.
#
# Promotion copies the exact artifact already verified on GREEN into BLUE, after
# snapshotting BLUE so it can be restored by the rollback workflow.
#
# Usage: frontend-release.sh <command> [args]
#   resolve                  Discover the prod distribution, bucket and origin path.
#   snapshot <label>         Copy current prod into the releases bucket. Prints the snapshot id.
#   publish <s3-uri>         Replace prod contents with <s3-uri> (assets first, HTML last, then prune).
#   diff <s3-uri>            Dry-run listing of what publish would change.
#   invalidate               Invalidate the prod CloudFront distribution and wait for completion.
#   verify <s3-uri>          Check https://$PROD_DOMAIN/index.html matches <s3-uri>/index.html.
#   list                     List snapshot ids (oldest first).
#   prune                    Delete all but the newest $KEEP_SNAPSHOTS snapshots.
#
# Env: AWS_REGION, PROD_DOMAIN, STAGING_BUCKET, RELEASES_BUCKET, KEEP_SNAPSHOTS,
#      optional PROD_BUCKET_OVERRIDE, PROD_PREFIX_OVERRIDE, PROD_DISTRIBUTION_ID_OVERRIDE.
# `resolve` exports PROD_BUCKET, PROD_PREFIX and PROD_DISTRIBUTION_ID (via $GITHUB_ENV) for later commands.
set -euo pipefail

: "${AWS_REGION:=us-west-2}"
: "${PROD_DOMAIN:=jouster.org}"
: "${STAGING_BUCKET:=stg.jouster.org}"
: "${RELEASES_BUCKET:=jouster-org-releases}"
: "${KEEP_SNAPSHOTS:=10}"
SNAPSHOT_ROOT="frontend"
NO_CACHE="no-cache, no-store, must-revalidate"

die() { echo "::error::$*" >&2; exit 1; }

set_env() {
  echo "$1=$2"
  if [[ -n "${GITHUB_ENV:-}" ]]; then echo "$1=$2" >> "$GITHUB_ENV"; fi
}

prod_uri() {
  [[ -n "${PROD_BUCKET:-}" ]] || die "PROD_BUCKET is not set; run 'resolve' first"
  echo "s3://${PROD_BUCKET}${PROD_PREFIX:-}"
}

count_objects() {
  { aws s3 ls "${1%/}/" --recursive 2>/dev/null || true; } | wc -l
}

cmd_resolve() {
  local dist_id="${PROD_DISTRIBUTION_ID_OVERRIDE:-}"
  if [[ -z "$dist_id" ]]; then
    dist_id=$(aws cloudfront list-distributions \
      --query "DistributionList.Items[?Aliases.Items && contains(Aliases.Items, '${PROD_DOMAIN}')].Id | [0]" \
      --output text)
    [[ -n "$dist_id" && "$dist_id" != "None" ]] || die "No CloudFront distribution has alias ${PROD_DOMAIN}"
  fi

  local bucket="${PROD_BUCKET_OVERRIDE:-}" prefix="${PROD_PREFIX_OVERRIDE:-}"
  if [[ -z "$bucket" ]]; then
    local config origin_id domain
    config=$(aws cloudfront get-distribution-config --id "$dist_id" --output json)
    origin_id=$(jq -r '.DistributionConfig.DefaultCacheBehavior.TargetOriginId' <<<"$config")
    domain=$(jq -r --arg id "$origin_id" \
      '.DistributionConfig.Origins.Items[] | select(.Id == $id) | .DomainName' <<<"$config")
    prefix=$(jq -r --arg id "$origin_id" \
      '.DistributionConfig.Origins.Items[] | select(.Id == $id) | .OriginPath // ""' <<<"$config")
    # Handles both S3 website (bucket.s3-website-us-west-2...) and REST (bucket.s3.us-west-2...) origins.
    bucket=$(sed -E 's/\.s3([.-][a-z0-9-]+)*\.amazonaws\.com$//' <<<"$domain")
    [[ "$bucket" != "$domain" ]] || die "Default origin '${domain}' is not an S3 origin; set PROD_BUCKET_OVERRIDE"
  fi
  prefix="${prefix%/}"

  [[ "$bucket" != "$STAGING_BUCKET" ]] || die "Production bucket resolves to the staging bucket (${bucket})"
  aws s3api head-bucket --bucket "$bucket" >/dev/null || die "Production bucket ${bucket} is not accessible"
  aws s3api head-bucket --bucket "$STAGING_BUCKET" >/dev/null || die "Staging bucket ${STAGING_BUCKET} is not accessible"

  set_env PROD_DISTRIBUTION_ID "$dist_id"
  set_env PROD_BUCKET "$bucket"
  set_env PROD_PREFIX "$prefix"
}

ensure_releases_bucket() {
  if aws s3api head-bucket --bucket "$RELEASES_BUCKET" >/dev/null 2>&1; then return; fi
  echo "Creating private releases bucket ${RELEASES_BUCKET}..." >&2
  if [[ "$AWS_REGION" == "us-east-1" ]]; then
    aws s3api create-bucket --bucket "$RELEASES_BUCKET" >/dev/null
  else
    aws s3api create-bucket --bucket "$RELEASES_BUCKET" \
      --create-bucket-configuration "LocationConstraint=${AWS_REGION}" >/dev/null
  fi
  aws s3api put-public-access-block --bucket "$RELEASES_BUCKET" \
    --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
}

cmd_snapshot() {
  local label="${1:-manual}" src id count
  src=$(prod_uri)
  count=$(count_objects "$src")
  if [[ "$count" -eq 0 ]]; then
    echo "::warning::Production is empty; nothing to snapshot" >&2
    return 0
  fi
  ensure_releases_bucket
  id="$(date -u +%Y%m%dT%H%M%SZ)-${label//[^a-zA-Z0-9-]/-}"
  aws s3 cp "${src}/" "s3://${RELEASES_BUCKET}/${SNAPSHOT_ROOT}/${id}/" --recursive --only-show-errors >&2
  echo "Snapshot ${id} (${count} objects) saved to s3://${RELEASES_BUCKET}/${SNAPSHOT_ROOT}/${id}/" >&2
  echo "$id"
}

cmd_publish() {
  local src="${1:?source s3 uri required}" dst
  src="${src%/}"
  dst=$(prod_uri)
  [[ "$(count_objects "$src")" -gt 0 ]] || die "Source ${src} is empty; refusing to publish"
  aws s3 ls "${src}/index.html" >/dev/null || die "Source ${src} has no index.html; refusing to publish"

  # `cp` (not `sync`) so same-size files with different content are always replaced.
  # Hashed assets go first and HTML last so no page ever references a missing bundle.
  echo "Copying assets ${src} -> ${dst}"
  aws s3 cp "${src}/" "${dst}/" --recursive --exclude "*.html" --only-show-errors
  # Entry points get no-cache so browsers revalidate and pick up new hashed bundles right away.
  echo "Copying HTML ${src} -> ${dst}"
  aws s3 cp "${src}/" "${dst}/" --recursive --exclude "*" --include "*.html" --only-show-errors \
    --metadata-directive REPLACE --cache-control "$NO_CACHE" --content-type "text/html; charset=utf-8"
  if aws s3 ls "${src}/build-info.json" >/dev/null 2>&1; then
    aws s3 cp "${src}/build-info.json" "${dst}/build-info.json" --only-show-errors \
      --metadata-directive REPLACE --cache-control "$NO_CACHE" --content-type "application/json"
  fi
  echo "Removing objects not present in ${src}"
  aws s3 sync "${src}/" "${dst}/" --delete --only-show-errors
}

cmd_diff() {
  local src="${1:?source s3 uri required}"
  aws s3 sync "${src%/}/" "$(prod_uri)/" --delete --dryrun
}

cmd_invalidate() {
  [[ -n "${PROD_DISTRIBUTION_ID:-}" ]] || die "PROD_DISTRIBUTION_ID is not set; run 'resolve' first"
  local inv
  inv=$(aws cloudfront create-invalidation --distribution-id "$PROD_DISTRIBUTION_ID" \
    --paths "/*" --query 'Invalidation.Id' --output text)
  echo "Invalidation ${inv} created on ${PROD_DISTRIBUTION_ID}; waiting..."
  aws cloudfront wait invalidation-completed --distribution-id "$PROD_DISTRIBUTION_ID" --id "$inv" \
    || echo "::warning::Timed out waiting for invalidation ${inv}; verification may retry"
}

cmd_verify() {
  local src="${1:?source s3 uri required}" expected actual attempt
  expected=$(aws s3 cp "${src%/}/index.html" - | sha256sum | cut -d' ' -f1)
  for attempt in 1 2 3 4 5 6 7 8 9 10; do
    actual=$({ curl -fsSL "https://${PROD_DOMAIN}/index.html" || true; } | sha256sum | cut -d' ' -f1)
    if [[ "$actual" == "$expected" ]]; then
      echo "https://${PROD_DOMAIN}/index.html matches ${src} (sha256 ${expected})"
      return 0
    fi
    echo "Attempt ${attempt}: served index.html does not match yet; retrying in 30s"
    sleep 30
  done
  die "https://${PROD_DOMAIN}/index.html does not match ${src} after invalidation"
}

cmd_list() {
  { aws s3 ls "s3://${RELEASES_BUCKET}/${SNAPSHOT_ROOT}/" 2>/dev/null || true; } \
    | awk '$1 == "PRE" { sub("/$", "", $2); print $2 }' | sort
}

cmd_prune() {
  local snapshots total id
  snapshots=$(cmd_list)
  total=$(grep -c . <<<"$snapshots" || true)
  if [[ "$total" -le "$KEEP_SNAPSHOTS" ]]; then
    echo "${total} snapshot(s) kept (limit ${KEEP_SNAPSHOTS})"
    return 0
  fi
  head -n "$((total - KEEP_SNAPSHOTS))" <<<"$snapshots" | while read -r id; do
    echo "Pruning snapshot ${id}"
    aws s3 rm "s3://${RELEASES_BUCKET}/${SNAPSHOT_ROOT}/${id}/" --recursive --only-show-errors
  done
}

command="${1:-}"
shift || true
case "$command" in
  resolve | snapshot | publish | diff | invalidate | verify | list | prune) "cmd_${command}" "$@" ;;
  *) die "Unknown command '${command}'. See header of $0 for usage." ;;
esac
