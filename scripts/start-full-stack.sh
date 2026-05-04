#!/bin/bash

# Full Stack Startup Script with Error Handling
echo "🚀 Starting Jouster Full Stack Application..."

# Function to check if Docker containers are running
check_containers() {
    if docker ps --filter "name=jouster-dynamodb" --format "table {{.Names}}" | grep -q "jouster-dynamodb"; then
        echo "✅ Database containers are already running"
        return 0
    else
        echo "📦 Starting database containers..."
        return 1
    fi
}

# Function to start database if not running
start_database() {
    if ! check_containers; then
        echo "🐳 Starting Docker containers..."
        docker-compose -f backend/conversation-history/docker-compose.yml up -d

        if [ $? -ne 0 ]; then
            echo "❌ Failed to start Docker containers"
            exit 1
        fi

        echo "⏳ Waiting for database to be ready..."
        powershell -ExecutionPolicy Bypass -File backend/conversation-history/wait-for-database.ps1

        if [ $? -ne 0 ]; then
            echo "❌ Database failed to start properly"
            exit 1
        fi

        echo "🔧 Initializing database tables..."
        cmd /c backend\\conversation-history\\init-tables.bat

        if [ $? -ne 0 ]; then
            echo "❌ Failed to initialize database tables"
            exit 1
        fi
    fi
}

# Function to start backend
start_backend() {
    echo "🔙 Starting backend server..."
    cd backend
    npm run dev &
    BACKEND_PID=$!
    cd ..
    echo "Backend started with PID: $BACKEND_PID"
}

# Function to start frontend
start_frontend() {
    echo "🎨 Starting frontend server..."
    nx serve jouster --host=localhost --port=4200 --configuration=development &
    FRONTEND_PID=$!
    echo "Frontend started with PID: $FRONTEND_PID"
}

# Main execution
start_database
start_backend
start_frontend

echo "🎉 Full Stack Application Started Successfully!"
echo "📱 Frontend: http://localhost:4200"
echo "🔙 Backend: http://localhost:3001"
echo "💾 DynamoDB Admin: http://localhost:8001"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for user interrupt
wait
