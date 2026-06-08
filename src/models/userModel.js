const { pool } = require('../config/db');

// Use lowercase unquoted table name 'users' to match typical Postgres conventions
const USER_TABLE = 'users';

const User = {
    findByEmail: async (email) => {
        const query = `
            SELECT id, name, email, password, phone, address, role, status
            FROM ${USER_TABLE}
            WHERE LOWER(email) = LOWER($1)
            LIMIT 1
        `;

        const result = await pool.query(query, [email]);
        return result.rows[0] || null;
    },

    findById: async (id) => {
        const query = `
            SELECT id, name, email, phone, address, role, status
            FROM ${USER_TABLE}
            WHERE id = $1
            LIMIT 1
        `;

        const result = await pool.query(query, [id]);
        return result.rows[0] || null;
    },

    findAll: async () => {
        const query = `
            SELECT id, name, email, phone, address, role, status
            FROM ${USER_TABLE}
            ORDER BY role ASC, id ASC
        `;

        const result = await pool.query(query);
        return result.rows;
    },

    findAllByRole: async (role) => {
        const query = `
            SELECT id, name, email, phone, address, role, status
            FROM ${USER_TABLE}
            WHERE role = $1
            ORDER BY id ASC
        `;

        const result = await pool.query(query, [role]);
        return result.rows;
    },

    updateStatus: async (id, status) => {
        const query = `
            UPDATE ${USER_TABLE}
            SET status = $1
            WHERE id = $2
            RETURNING id, name, email, phone, address, role, status
        `;
        const result = await pool.query(query, [status, id]);
        return result.rows[0] || null;
    },

    updateProfile: async (id, userData) => {
        const {
            name,
            email,
            phone,
            address,
        } = userData;

        const query = `
            UPDATE ${USER_TABLE}
            SET name = COALESCE($1, name),
                email = COALESCE($2, email),
                phone = $3,
                address = $4
            WHERE id = $5
            RETURNING id, name, email, phone, address, role, status
        `;

        const values = [name || null, email || null, phone || null, address || null, id];
        const result = await pool.query(query, values);
        return result.rows[0] || null;
    },

    create: async (userData) => {
        const {
            name,
            email,
            password,
            phone,
            address,
            role = 'user',
            status = 'Active',
        } = userData;

        // Normalize role to match DB allowed values.
        // Map common variants to the DB values (e.g. 'user' -> 'Customer').
        const normalizedRole = (() => {
            const r = (role || '').toString().trim().toLowerCase();
            if (!r) return 'Customer';
            if (['user', 'customer'].includes(r)) return 'Customer';
            if (['admin', 'administrator'].includes(r)) return 'Admin';
            // Fallback: Title case unknown value
            return r.charAt(0).toUpperCase() + r.slice(1);
        })();

        const query = `
            INSERT INTO ${USER_TABLE} (name, email, password, phone, address, role, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, name, email, phone, address, role, status
        `;

        const values = [name, email, password, phone || null, address || null, normalizedRole, status];
        const result = await pool.query(query, values);
        return result.rows[0];
    },
};

module.exports = User;
