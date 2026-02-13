const { Pool } = require('pg');
require('dotenv').config();

//  Detect if we're on Vercel (production) or local
const isProduction = process.env.NODE_ENV === 'production';

//  Connection configuration – works locally AND on Vercel
const poolConfig = {};

if (process.env.POSTGRES_URL) {
  // Vercel Postgres provides a single connection string
  poolConfig.connectionString = process.env.POSTGRES_URL;
  // Vercel requires SSL with rejectUnauthorized: false
  poolConfig.ssl = { rejectUnauthorized: false };
} else {
  // Local development – use individual DB_* variables
  poolConfig.host = process.env.DB_HOST || 'localhost';
  poolConfig.port = process.env.DB_PORT || 5432;
  poolConfig.database = process.env.DB_NAME || 'auth_system';
  poolConfig.user = process.env.DB_USER || 'auth_user';
  poolConfig.password = process.env.DB_PASSWORD || 'SecurePass123!';
  // No SSL locally (unless you configure it)
}

// Create the pool
const pool = new Pool(poolConfig);

// Test connection on first query
pool.on('connect', () => {
  console.log(' Database connection established');
});

pool.on('error', (err) => {
  console.error(' Database connection error:', err.message);
});

module.exports = {
  query: (text, params) => {
    console.log('📝 Executing query:', text.substring(0, 100) + '...');
    return pool.query(text, params);
  },
  pool
};