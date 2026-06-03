require('dotenv').config();
const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
    throw new Error('Missing DATABASE_URL in environment variables');
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false,
    },
});

// Ensure each new client session uses Vietnam timezone so timestamptz values
// are returned in local time (Asia/Ho_Chi_Minh)
pool.on('connect', (client) => {
    client.query("SET TIME ZONE 'Asia/Ho_Chi_Minh'").catch(() => {});
});

const query = (text, params) => {
    return pool.query(text, params);
};

module.exports = {
    pool,
    query,
};