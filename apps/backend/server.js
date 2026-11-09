// Existing code...

const http = require('http');
const app = require('./app');

// Modify server configuration to allow external access
corsOptions = {
  origin: '*', // Allow all origins for simplicity, consider restricting in production
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));

// Change from 'localhost' to '0.0.0.0' to allow external access
const server = http.createServer(app);
server.listen(3000, '0.0.0.0', () => {
  console.log('Server is running on port 3000 and accessible externally');
});

// Existing code...
