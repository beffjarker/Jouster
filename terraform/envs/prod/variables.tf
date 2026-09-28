variable "aws_region" {
  description = "AWS region for the prod backend."
  type        = string
  default     = "us-west-2"
}

variable "environment" {
  description = "Environment name."
  type        = string
  default     = "prod"
}

variable "lambda_zip_path" {
  description = "Path to the built Lambda deployment package (.zip)."
  type        = string
}

variable "life_map_table_name" {
  description = "DynamoDB life-map table (prod / real data)."
  type        = string
  default     = "jouster-life-map-prod"
}

variable "sessions_table_name" {
  description = "DynamoDB sessions table (prod)."
  type        = string
  default     = "jouster-sessions-prod"
}

variable "images_bucket_name" {
  description = "S3 bucket holding life-map images (prod)."
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
  default     = "api.jouster.org"
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
  default     = "prod"
}

variable "git_sha" {
  description = "Git SHA surfaced on /health (GIT_SHA)."
  type        = string
  default     = "dev"
}

