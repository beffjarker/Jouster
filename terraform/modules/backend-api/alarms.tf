# These alarms double as the CodeDeploy auto-rollback triggers (see codedeploy.tf).
# Any alarm entering ALARM during a blue/green shift aborts the deploy and reverts
# traffic to the previous (blue) Lambda version.

resource "aws_cloudwatch_metric_alarm" "lambda_errors" {
  alarm_name          = "${var.function_name}-errors"
  alarm_description   = "Lambda function errors on the live alias"
  namespace           = "AWS/Lambda"
  metric_name         = "Errors"
  statistic           = "Sum"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  threshold           = var.alarm_error_threshold
  evaluation_periods  = 1
  period              = 60
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.this.function_name
    Resource     = "${aws_lambda_function.this.function_name}:${aws_lambda_alias.live.name}"
  }

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "lambda_duration" {
  alarm_name          = "${var.function_name}-duration-p99"
  alarm_description   = "Lambda p99 duration on the live alias"
  namespace           = "AWS/Lambda"
  metric_name         = "Duration"
  extended_statistic  = "p99"
  comparison_operator = "GreaterThanThreshold"
  threshold           = var.alarm_duration_threshold_ms
  evaluation_periods  = 1
  period              = 60
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.this.function_name
    Resource     = "${aws_lambda_function.this.function_name}:${aws_lambda_alias.live.name}"
  }

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "apigw_5xx" {
  alarm_name          = "${var.function_name}-apigw-5xx"
  alarm_description   = "HTTP API 5xx responses"
  namespace           = "AWS/ApiGateway"
  metric_name         = "5xx"
  statistic           = "Sum"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  threshold           = var.alarm_5xx_threshold
  evaluation_periods  = 1
  period              = 60
  treat_missing_data  = "notBreaching"

  dimensions = {
    ApiId = aws_apigatewayv2_api.this.id
    Stage = aws_apigatewayv2_stage.default.name
  }

  tags = var.tags
}

