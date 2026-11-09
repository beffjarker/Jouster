// Existing code...

// Modify server configuration to allow external access
corsOptions = {
  origin: '*', // Allow all origins for simplicity, consider restricting in production
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));

// Existing code...