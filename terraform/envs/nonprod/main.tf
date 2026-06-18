terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Reuses the existing Terraform state bucket; isolated key per environment.
  backend "s3" {
    bucket = "jouster-terraform-state"
    key    = "backend-api/nonprod/terraform.tfstate"
    region = "us-east-1"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "Jouster"
      Environment = var.environment
      Component   = "backend-api"
      ManagedBy   = "Terraform"
    }
  }
}

module "backend_api" {
  source = "../../modules/backend-api"

  environment   = var.environment
  function_name = "jouster-backend-${var.environment}"

  lambda_zip_path = var.lambda_zip_path

  # nonprod flips traffic immediately for fast preview feedback.
  deployment_config_name = "CodeDeployDefault.LambdaAllAtOnce"

  life_map_table_name = var.life_map_table_name
  sessions_table_name = var.sessions_table_name
  images_bucket_name  = var.images_bucket_name
  secret_arns         = var.secret_arns

  lambda_env_vars = {
    NODE_ENV            = "nonprod"
    LIFE_MAP_TABLE_NAME = var.life_map_table_name
    SESSION_STORE       = "dynamodb"
    SESSION_TABLE_NAME  = var.sessions_table_name
    S3_BUCKET_NAME      = var.images_bucket_name
    DEPLOY_ID           = var.deploy_id
    GIT_SHA             = var.git_sha
  }

  domain_name         = var.domain_name
  acm_certificate_arn = var.acm_certificate_arn
  route53_zone_id     = var.route53_zone_id
}


