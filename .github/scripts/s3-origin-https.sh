#!/usr/bin/env bash
# Serve an S3-hosted frontend only through CloudFront over HTTPS.
#
# S3 website endpoints are HTTP-only and public, so a bucket used that way can always be read
# over plain HTTP, bypassing CloudFront. This script moves a bucket to the private S3 REST
# endpoint, read by CloudFront through Origin Access Control (OAC), and turns the bucket's
# website endpoint into a permanent redirect to the HTTPS domain.
#
# Usage: s3-origin-https.sh <command> [args]
#   oac                      Print the shared OAC ID, creating it if it doesn't exist.
#   secure <bucket> <host>   Lock <bucket> to the CloudFront distributions that use it as an origin:
#                              1. Switch each bucket origin to the REST endpoint signed with the shared
#                                 OAC; add 403/404 -> /index.html SPA rules and DefaultRootObject; attach the
#                                 managed SecurityHeadersPolicy (HSTS etc.) to bucket behaviors that have no
#                                 response headers policy.
#                              2. Prove each switched distribution reads through OAC (probe object
#                                 that anonymous requests are denied); roll back if it doesn't.
#                              3. Replace public-read policy statements with an OAC-only grant and
#                                 turn S3 Block Public Access fully on.
#                              4. Redirect the website endpoint (HTTP) to https://<host>, then verify.
#   retire <bucket> <host>   For a leftover bucket that no CloudFront distribution uses: remove public-read
#                            policy statements, turn S3 Block Public Access fully on, and redirect the
#                            website endpoint (HTTP) to https://<host>. Refuses if a distribution uses it.
#
# Env: DRY_RUN=true          Report what would change; change nothing.
#      ENSURE_ENABLED=true   Also re-enable disabled distributions (used by PR previews).
#      OAC_NAME              Shared OAC name (default jouster-s3-oac).
# Requires: aws CLI v2, jq, curl. Safe to re-run; each step is idempotent.
set -euo pipefail

: "${OAC_NAME:=jouster-s3-oac}"
: "${DRY_RUN:=false}"
: "${ENSURE_ENABLED:=false}"

OAC_SID="AllowCloudFrontOAC"
PROBE_SID="DenyOriginCheckUnlessCloudFront"
PROBE_PREFIX=".origin-check"
# Managed origin request policies that forward the viewer Host header, which S3 REST + OAC rejects.
ALL_VIEWER_POLICIES='["216adef6-5c7f-47e4-b989-5492eafa07d3","33f36d7e-f396-46d9-90e0-52428a34d9dc"]'
# Managed SecurityHeadersPolicy: HSTS (max-age=31536000), nosniff, SAMEORIGIN frames, referrer policy.
SECURITY_HEADERS_POLICY="67f7725c-6f97-4210-82d7-5512b31e9d03"

WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

die() { echo "::error::$*" >&2; exit 1; }
log() { echo "$*" >&2; }
is_dry() { [[ "$DRY_RUN" == "true" ]]; }

find_oac() {
  aws cloudfront list-origin-access-controls \
    --query "OriginAccessControlList.Items[?Name=='${OAC_NAME}'].Id | [0]" --output text
}

cmd_oac() {
  local id
  id=$(find_oac)
  if [[ -z "$id" || "$id" == "None" ]]; then
    is_dry && { log "Would create OAC ${OAC_NAME}"; echo "(new-oac)"; return 0; }
    # Shared by every distribution; a concurrent run may create it first, so re-read on failure.
    aws cloudfront create-origin-access-control --origin-access-control-config \
      "Name=${OAC_NAME},Description=Jouster private S3 origins,SigningProtocol=sigv4,SigningBehavior=always,OriginAccessControlOriginType=s3" \
      >/dev/null || true
    id=$(find_oac)
  fi
  [[ -n "$id" && "$id" != "None" ]] || die "Could not find or create CloudFront OAC ${OAC_NAME}"
  echo "$id"
}

# Prints the desired DistributionConfig for $1 (a get-distribution-config response).
desired_config() {
  jq --argjson domains "$DOMAINS" --arg rest "$REST" --arg oac "$OAC_ID" --arg headers "$SECURITY_HEADERS_POLICY" \
    --argjson enable "$([[ "$ENSURE_ENABLED" == "true" ]] && echo true || echo false)" '
    def in_bucket: .DomainName as $d | any($domains[]; . == $d);
    .DistributionConfig
    | .Origins.Items |= map(if in_bucket then
        del(.CustomOriginConfig) + {
          DomainName: $rest,
          S3OriginConfig: ((.S3OriginConfig // {}) + { OriginAccessIdentity: "" }),
          OriginAccessControlId: $oac
        } else . end)
    | .DefaultCacheBehavior.TargetOriginId as $t
    | if any(.Origins.Items[]; .Id == $t and .DomainName == $rest) then
        # Without ListBucket, S3 REST returns 403 (not 404) for missing keys, so both map to the SPA.
        ((.CustomErrorResponses.Items // []) as $e
          | .CustomErrorResponses.Items = $e + ([403, 404] - ($e | map(.ErrorCode))
              | map({ ErrorCode: ., ResponsePagePath: "/index.html", ResponseCode: "200", ErrorCachingMinTTL: 10 })))
        | .CustomErrorResponses.Quantity = (.CustomErrorResponses.Items | length)
        | if (.DefaultRootObject // "") == "" then .DefaultRootObject = "index.html" else . end
      else . end
    | [.Origins.Items[] | select(.DomainName == $rest) | .Id] as $bucketIds
    | def with_headers:
        if (.TargetOriginId as $t | $bucketIds | index($t)) and (.ResponseHeadersPolicyId // "") == ""
        then .ResponseHeadersPolicyId = $headers else . end;
      .DefaultCacheBehavior |= with_headers
    | if .CacheBehaviors.Items then .CacheBehaviors.Items |= map(with_headers) else . end
    | if $enable then .Enabled = true else . end' "$1"
}

# Fails if a behavior that targets the bucket forwards the viewer Host header (breaks S3 REST + OAC).
check_host_forwarding() {
  local bad
  bad=$(jq -r --argjson domains "$DOMAINS" --argjson allViewer "$ALL_VIEWER_POLICIES" '
    .DistributionConfig as $c
    | [$c.Origins.Items[] | select(.DomainName as $d | any($domains[]; . == $d)) | .Id] as $ids
    | [$c.DefaultCacheBehavior, ($c.CacheBehaviors.Items // [])[]]
    | map(select(.TargetOriginId as $t | $ids | index($t))
        | select((.ForwardedValues.Headers.Items // [] | any(. == "Host" or . == "*"))
            or ((.OriginRequestPolicyId // "") as $p | $allViewer | index($p))))
    | map(.PathPattern // "default") | join(", ")' "$1")
  [[ -z "$bad" ]] || die "Distribution $2 forwards the Host header to the bucket (${bad}); S3 REST + OAC would reject it"
}

# jq definitions shared by the policy builders. public_read matches statements that let anyone read objects.
POLICY_JQ_DEFS='
  def as_list: if type == "array" then . else [.] end;
  def public_read:
    .Effect == "Allow"
    and (.Principal == "*" or (.Principal | type == "object" and ((.AWS // null) | as_list | index("*"))))
    and (.Action | as_list | any(. == "s3:GetObject" or . == "s3:*" or . == "*"));
'

# Prints a bucket policy built from the current one: statements this script manages are replaced,
# public s3:GetObject grants are kept only when $1 == true (transition), and the probe deny is
# added when $2 == true.
build_policy() {
  jq --arg bucket "$BUCKET" --argjson arns "$DIST_ARNS" --argjson keepPublic "$1" --argjson probe "$2" \
    --arg oacSid "$OAC_SID" --arg probeSid "$PROBE_SID" --arg prefix "$PROBE_PREFIX" "${POLICY_JQ_DEFS}"'
    {
      Version: "2012-10-17",
      Statement: (
        [(.Statement // [])[] | select(.Sid != $oacSid and .Sid != $probeSid)
          | select($keepPublic or (public_read | not))]
        + [{
            Sid: $oacSid,
            Effect: "Allow",
            Principal: { Service: "cloudfront.amazonaws.com" },
            Action: "s3:GetObject",
            Resource: "arn:aws:s3:::\($bucket)/*",
            Condition: { StringEquals: { "AWS:SourceArn": $arns } }
          }]
        + (if $probe then [{
            Sid: $probeSid,
            Effect: "Deny",
            Principal: "*",
            Action: "s3:GetObject",
            Resource: "arn:aws:s3:::\($bucket)/\($prefix)/*",
            Condition: { StringNotEquals: { "AWS:SourceArn": $arns } }
          }] else [] end)
      )
    }' "$WORK/policy.orig.json"
}

put_policy() {
  aws s3api put-bucket-policy --bucket "$BUCKET" --policy "file://$1"
}

restore_and_die() {
  local id etag
  log "Rolling back: restoring previous distribution configs and bucket policy"
  for id in "${UPDATED[@]}"; do
    etag=$(aws cloudfront get-distribution-config --id "$id" --query ETag --output text)
    aws cloudfront update-distribution --id "$id" --if-match "$etag" \
      --distribution-config "file://$WORK/${id}.orig.json" >/dev/null || log "::warning::Rollback of $id failed"
  done
  if [[ "$HAD_POLICY" == "true" ]]; then
    aws s3api put-bucket-policy --bucket "$BUCKET" --policy "file://$WORK/policy.raw.json" || true
  else
    aws s3api delete-bucket-policy --bucket "$BUCKET" || true
  fi
  die "$1"
}

# Uploads an object that only CloudFront (via OAC) may read, then fetches it through each
# distribution. Proves the OAC origin works before public access is removed.
probe_distributions() {
  local token id cf_domain origin_path key body attempt ok
  token="${GITHUB_RUN_ID:-local}-$(date +%s)-${RANDOM}"
  for id in "${DIST_IDS[@]}"; do
    read -r cf_domain origin_path < <(aws cloudfront get-distribution --id "$id" --output json | jq -r --arg rest "$REST" '
      .Distribution as $d | $d.DistributionConfig as $c
      | ($c.Origins.Items[] | select(.Id == $c.DefaultCacheBehavior.TargetOriginId)) as $o
      | "\($d.DomainName) \(if $o.DomainName == $rest then ($o.OriginPath // "") else "-" end)"')
    if [[ "$origin_path" == "-" ]]; then
      log "::warning::Distribution $id default behavior does not target ${BUCKET}; not probed"
      continue
    fi
    key="${origin_path#/}"
    key="${key:+${key%/}/}${PROBE_PREFIX}/${token}.txt"
    echo "$token" | aws s3 cp - "s3://${BUCKET}/${key}" --cache-control no-store --only-show-errors
    ok=false
    for attempt in 1 2 3 4 5 6 7 8 9 10; do
      body=$(curl -fsS --max-time 15 "https://${cf_domain}/${PROBE_PREFIX}/${token}.txt" 2>/dev/null || true)
      if [[ "$body" == "$token" ]]; then ok=true; break; fi
      log "Probe ${attempt}: ${cf_domain} did not return the probe object yet; retrying in 20s"
      sleep 20
    done
    aws s3 rm "s3://${BUCKET}/${key}" --only-show-errors || true
    [[ "$ok" == "true" ]] || restore_and_die "Distribution $id could not read ${BUCKET} through OAC"
    log "Distribution $id reads ${BUCKET} through OAC"
  done
}

verify_https_only() {
  local website="http://${BUCKET}.s3-website-${REGION}.amazonaws.com" location code attempt
  for attempt in 1 2 3 4 5 6; do
    location=$(curl -sS -o /dev/null --max-time 15 -w '%{http_code} %{redirect_url}' "${website}/" || true)
    [[ "$location" == "301 https://${HOST}/" ]] && break
    log "Website endpoint check ${attempt}: got '${location}'; retrying in 10s"
    sleep 10
  done
  [[ "$location" == "301 https://${HOST}/" ]] || die "${website}/ returned '${location}', expected '301 https://${HOST}/'"
  log "${website}/ -> 301 https://${HOST}/"

  code=$(curl -sS -o /dev/null --max-time 15 -w '%{http_code}' "https://${HOST}/" || true)
  if [[ "$code" == "200" ]]; then
    log "https://${HOST}/ -> 200"
    if curl -sSI --max-time 15 "https://${HOST}/" 2>/dev/null | grep -qi '^strict-transport-security:'; then
      log "https://${HOST}/ sends Strict-Transport-Security"
    else
      log "::warning::https://${HOST}/ does not send Strict-Transport-Security"
    fi
  else
    # DNS for a new preview may not point at CloudFront yet; the caller verifies the domain later.
    log "::warning::https://${HOST}/ returned ${code}"
  fi
}

# Sets REGION, REST and DOMAINS (every S3 endpoint a CloudFront origin may use) for $BUCKET.
bucket_endpoints() {
  REGION=$(aws s3api get-bucket-location --bucket "$BUCKET" --query LocationConstraint --output text)
  [[ -n "$REGION" && "$REGION" != "None" && "$REGION" != "null" ]] || REGION="us-east-1"
  REST="${BUCKET}.s3.${REGION}.amazonaws.com"
  DOMAINS=$(jq -cn --arg b "$BUCKET" --arg r "$REGION" \
    '["\($b).s3-website-\($r).amazonaws.com", "\($b).s3-website.\($r).amazonaws.com",
      "\($b).s3.\($r).amazonaws.com", "\($b).s3.amazonaws.com"]')
}

# Sets DIST_IDS to the CloudFront distributions that have an origin on $BUCKET.
find_distributions() {
  aws cloudfront list-distributions --output json > "$WORK/dists.json"
  mapfile -t DIST_IDS < <(jq -r --argjson domains "$DOMAINS" '
    (.DistributionList.Items // [])[]
    | select(any(.Origins.Items[]; .DomainName as $d | any($domains[]; . == $d))) | .Id' "$WORK/dists.json")
}

# Saves the bucket policy to policy.raw.json and policy.orig.json ({} if none) and sets HAD_POLICY.
read_policy() {
  if aws s3api get-bucket-policy --bucket "$BUCKET" --query Policy --output text > "$WORK/policy.raw.json" 2>"$WORK/policy.err"; then
    HAD_POLICY=true
    cp "$WORK/policy.raw.json" "$WORK/policy.orig.json"
  elif grep -q NoSuchBucketPolicy "$WORK/policy.err"; then
    HAD_POLICY=false
    echo '{}' > "$WORK/policy.orig.json"
  else
    cat "$WORK/policy.err" >&2
    die "Could not read the bucket policy of ${BUCKET}"
  fi
}

# Turns S3 Block Public Access fully on and makes the website endpoint (HTTP) redirect to https://$HOST.
block_public_and_redirect() {
  aws s3api put-public-access-block --bucket "$BUCKET" --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

  log "Redirecting the S3 website endpoint (HTTP) to https://${HOST}..."
  jq -n --arg host "$HOST" '{ RedirectAllRequestsTo: { HostName: $host, Protocol: "https" } }' > "$WORK/website.json"
  aws s3api put-bucket-website --bucket "$BUCKET" --website-configuration "file://$WORK/website.json"
}

log_current_access() {
  log "Bucket policy now:"; jq . "$WORK/policy.orig.json" >&2
  log "Bucket policy after:"; jq . "$WORK/policy.final.json" >&2
  log "Block Public Access now:"
  aws s3api get-public-access-block --bucket "$BUCKET" --output json >&2 2>/dev/null || log "(not set)"
  log "Website configuration now:"
  aws s3api get-bucket-website --bucket "$BUCKET" --output json >&2 2>/dev/null || log "(not set)"
}

cmd_secure() {
  BUCKET="${1:?bucket required}"
  HOST="${2:?https host required}"
  local id etag needs

  bucket_endpoints
  OAC_ID=$(cmd_oac)
  local account
  account=$(aws sts get-caller-identity --query Account --output text)

  local attempt
  for attempt in 1 2 3 4 5 6; do
    find_distributions
    # A distribution created moments ago can take a few seconds to appear in the list.
    [[ "${#DIST_IDS[@]}" -gt 0 ]] && break
    [[ "$attempt" -lt 6 ]] && { log "No distribution uses ${BUCKET} yet; retrying in 10s"; sleep 10; }
  done
  [[ "${#DIST_IDS[@]}" -gt 0 ]] || die "No CloudFront distribution uses ${BUCKET} as an origin"
  DIST_ARNS=$(printf '%s\n' "${DIST_IDS[@]}" \
    | jq -R --arg a "$account" '"arn:aws:cloudfront::\($a):distribution/\(.)"' | jq -cs .)
  log "Bucket ${BUCKET} (${REGION}) is an origin of: ${DIST_IDS[*]}"

  read_policy

  UPDATED=()
  for id in "${DIST_IDS[@]}"; do
    aws cloudfront get-distribution-config --id "$id" --output json > "$WORK/${id}.current.json"
    check_host_forwarding "$WORK/${id}.current.json" "$id"
    jq '.DistributionConfig' "$WORK/${id}.current.json" > "$WORK/${id}.orig.json"
    desired_config "$WORK/${id}.current.json" > "$WORK/${id}.desired.json"
    needs=$(jq -n --slurpfile a "$WORK/${id}.orig.json" --slurpfile b "$WORK/${id}.desired.json" '$a[0] != $b[0]')
    if [[ "$needs" == "true" ]]; then
      log "Distribution $id needs updating (private OAC origin, SPA errors, or security headers). Changes:"
      diff <(jq -S . "$WORK/${id}.orig.json") <(jq -S . "$WORK/${id}.desired.json") >&2 || true
      UPDATED+=("$id")
    else
      log "Distribution $id already reads ${BUCKET} through OAC with security headers"
    fi
  done

  if is_dry; then
    build_policy false false > "$WORK/policy.final.json"
    log_current_access
    log "Dry run: would update ${#UPDATED[@]} distribution(s), lock the bucket to OAC, turn Block Public Access on,"
    log "and redirect http://${BUCKET}.s3-website-${REGION}.amazonaws.com to https://${HOST}."
    return 0
  fi

  if [[ "${#UPDATED[@]}" -gt 0 ]]; then
    # Keep public read while CloudFront switches origins so the site never 403s mid-rollout.
    build_policy true true > "$WORK/policy.transition.json"
    put_policy "$WORK/policy.transition.json"
    for id in "${UPDATED[@]}"; do
      etag=$(jq -r '.ETag' "$WORK/${id}.current.json")
      aws cloudfront update-distribution --id "$id" --if-match "$etag" \
        --distribution-config "file://$WORK/${id}.desired.json" >/dev/null
      log "Updated distribution $id; waiting for it to deploy..."
    done
    for id in "${UPDATED[@]}"; do
      aws cloudfront wait distribution-deployed --id "$id"
    done
    probe_distributions
  fi

  log "Locking ${BUCKET} to CloudFront (OAC only, Block Public Access on)..."
  build_policy false false > "$WORK/policy.final.json"
  put_policy "$WORK/policy.final.json"
  block_public_and_redirect

  verify_https_only
}

# Anonymous reads through the S3 REST API must be denied. Path-style URL: dotted bucket names fail TLS on
# virtual-hosted URLs.
verify_private() {
  local url="https://s3.${REGION}.amazonaws.com/${BUCKET}/index.html" code attempt
  for attempt in 1 2 3 4 5 6; do
    code=$(curl -sS -o /dev/null --max-time 15 -w '%{http_code}' "$url" || true)
    [[ "$code" == "403" ]] && break
    log "Private check ${attempt}: ${url} returned ${code}; retrying in 10s"
    sleep 10
  done
  [[ "$code" == "403" ]] || die "${url} returned ${code}, expected 403"
  log "${url} -> 403"
}

cmd_retire() {
  BUCKET="${1:?bucket required}"
  HOST="${2:?https host required}"

  bucket_endpoints
  find_distributions
  if [[ "${#DIST_IDS[@]}" -gt 0 ]]; then
    die "${BUCKET} is an origin of CloudFront distribution(s) ${DIST_IDS[*]}; use 'secure' instead"
  fi
  log "No CloudFront distribution uses ${BUCKET} (${REGION})"

  read_policy
  jq "${POLICY_JQ_DEFS}"'. + { Statement: [(.Statement // [])[] | select(public_read | not)] }' \
    "$WORK/policy.orig.json" > "$WORK/policy.final.json"
  local remaining
  remaining=$(jq '.Statement | length' "$WORK/policy.final.json")

  if is_dry; then
    log_current_access
    log "Dry run: would remove public read access (${remaining} policy statement(s) left), turn Block Public Access on,"
    log "and redirect http://${BUCKET}.s3-website-${REGION}.amazonaws.com to https://${HOST}."
    return 0
  fi

  log "Removing public read access from ${BUCKET}..."
  if [[ "$remaining" -gt 0 ]]; then
    put_policy "$WORK/policy.final.json"
  elif [[ "$HAD_POLICY" == "true" ]]; then
    aws s3api delete-bucket-policy --bucket "$BUCKET"
  fi
  block_public_and_redirect

  verify_https_only
  verify_private
}

command="${1:-}"
shift || true
case "$command" in
  oac | secure | retire) "cmd_${command}" "$@" ;;
  *) die "Unknown command '${command}'. See header of $0 for usage." ;;
esac
