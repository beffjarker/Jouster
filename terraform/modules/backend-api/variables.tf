variable "environment" {
  description = "Environment name (e.g. nonprod, prod)."
  type        = string
}

variable "function_name" {
  description = "Lambda function name; also used as the base name for related resources."
  type        = string
}

# ----- Lambda packaging -----

variable "lambda_zip_path" {
  description = "Path to the built Lambda deployment package (.zip)."
  type        = string
}

variable "lambda_handler" {
  description = "Lambda handler entrypoint."
  type        = string
  default     = "lambda.handler"
}

variable "lambda_runtime" {
  description = "Lambda runtime."
  type        = string
  default     = "nodejs20.x"
}

variable "lambda_memory_size" {
  description = "Lambda memory (MB)."
  type        = number
  default     = 256
}

variable "lambda_timeout" {
  description = "Lambda timeout (seconds)."
  type        = number
  default     = 15
}

variable "lambda_env_vars" {
  description = "Non-secret environment variables for the Lambda."
  type        = map(string)
  default     = {}
}

# ----- IAM scoping (least privilege per env) -----

variable "life_map_table_name" {
  description = "DynamoDB life-map table this function may access."
  type        = string
}

variable "sessions_table_name" {
  description = "DynamoDB sessions table this function may access."
  type        = string
}

variable "images_bucket_name" {
  description = "S3 bucket holding life-map images."
  type        = string
}

variable "images_prefix" {
  description = "Object key prefix (with trailing wildcard) the function may read/write in the images bucket."
  type        = string
  default     = "life-map/images/*"
}

variable "secret_arns" {
  description = "Secrets Manager ARNs the function may read (e.g. SESSION_SECRET, password hash, API keys)."
  type        = list(string)
  default     = []
}

# ----- Blue/green (CodeDeploy) -----

variable "deployment_config_name" {
  description = "CodeDeploy traffic-shift config (e.g. CodeDeployDefault.LambdaCanary10Percent5Minutes for prod, CodeDeployDefault.LambdaAllAtOnce for nonprod)."
  type        = string
}

# ----- API Gateway / custom domain -----

variable "domain_name" {
  description = "Custom domain for the HTTP API (e.g. api-nonprod.jouster.org)."
  type        = string
}

variable "acm_certificate_arn" {
  description = "Regional ACM certificate ARN (same region as the API) for the custom domain."
  type        = string
}

variable "route53_zone_id" {
  description = "Route53 hosted zone ID for the domain."
  type        = string
}

variable "throttling_burst_limit" {
  description = "HTTP API stage burst throttle limit."
  type        = number
  default     = 50
}

variable "throttling_rate_limit" {
  description = "HTTP API stage steady-state throttle limit (req/s)."
  type        = number
  default     = 100
}

# ----- Observability / alarms (also drive auto-rollback) -----

variable "alarm_error_threshold" {
  description = "Lambda Errors (Sum/min) alarm threshold."
  type        = number
  default     = 5
}

variable "alarm_duration_threshold_ms" {
  description = "Lambda Duration p99 alarm threshold (ms)."
  type        = number
  default     = 5000
}

variable "alarm_5xx_threshold" {
  description = "API Gateway 5xx (Sum/min) alarm threshold."
  type        = number
  default     = 5
}

variable "log_retention_days" {
  description = "CloudWatch log retention (days)."
  type        = number
  default     = 30
}

variable "tracing_mode" {
  description = "Lambda X-Ray tracing mode (Active or PassThrough)."
  type        = string
  default     = "Active"
}

variable "tags" {
  description = "Additional tags applied to module resources (merged with provider default_tags)."
  type        = map(string)
  default     = {}
}

