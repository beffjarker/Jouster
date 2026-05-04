#!/usr/bin/env node

const { spawn, exec } = require('child_process');
const path = require('path');

console.log('🚀 Starting Jouster Full Stack Application...');

// Function to check if containers are running
function checkContainers() {
  return new Promise((resolve) => {
    exec('docker ps --filter "name=jouster-dynamodb" --format "{{.Names}}"', (error, stdout) => {
      if (error) {
        resolve(false);
        return;
      }
      resolve(stdout.includes('jouster-dynamodb'));
    });
  });
}

// Function to start database containers
function startDatabase() {
  return new Promise((resolve, reject) => {
    console.log('📦 Starting database containers...');
    const dockerCompose = spawn('docker-compose', ['-f', 'backend/conversation-history/docker-compose.yml', 'up', '-d'], {
      stdio: 'inherit'
    });

    dockerCompose.on('close', (code) => {
      if (code === 0) {
        console.log('⏳ Waiting for database to be ready...');
        // Wait for database to be ready
        const waitScript = spawn('powershell', ['-ExecutionPolicy', 'Bypass', '-File', 'backend/conversation-history/wait-for-database.ps1'], {
          stdio: 'inherit'
        });

        waitScript.on('close', (waitCode) => {
          if (waitCode === 0) {
            console.log('🔧 Initializing database tables...');
            const initTables = spawn('cmd', ['/c', 'backend\\conversation-history\\init-tables.bat'], {
              stdio: 'inherit'
            });

            initTables.on('close', (initCode) => {
              if (initCode === 0) {
                resolve();
              } else {
                reject(new Error('Failed to initialize database tables'));
              }
            });
          } else {
            reject(new Error('Database failed to start properly'));
          }
        });
      } else {
        reject(new Error('Failed to start Docker containers'));
      }
    });
  });
}

// Function to start backend server
function startBackend() {
  return new Promise((resolve) => {
    console.log('🔙 Starting backend server...');
    const backend = spawn('npm', ['run', 'dev'], {
      cwd: path.join(__dirname, 'backend'),
      stdio: 'pipe'
    });

    backend.stdout.on('data', (data) => {
      process.stdout.write(`[Backend] ${data}`);
    });

    backend.stderr.on('data', (data) => {
      process.stderr.write(`[Backend] ${data}`);
    });

    // Give backend time to start
    setTimeout(resolve, 5000);
  });
}

// Function to start frontend server
function startFrontend() {
  console.log('🎨 Starting frontend server...');
  const frontend = spawn('npx', ['nx', 'serve', 'jouster', '--host=localhost', '--port=4200', '--configuration=development'], {
    stdio: 'inherit'
  });

  frontend.on('close', (code) => {
    console.log(`Frontend server exited with code ${code}`);
  });

  return frontend;
}

// Main execution
async function main() {
  try {
    const containersRunning = await checkContainers();

    if (containersRunning) {
      console.log('✅ Database containers are already running');
    } else {
      await startDatabase();
    }

    await startBackend();
    await startFrontend();

    console.log('🎉 Full Stack Application Started Successfully!');
    console.log('📱 Frontend: http://localhost:4200');
    console.log('🔙 Backend: http://localhost:3001');
    console.log('💾 DynamoDB Admin: http://localhost:8001');

  } catch (error) {
    console.error('❌ Error starting full stack application:', error.message);
    process.exit(1);
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down...');
  process.exit(0);
});

main();
