# Module: `backend-api`

Reusable Terraform module that runs the Jouster Express backend
(`apps/backend`, packaged for Lambda via `apps/backend/lambda.js` + `serverless-http`)
as an **AWS Lambda** function behind an **API Gateway HTTP API (v2)**, with
**blue/green deployments** driven by **CodeDeploy** and **alarm-based auto-rollback**.

## What it creates

- `aws_lambda_function` (`publish = true`) + `aws_lambda_alias` **`live`**
- `aws_apigatewayv2_api` (HTTP) → integration to the `live` alias → `$default` route + `$default` stage
- Custom domain (`aws_apigatewayv2_domain_name` + api mapping + Route53 A/ALIAS)
- IAM: least-privilege Lambda execution role (DynamoDB life-map + sessions tables, S3 images prefix, optional Secrets Manager) and a CodeDeploy service role
- `aws_codedeploy_app` (Lambda) + deployment group (traffic-shift config + auto-rollback)
- CloudWatch log groups (Lambda + API GW) and 3 alarms (Lambda `Errors`, Lambda `Duration` p99, API GW `5xx`) wired to rollback

## Blue/green model

Lambda is published as immutable **versions**; the **`live` alias** is what the HTTP
API invokes. A deploy registers the new version with **CodeDeploy**, which shifts alias
traffic blue→green using `deployment_config_name`:

- **prod:** `CodeDeployDefault.LambdaCanary10Percent5Minutes`
- **nonprod:** `CodeDeployDefault.LambdaAllAtOnce`

Any wired alarm entering `ALARM` during the shift aborts the deploy and reverts to blue.

> The module provisions the pipeline; **creating the deployment** (new version +
> AppSpec) is done from CI at deploy time. CORS is owned by the Express app, not the API.

## Usage

```hcl
module "backend_api" {
  source = "../../modules/backend-api"

  environment            = "nonprod"
  function_name          = "jouster-backend-nonprod"
  lambda_zip_path        = "../../../dist/backend/backend-lambda.zip"
  deployment_config_name = "CodeDeployDefault.LambdaAllAtOnce"

  life_map_table_name = "jouster-life-map-nonprod"
  sessions_table_name = "jouster-sessions-nonprod"
  images_bucket_name  = "jouster-life-map-images-nonprod"
  secret_arns         = [var.session_secret_arn]

  lambda_env_vars = {
    NODE_ENV           = "nonprod"
    LIFE_MAP_TABLE_NAME = "jouster-life-map-nonprod"
    SESSION_STORE      = "dynamodb"
    SESSION_TABLE_NAME = "jouster-sessions-nonprod"
    S3_BUCKET_NAME     = "jouster-life-map-images-nonprod"
  }

  domain_name         = "api-nonprod.jouster.org"
  acm_certificate_arn = var.acm_certificate_arn # regional, same region as the API
  route53_zone_id     = var.route53_zone_id
}
```

## Notes

- `acm_certificate_arn` must be a **regional** certificate in the **same region** as the API.
- `lambda_zip_path` must exist at `plan`/`apply` time (built by CI or `npm` script).
  `terraform validate` does not read the file, so it passes without a built artifact.
- The `live` alias ignores `function_version`/`routing_config` drift so CodeDeploy owns cutover.

