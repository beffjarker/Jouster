# QA HTTPS (qa.jouster.org)

**Status:** QA is served over HTTPS through CloudFront; HTTP redirects to HTTPS.

## How it works

S3 static website endpoints only support HTTP, so the QA bucket is fronted by a CloudFront
distribution managed by `.github/workflows/qa-deploy.yml` on every `develop` deploy:

1. **Ensure QA CloudFront distribution** – reuses the distribution whose alias is `qa.jouster.org`,
   otherwise creates one with:
   - origin `qa.jouster.org.s3-website-us-west-2.amazonaws.com` (HTTP only, keeps S3 index/error routing)
   - viewer protocol policy `redirect-to-https`
   - the existing `*.jouster.org` ACM certificate (us-east-1), SNI, TLS 1.2+
   - managed `CachingOptimized` cache policy and `SecurityHeadersPolicy` (HSTS etc.)
   - 404 → `/index.html` (200) for SPA deep links
2. **Point qa.jouster.org at CloudFront** – replaces the legacy CNAME to the S3 website endpoint with
   Route 53 A/AAAA alias records to the distribution.
3. **Invalidate QA CloudFront cache** – `/*` after each sync so new builds appear immediately.

All steps are idempotent. A newly created distribution takes roughly 5–15 minutes to deploy globally;
the workflow waits for it to reach `Deployed` before switching DNS, so QA stays reachable over HTTP until then.

## Required permissions (QA deploy credentials)

- `cloudfront:ListDistributions`, `cloudfront:CreateDistribution`, `cloudfront:GetDistribution`,
  `cloudfront:CreateInvalidation`
- `acm:ListCertificates` (us-east-1)
- `route53:ListHostedZonesByName`, `route53:ListResourceRecordSets`, `route53:ChangeResourceRecordSets`

## Verify

```bash
curl -I http://qa.jouster.org     # expect 301 Location: https://qa.jouster.org/
curl -I https://qa.jouster.org    # expect 200, Via: ... (CloudFront)
```

## Known limitation

The QA build uses the production configuration, so API calls target `https://jouster.org/api`,
which has no backend. Public pages work; login and Life Map editing need a QA API.