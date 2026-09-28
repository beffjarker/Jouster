# CloudWatch log group for the function (created ahead of the function so the
# retention policy is applied from the start).
resource "aws_cloudwatch_log_group" "lambda" {
  name              = "/aws/lambda/${var.function_name}"
  retention_in_days = var.log_retention_days
  tags              = var.tags
}

# The Express app packaged for Lambda via serverless-http (apps/backend/lambda.js).
# publish = true creates an immutable version on every code change; the `live`
# alias is what API Gateway invokes and what CodeDeploy shifts traffic on.
resource "aws_lambda_function" "this" {
  function_name    = var.function_name
  role             = aws_iam_role.lambda_exec.arn
  handler          = var.lambda_handler
  runtime          = var.lambda_runtime
  filename         = var.lambda_zip_path
  source_code_hash = filebase64sha256(var.lambda_zip_path)
  memory_size      = var.lambda_memory_size
  timeout          = var.lambda_timeout
  publish          = true

  environment {
    variables = var.lambda_env_vars
  }

  tracing_config {
    mode = var.tracing_mode
  }

  depends_on = [
    aws_iam_role_policy_attachment.lambda_basic,
    aws_cloudwatch_log_group.lambda,
  ]

  tags = var.tags
}

# Stable alias invoked by the HTTP API. CodeDeploy updates the alias routing /
# version during a blue/green deploy, so ignore drift Terraform would otherwise
# try to revert.
resource "aws_lambda_alias" "live" {
  name             = "live"
  function_name    = aws_lambda_function.this.function_name
  function_version = aws_lambda_function.this.version

  lifecycle {
    ignore_changes = [function_version, routing_config]
  }
}

