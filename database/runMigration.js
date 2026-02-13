const fs = require('fs').promises;
const path = require('path');
const { query } = require('../src/config/database');

async function runMigration() {
    try {
        console.log('Creating users table...');
        
        // Simple SQL to create table
        const sql = `
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                first_name VARCHAR(100),
                last_name VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            -- Create index for faster email lookups
            CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
            
            -- Grant permissions (if needed)
            GRANT ALL PRIVILEGES ON TABLE users TO PUBLIC;
        `;
        
        await query(sql);
        console.log('😘 Users table created successfully!');
        
    } catch (error) {
        console.error('😂 Migration failed:', error.message);
        
        if (error.message.includes('permission denied')) {
            console.log('\n FIX: Run these commands in PostgreSQL:');
            console.log('1. psql -U postgres');
            console.log('2. CREATE DATABASE auth_system;');
            console.log('3. \\c auth_system');
            console.log('4. CREATE TABLE users (id SERIAL PRIMARY KEY, email VARCHAR(255) UNIQUE NOT NULL, password VARCHAR(255) NOT NULL);');
        }
    }
}

runMigration();