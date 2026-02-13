const { Pool } = require('pg');
require('dotenv').config();

// Simple direct connection - no error handling during init
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'auth_system',
    user: process.env.DB_USER || 'auth_user',
    password: process.env.DB_PASSWORD || 'SecurePass123!',
});

// Test connection on first query
pool.on('connect', () => {
    console.log(' Database connection established');
});

pool.on('error', (err) => {
    console.error(' Database connection error:', err.message);
});

module.exports = {
    query: (text, params) => {
        console.log(' Executing query:', text.substring(0, 100) + '...');
        return pool.query(text, params);
    },
    pool
};