@echo off
echo 🚀 Starting Jouster Full Stack Application...

REM Check if containers are already running
docker ps --filter "name=jouster-dynamodb" --format "table {{.Names}}" | findstr "jouster-dynamodb" >nul
if %errorlevel% equ 0 (
    echo ✅ Database containers are already running
    goto :start_servers
)

echo 📦 Starting database containers...
docker-compose -f backend/conversation-history/docker-compose.yml up -d
if %errorlevel% neq 0 (
    echo ❌ Failed to start Docker containers
    pause
    exit /b 1
)

echo ⏳ Waiting for database to be ready...
powershell -ExecutionPolicy Bypass -File backend/conversation-history/wait-for-database.ps1
if %errorlevel% neq 0 (
    echo ❌ Database failed to start properly
    pause
    exit /b 1
)

echo 🔧 Initializing database tables...
cmd /c backend\conversation-history\init-tables.bat
if %errorlevel% neq 0 (
    echo ❌ Failed to initialize database tables
    pause
    exit /b 1
)

:start_servers
echo 🔙 Starting backend server in background...
cd backend
start /B npm run dev
cd ..

echo ⏳ Waiting for backend to initialize...
timeout /t 5 /nobreak >nul

echo 🎨 Starting frontend server...
nx serve jouster --host=localhost --port=4200 --configuration=development

echo 🎉 Full Stack Application Started Successfully!
echo 📱 Frontend: http://localhost:4200
echo 🔙 Backend: http://localhost:3001
echo 💾 DynamoDB Admin: http://localhost:8001
echo.
echo Press any key to continue...
pause >nul
