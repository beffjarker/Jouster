variable "aws_region" {
  description = "AWS region for the nonprod backend."
  type        = string
  default     = "us-west-2"
}

variable "environment" {
  description = "Environment name."
  type        = string
  default     = "nonprod"
}

variable "lambda_zip_path" {
  description = "Path to the built Lambda deployment package (.zip)."
  type        = string
}

variable "life_map_table_name" {
  description = "DynamoDB life-map table (nonprod / fake data)."
  type        = string
  default     = "jouster-life-map-nonprod"
}

variable "sessions_table_name" {
  description = "DynamoDB sessions table (nonprod)."
  type        = string
  default     = "jouster-sessions-nonprod"
}

variable "images_bucket_name" {
  description = "S3 bucket holding life-map images (nonprod)."
  type        = string
}

variable "secret_arns" {
  description = "Secrets Manager ARNs the function may read."
  type        = list(string)
  default     = []
}

variable "domain_name" {
  description = "Custom API domain."
  type        = string
  default     = "api-nonprod.jouster.org"
}

variable "acm_certificate_arn" {
  description = "Regional ACM certificate ARN (us-west-2) for the custom domain."
  type        = string
}

variable "route53_zone_id" {
  description = "Route53 hosted zone ID for jouster.org."
  type        = string
}

variable "deploy_id" {
  description = "Observable deploy marker surfaced on /health (DEPLOY_ID)."
  type        = string
  default     = "nonprod"
}

variable "git_sha" {
  description = "Git SHA surfaced on /health (GIT_SHA)."
  type        = string
  default     = "dev"
}

