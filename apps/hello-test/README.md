# Hello World Test App

This is a minimal hello-world test application for previewing the test.jouster.org branch. It demonstrates basic static content delivery with branch-aware deployment.

## Deploy

Deploy this app to S3 static hosting using:

```bash
AWS_PROFILE=jarvis-bedrock bash aws/scripts/deploy-test-app.sh [BRANCH]
```

If `BRANCH` is omitted, the current git branch is used. The branch name is sanitized to lowercase alphanumeric with dashes.

The script creates the S3 bucket and Route53 record if needed, then syncs the app to `s3://test.jouster.org/<branch>/`.

**Cleanup:** To remove a deployed branch prefix:

```bash
aws s3 rm s3://test.jouster.org/<branch>/ --recursive
```