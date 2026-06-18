# CodeDeploy application + deployment group that perform blue/green traffic
# shifting on the Lambda `live` alias. The actual deployment (registering a new
# version and creating the deployment) is triggered from CI at deploy time; this
# only provisions the app, group, traffic-shift config, and rollback wiring.

resource "aws_codedeploy_app" "this" {
  name             = var.function_name
  compute_platform = "Lambda"
}

resource "aws_codedeploy_deployment_group" "this" {
  app_name               = aws_codedeploy_app.this.name
  deployment_group_name  = "${var.function_name}-dg"
  service_role_arn       = aws_iam_role.codedeploy.arn
  deployment_config_name = var.deployment_config_name

  deployment_style {
    deployment_option = "WITH_TRAFFIC_CONTROL"
    deployment_type   = "BLUE_GREEN"
  }

  auto_rollback_configuration {
    enabled = true
    events  = ["DEPLOYMENT_FAILURE", "DEPLOYMENT_STOP_ON_ALARM"]
  }

  alarm_configuration {
    enabled = true
    alarms = [
      aws_cloudwatch_metric_alarm.lambda_errors.alarm_name,
      aws_cloudwatch_metric_alarm.lambda_duration.alarm_name,
      aws_cloudwatch_metric_alarm.apigw_5xx.alarm_name,
    ]
  }
}

