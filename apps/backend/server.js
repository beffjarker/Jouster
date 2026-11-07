// Existing code...

const http = require('http');
const app = require('./app');

// Change from 'localhost' to '0.0.0.0' to allow external access
const server = http.createServer(app);
server.listen(3000, '0.0.0.0', () => {
  console.log('Server is running on port 3000 and accessible externally');
});

// Existing code...