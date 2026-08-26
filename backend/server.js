const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./db');
const initializeDatabase = require('./db/init');

const app = express();
const PORT = process.env.PORT || 5001;

// Enable CORS for frontend requests
app.use(cors());

// Parse JSON request bodies
app.use(express.json({ limit: '10mb' })); // Support larger base64 image strings

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date() });
});

// Register Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/issues', require('./routes/issues'));

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ message: 'Internal Server Error' });
});

// Database and Server Startup
async function startServer() {
  try {
    // Test database connection
    console.log('Connecting to PostgreSQL/Supabase database...');
    const dbTest = await db.query('SELECT NOW()');
    console.log('Database connected successfully at:', dbTest.rows[0].now);

    // Initialize/sync schema and seed defaults
    await initializeDatabase();

    app.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(`Server is running on port ${PORT}`);
      console.log(`API URL: http://localhost:${PORT}`);
      console.log(`====================================================`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
