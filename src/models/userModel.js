const { pool } = require('../config/db');

const USER_TABLE = '"User"';

const User = {
    findByEmail: async (email) => {
        const query = `
            SELECT id, full_name, email, password, phone_number, address, role, status
            FROM ${USER_TABLE}
            WHERE LOWER(email) = LOWER($1)
            LIMIT 1
        `;

        const result = await pool.query(query, [email]);
        return result.rows[0] || null;
    },

    findById: async (id) => {
        const query = `
            SELECT id, full_name, email, phone_number, address, role, status
            FROM ${USER_TABLE}
            WHERE id = $1
            LIMIT 1
        `;

        const result = await pool.query(query, [id]);
        return result.rows[0] || null;
    },

    findAll: async () => {
        const query = `
            SELECT id, full_name, email, phone_number, address, role, status
            FROM ${USER_TABLE}
            ORDER BY role ASC, id ASC
        `;

        const result = await pool.query(query);
        return result.rows;
    },

    findAllByRole: async (role) => {
        const query = `
            SELECT id, full_name, email, phone_number, address, role, status
            FROM ${USER_TABLE}
            WHERE role = $1
            ORDER BY id ASC
        `;

        const result = await pool.query(query, [role]);
        return result.rows;
    },

    create: async (userData) => {
        const {
            full_name,
            email,
            password,
            phone_number,
            address,
            role = 'Customer',
            status = 'Active',
        } = userData;

        const query = `
            INSERT INTO ${USER_TABLE} (full_name, email, password, phone_number, address, role, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, full_name, email, phone_number, address, role, status
        `;

        const values = [full_name, email, password, phone_number || null, address || null, role, status];
        const result = await pool.query(query, values);
        return result.rows[0];
    },
};

module.exports = User;