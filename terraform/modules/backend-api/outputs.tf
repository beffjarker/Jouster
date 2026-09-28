output "api_endpoint" {
  description = "Default execute-api endpoint for the HTTP API."
  value       = aws_apigatewayv2_api.this.api_endpoint
}

output "custom_domain_url" {
  description = "Custom domain URL for the API."
  value       = "https://${var.domain_name}"
}

output "function_name" {
  description = "Lambda function name."
  value       = aws_lambda_function.this.function_name
}

output "function_arn" {
  description = "Lambda function ARN."
  value       = aws_lambda_function.this.arn
}

output "live_alias_arn" {
  description = "ARN of the live Lambda alias (CodeDeploy traffic target)."
  value       = aws_lambda_alias.live.arn
}

output "lambda_exec_role_arn" {
  description = "Lambda execution role ARN."
  value       = aws_iam_role.lambda_exec.arn
}

output "codedeploy_app_name" {
  description = "CodeDeploy application name."
  value       = aws_codedeploy_app.this.name
}

output "codedeploy_deployment_group_name" {
  description = "CodeDeploy deployment group name."
  value       = aws_codedeploy_deployment_group.this.deployment_group_name
}

output "alarm_names" {
  description = "CloudWatch alarm names wired to auto-rollback."
  value = [
    aws_cloudwatch_metric_alarm.lambda_errors.alarm_name,
    aws_cloudwatch_metric_alarm.lambda_duration.alarm_name,
    aws_cloudwatch_metric_alarm.apigw_5xx.alarm_name,
  ]
}

