# Jouster Application Startup Guide

## Quick Start (Recommended Order)

### 1. Clean Start
If you encounter port conflicts or services not responding:
```bash
npm run cleanup:kill-node
```
This kills all Node.js processes to free up ports 3000 and 4200.

### 2. Start Backend Server (Port 3000)
```bash
cd backend && npm run dev
```
**Test**: `npm run test:backend` should return healthy status

### 3. Start Frontend (Port 4200)
```bash
npm run serve:dev
```
**Test**: Navigate to http://localhost:4200

### 4. Full Stack (Alternative)
```bash
npm run start:full
```
Uses the robust startup script with automatic port conflict handling.

## Troubleshooting Commands

### Check What's Running
```bash
npm run check:ports
```
Shows which services are using ports 3000, 4200, 8000, 8001

### Test Backend Health
```bash
npm run test:backend
```
Should return: `{"status":"healthy",...}`

### Test Email API
```bash
npm run test:emails
```
Should return email list from S3 bucket

### Run All Tests
```bash
npm run troubleshoot
```
Runs port check, backend health, and email API tests

## Service URLs
- **Frontend**: http://localhost:4200
- **Backend API**: http://localhost:3000
- **Backend Health**: http://localhost:3000/health
- **Email API**: http://localhost:3000/api/emails
- **DynamoDB Admin**: http://localhost:8001

## Common Issues & Solutions

### "Port 3000 already in use"
1. Run `npm run cleanup:kill-node`
2. Wait 2-3 seconds
3. Start backend again: `cd backend && npm run dev`

### "Cannot connect to server on port 4200"
1. Ensure backend is running first (port 3000)
2. Kill Node processes: `npm run cleanup:kill-node`
3. Start frontend: `npm run serve:dev`
4. Allow 30-60 seconds for Angular compilation

### Email Loading Issues
1. Check backend health: `npm run test:backend`
2. Test email API: `npm run test:emails`
3. Verify S3 bucket configuration in .env file

## IDE Run Configurations

### IntelliJ/WebStorm Dropdown:
1. **"1. Clean Start (Kill Processes)"** - Kills conflicting Node processes
2. **"2. Backend Server (Port 3000)"** - Starts backend with environment variables
3. **"3. Angular Frontend (Port 4200)"** - Starts frontend on correct port
4. **"Full Stack (Auto-Recovery)"** - Robust startup with error handling
5. **"Check Services Status"** - Shows what's running
6. **"Test Email API"** - HTTP requests to test endpoints

### VS Code Tasks:
Same functionality as IntelliJ, accessible via Ctrl+Shift+P → "Tasks: Run Task"

## Configuration
- Backend port: 3000 (configured in .env)
- Frontend port: 4200 (configured in project.json)
- S3 bucket: jouster-dev-bucket
- Email prefix: email/
- AWS region: us-west-2

## Email Feature
✅ Email list loading with pagination (10-500 items, default 100)
✅ Email display with parsing (click "👁️ Display")
✅ Download functionality
✅ HTML and plain text email support
