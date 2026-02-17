const { Pool } = require('pg');
require('dotenv').config();

// Detect environment
const isProduction = process.env.NODE_ENV === 'production';

// Connection configuration
const poolConfig = {};

if (process.env.POSTGRES_URL) {
  // Vercel Postgres (single connection string)
  poolConfig.connectionString = process.env.POSTGRES_URL;

  // Required for Vercel
  poolConfig.ssl = {
    rejectUnauthorized: false,
  };
} else {
  // Local development config
  poolConfig.host = process.env.DB_HOST || 'localhost';
  poolConfig.port = process.env.DB_PORT || 5432;
  poolConfig.database = process.env.DB_NAME || 'auth_system';
  poolConfig.user = process.env.DB_USER || 'auth_user';
  poolConfig.password = process.env.DB_PASSWORD || 'SecurePass123!';
}

// Create pool
const pool = new Pool(poolConfig);

// Success connection log
pool.on('connect', () => {
  console.log(` Database connected (${isProduction ? 'Production' : 'Local'})`);
});

// Error handling
pool.on('error', (err) => {
  console.error(' Database connection error:', err.message);
});

// Query wrapper
const query = async (text, params) => {
  try {
    if (process.env.NODE_ENV === 'development') {
      console.log(' SQL:', text.substring(0, 120));
    }
    return await pool.query(text, params);
  } catch (err) {
    console.error(' Query error:', err.message);
    throw err;
  }
};

module.exports = {
  query,
  pool
};
