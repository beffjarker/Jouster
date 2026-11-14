// Import necessary modules
const express = require('express');
const https = require('https');
const http = require('http');
const fs = require('fs');
const helmet = require('helmet');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Apply security middleware
app.use(helmet());

// Modify server configuration to allow external access
const corsOptions = {
  origin: '*', // Allow all origins for simplicity, consider restricting in production
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));

// Define routes and middleware here

// Error handler middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Secure server setup - use HTTPS if certificates are available, otherwise fall back to HTTP
const useHttps = fs.existsSync('/path/to/private.key') && fs.existsSync('/path/to/certificate.crt');

if (useHttps) {
  const options = {
    key: fs.readFileSync('/path/to/private.key'),
    cert: fs.readFileSync('/path/to/certificate.crt')
  };

  // Start the secure server, accessible externally via 0.0.0.0
  https.createServer(options, app).listen(443, '0.0.0.0', () => {
    console.log('Secure server is running on port 443 and accessible externally');
  });
} else {
  // Change from 'localhost' to '0.0.0.0' to allow external access
  const server = http.createServer(app);
  server.listen(port, '0.0.0.0', () => {
    console.log(`Server is running on port ${port} and accessible externally`);
  });
}
