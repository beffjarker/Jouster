# QA HTTPS (qa.jouster.org)

**Status:** QA is served only over HTTPS through CloudFront; every HTTP URL redirects to HTTPS.

## How it works

S3 static website endpoints only support HTTP, so the QA bucket is private and fronted by a CloudFront
distribution managed by `.github/workflows/qa-deploy.yml` on every `main` deploy:

1. **Ensure QA CloudFront distribution** – reuses the distribution whose alias is `qa.jouster.org`,
   otherwise creates one with:
   - origin `qa.jouster.org.s3.us-west-2.amazonaws.com` (S3 REST endpoint) read through the shared
     `jouster-s3-oac` Origin Access Control
   - viewer protocol policy `redirect-to-https`
   - the existing `*.jouster.org` ACM certificate (us-east-1), SNI, TLS 1.2+
   - managed `CachingOptimized` cache policy and `SecurityHeadersPolicy` (HSTS etc.)
   - 403 and 404 → `/index.html` (200) for SPA deep links (a private bucket answers 403 for missing keys)
2. **Serve QA over HTTPS only** – runs `.github/scripts/s3-origin-https.sh secure qa.jouster.org qa.jouster.org`
   (see [Private S3 origins](#private-s3-origins-s3-origin-httpssh)).
3. **Point qa.jouster.org at CloudFront** – replaces the legacy CNAME to the S3 website endpoint with
   Route 53 A/AAAA alias records to the distribution.
4. **Invalidate QA CloudFront cache** – `/*` after each sync so new builds appear immediately.

All steps are idempotent.

## Private S3 origins (`s3-origin-https.sh`)

`.github/scripts/s3-origin-https.sh secure <bucket> <https-host>` is shared by the preview, QA and
**Secure Frontend Origins (HTTPS only)** workflows. For every CloudFront distribution that uses the bucket it:

1. Refuses to continue if a behavior for the bucket forwards the `Host` header (S3 REST would reject it).
2. Switches the origin from the S3 website endpoint to the S3 REST endpoint with the `jouster-s3-oac`
   Origin Access Control, and adds the SPA 403/404 → `/index.html` rules.
3. Keeps public read during the switch (no downtime), then fetches a probe object through CloudFront that
   only OAC-signed requests may read. If the probe fails, the distributions and bucket policy are restored.
4. Removes public read, turns on S3 Block Public Access, and changes the S3 website endpoint into a
   permanent redirect to `https://<https-host>`.

Set `DRY_RUN=true` to print the planned changes without applying them.

`s3-origin-https.sh retire <bucket> <https-host>` is for a leftover bucket that no CloudFront distribution
uses (it refuses otherwise). It removes public read, turns on S3 Block Public Access and redirects the website
endpoint to `https://<https-host>`, then checks that anonymous S3 reads return 403.

## Required permissions (QA deploy credentials)

- `cloudfront:ListDistributions`, `cloudfront:CreateDistribution`, `cloudfront:GetDistribution`,
  `cloudfront:GetDistributionConfig`, `cloudfront:UpdateDistribution`, `cloudfront:CreateInvalidation`,
  `cloudfront:ListOriginAccessControls`, `cloudfront:CreateOriginAccessControl`
- `s3:GetBucketLocation`, `s3:GetBucketPolicy`, `s3:PutBucketPolicy`, `s3:DeleteBucketPolicy`,
  `s3:GetBucketPublicAccessBlock`, `s3:PutBucketPublicAccessBlock`, `s3:GetBucketWebsite`,
  `s3:PutBucketWebsite`, `s3:PutObject`, `s3:DeleteObject`
- `acm:ListCertificates` (us-east-1)
- `route53:ListHostedZonesByName`, `route53:ListResourceRecordSets`, `route53:ChangeResourceRecordSets`

## Verify

```bash
curl -I http://qa.jouster.org     # expect 301 Location: https://qa.jouster.org/
curl -I https://qa.jouster.org    # expect 200, Via: ... (CloudFront)
curl -I http://qa.jouster.org.s3-website-us-west-2.amazonaws.com/   # expect 301 Location: https://qa.jouster.org/
```

## Known limitation

The QA build uses the production configuration, so API calls target `https://jouster.org/api`,
which has no backend. Public pages work; login and Life Map editing need a QA API.