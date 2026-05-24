const { pool } = require('../config/db');
const TABLE_NAME = '"User"';

const UserModel = {
    findByEmail: async (email) => {
        const result = await pool.query(`SELECT * FROM ${TABLE_NAME} WHERE email = $1 LIMIT 1`, [email]);
        return result.rows[0] || null;
    },

    findById: async (id) => {
        const result = await pool.query(`SELECT * FROM ${TABLE_NAME} WHERE id = $1 LIMIT 1`, [id]);
        return result.rows[0] || null;
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
            INSERT INTO ${TABLE_NAME} (
                full_name,
                email,
                password,
                phone_number,
                address,
                role,
                status
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `;

        const values = [
            full_name,
            email,
            password,
            phone_number || null,
            address || null,
            role,
            status,
        ];

        const result = await pool.query(query, values);
        return result.rows[0];
    },
};

module.exports = UserModel;