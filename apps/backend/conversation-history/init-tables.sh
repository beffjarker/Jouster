#!/bin/bash

# DynamoDB Table Creation Script for Conversation History
# Run this after starting the DynamoDB container

echo "Creating conversation history table in DynamoDB..."

# Wait for DynamoDB to be ready
echo "Waiting for DynamoDB to start..."
until curl -s http://localhost:8000 > /dev/null; do
    echo "DynamoDB not ready, waiting 5 seconds..."
    sleep 5
done

echo "DynamoDB is ready! Creating tables..."

# Create conversation history table
aws dynamodb create-table \
    --endpoint-url http://localhost:8000 \
    --table-name ConversationHistory \
    --attribute-definitions \
        AttributeName=conversationId,AttributeType=S \
        AttributeName=timestamp,AttributeType=N \
    --key-schema \
        AttributeName=conversationId,KeyType=HASH \
        AttributeName=timestamp,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST \
    --region us-west-2

# Create conversation metadata table
aws dynamodb create-table \
    --endpoint-url http://localhost:8000 \
    --table-name ConversationMetadata \
    --attribute-definitions \
        AttributeName=conversationId,AttributeType=S \
    --key-schema \
        AttributeName=conversationId,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --region us-west-2

echo "Tables created successfully!"
echo "You can access DynamoDB Admin at: http://localhost:8001"
echo "DynamoDB endpoint is available at: http://localhost:8000"
