// Import necessary modules
const https = require('https');
const fs = require('fs');
const app = require('./server.js');

// Load SSL certificates
const options = {
  key: fs.readFileSync('/path/to/ssl/key.pem'),
  cert: fs.readFileSync('/path/to/ssl/cert.pem')
};

// Create HTTPS server
const server = https.createServer(options, app);

// Start the server
const PORT = process.env.PORT || 443;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT} with HTTPS`);
});