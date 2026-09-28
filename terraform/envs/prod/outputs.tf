output "api_endpoint" {
  description = "Default execute-api endpoint."
  value       = module.backend_api.api_endpoint
}

output "custom_domain_url" {
  description = "Custom domain URL (https://api.jouster.org)."
  value       = module.backend_api.custom_domain_url
}

output "function_name" {
  value = module.backend_api.function_name
}

output "codedeploy_app_name" {
  value = module.backend_api.codedeploy_app_name
}

output "codedeploy_deployment_group_name" {
  value = module.backend_api.codedeploy_deployment_group_name
}

output "alarm_names" {
  value = module.backend_api.alarm_names
}

