# Data sources for ARNs / region used in IAM scoping.
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

locals {
  account_id = data.aws_caller_identity.current.account_id
  region     = data.aws_region.current.name

  # Least-privilege resource ARNs for this environment's data stores.
  dynamodb_resource_arns = [
    "arn:aws:dynamodb:${local.region}:${local.account_id}:table/${var.life_map_table_name}",
    "arn:aws:dynamodb:${local.region}:${local.account_id}:table/${var.life_map_table_name}/index/*",
    "arn:aws:dynamodb:${local.region}:${local.account_id}:table/${var.sessions_table_name}",
  ]

  images_resource_arn = "arn:aws:s3:::${var.images_bucket_name}/${var.images_prefix}"

  # Build the IAM statements, conditionally including secrets access.
  base_statements = [
    {
      Sid    = "DynamoItemAccess"
      Effect = "Allow"
      Action = [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query",
        "dynamodb:Scan",
        "dynamodb:BatchGetItem",
        "dynamodb:BatchWriteItem",
      ]
      Resource = local.dynamodb_resource_arns
    },
    {
      Sid      = "S3ImagesAccess"
      Effect   = "Allow"
      Action   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
      Resource = local.images_resource_arn
    },
  ]

  secret_statements = length(var.secret_arns) > 0 ? [
    {
      Sid      = "SecretsAccess"
      Effect   = "Allow"
      Action   = ["secretsmanager:GetSecretValue"]
      Resource = var.secret_arns
    }
  ] : []
}

# ----- Lambda execution role -----

resource "aws_iam_role" "lambda_exec" {
  name = "${var.function_name}-exec"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action    = "sts:AssumeRole"
        Effect    = "Allow"
        Principal = { Service = "lambda.amazonaws.com" }
      }
    ]
  })

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "lambda_xray" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess"
}

resource "aws_iam_role_policy" "lambda_app" {
  name = "${var.function_name}-app"
  role = aws_iam_role.lambda_exec.id

  policy = jsonencode({
    Version   = "2012-10-17"
    Statement = concat(local.base_statements, local.secret_statements)
  })
}

# ----- CodeDeploy service role -----

resource "aws_iam_role" "codedeploy" {
  name = "${var.function_name}-codedeploy"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action    = "sts:AssumeRole"
        Effect    = "Allow"
        Principal = { Service = "codedeploy.amazonaws.com" }
      }
    ]
  })

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "codedeploy" {
  role       = aws_iam_role.codedeploy.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSCodeDeployRoleForLambda"
}

