// Import necessary modules
const express = require('express');
const cors = require('cors');
const http = require('http');
const app = express();
const port = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Modify server configuration to allow external access
const corsOptions = {
  origin: '*', // Allow all origins for simplicity, consider restricting in production
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));

// Error handler middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Change from 'localhost' to '0.0.0.0' to allow external access
const server = http.createServer(app);
server.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on port ${port} and accessible externally`);
});
