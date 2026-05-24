require('dotenv').config();
const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
    throw new Error('Missing DATABASE_URL in environment variables');
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' || process.env.DATABASE_URL.includes('supabase')
        ? { rejectUnauthorized: false }
        : false,
});

module.exports = { pool };