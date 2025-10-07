@echo off
echo Creating conversation history tables in DynamoDB...

REM Set AWS CLI path
set AWS_CLI="C:\Program Files\Amazon\AWSCLIV2\aws.exe"

REM Set AWS credentials from environment
set AWS_ACCESS_KEY_ID=AKIA5OSYVDEI3YI27VG5
set AWS_SECRET_ACCESS_KEY=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
set AWS_DEFAULT_REGION=us-west-2

REM Test AWS connection
echo Testing AWS connection...
%AWS_CLI% sts get-caller-identity --region us-west-2
if %errorlevel% neq 0 (
    echo Error: AWS credentials test failed
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
    --region us-west-2

if %errorlevel% neq 0 (
    echo Warning: jouster-conversations table creation failed or table already exists
)

REM Create jouster-messages table
echo Creating jouster-messages table...
%AWS_CLI% dynamodb create-table ^
    --table-name jouster-messages ^
    --attribute-definitions AttributeName=conversationId,AttributeType=S AttributeName=messageId,AttributeType=S ^
    --key-schema AttributeName=conversationId,KeyType=HASH AttributeName=messageId,KeyType=RANGE ^
    --billing-mode PAY_PER_REQUEST ^
    --region us-west-2

if %errorlevel% neq 0 (
    echo Warning: jouster-messages table creation failed or table already exists
)

REM Create emails table for the emails feature
echo Creating jouster-emails table...
%AWS_CLI% dynamodb create-table ^
    --table-name jouster-emails ^
    --attribute-definitions AttributeName=id,AttributeType=S ^
    --key-schema AttributeName=id,KeyType=HASH ^
    --billing-mode PAY_PER_REQUEST ^
    --region us-west-2

if %errorlevel% neq 0 (
    echo Warning: jouster-emails table creation failed or table already exists
)

echo Listing existing tables...
%AWS_CLI% dynamodb list-tables --region us-west-2

echo.
echo Tables created successfully!
echo Next steps:
echo 1. Run the backend server: npm run backend:start
echo 2. Test the API: http://localhost:3000/api/conversation-history
echo 3. Migrate existing JSON conversations: POST http://localhost:3000/api/conversation-history/migrate
echo.
