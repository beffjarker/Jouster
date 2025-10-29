@echo off
REM DynamoDB Table Initialization Script
REM This script creates conversation history tables in DynamoDB
REM
REM SECURITY: Uses .env file for credentials (NEVER hardcode credentials!)
REM
REM Setup:
REM 1. Ensure you have a .env file in the project root with:
REM    AWS_ACCESS_KEY_ID=your_key_here
REM    AWS_SECRET_ACCESS_KEY=your_secret_here
REM    AWS_REGION=us-west-2
REM 2. Run this script from the project root
REM
REM Note: This script reads credentials from environment variables set by .env loader

echo Creating conversation history tables in DynamoDB...

REM Check if AWS credentials are set in environment
if "%AWS_ACCESS_KEY_ID%"=="" (
    echo ERROR: AWS_ACCESS_KEY_ID not set in environment
    echo Please ensure your .env file is loaded or set AWS credentials manually
    pause
    exit /b 1
)

if "%AWS_SECRET_ACCESS_KEY%"=="" (
    echo ERROR: AWS_SECRET_ACCESS_KEY not set in environment
    echo Please ensure your .env file is loaded or set AWS credentials manually
    pause
    exit /b 1
)

REM Set default region if not provided
if "%AWS_REGION%"=="" (
    set AWS_REGION=us-west-2
    echo Using default region: us-west-2
)

REM Set AWS CLI path
set AWS_CLI="C:\Program Files\Amazon\AWSCLIV2\aws.exe"

REM Test AWS connection
echo Testing AWS connection...
%AWS_CLI% sts get-caller-identity --region %AWS_REGION%
if %errorlevel% neq 0 (
    echo Error: AWS credentials test failed
    echo Please verify your credentials in .env file
    pause
    exit /b 1
)

echo AWS credentials verified! Creating tables...

REM Create jouster-conversations table
echo Creating jouster-conversations table...
%AWS_CLI% dynamodb create-table ^
    --table-name jouster-conversations ^
    --attribute-definitions AttributeName=conversationId,AttributeType=S ^
    --key-schema AttributeName=conversationId,KeyType=HASH ^
    --billing-mode PAY_PER_REQUEST ^
    --region %AWS_REGION%

if %errorlevel% neq 0 (
    echo Warning: Failed to create jouster-conversations table (may already exist)
) else (
    echo Successfully created jouster-conversations table
)

REM Create jouster-conversation-messages table
echo Creating jouster-conversation-messages table...
%AWS_CLI% dynamodb create-table ^
    --table-name jouster-conversation-messages ^
    --attribute-definitions ^
        AttributeName=conversationId,AttributeType=S ^
        AttributeName=timestamp,AttributeType=N ^
    --key-schema ^
        AttributeName=conversationId,KeyType=HASH ^
        AttributeName=timestamp,KeyType=RANGE ^
    --billing-mode PAY_PER_REQUEST ^
    --region %AWS_REGION%

if %errorlevel% neq 0 (
    echo Warning: Failed to create jouster-conversation-messages table (may already exist)
) else (
    echo Successfully created jouster-conversation-messages table
)

echo.
echo Table creation complete!
echo.
echo Created tables:
%AWS_CLI% dynamodb list-tables --region %AWS_REGION%

pause

