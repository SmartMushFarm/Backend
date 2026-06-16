const { pool } = require('../config/db');

// Use lowercase unquoted table name 'users' to match typical Postgres conventions
const USER_TABLE = 'users';

const User = {
    findByEmail: async (email) => {
        const query = `
            SELECT id, name, email, password, phone, address, role, status, is_email_verified, otp_type
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

    findByIdWithPassword: async (id) => {
        const query = `
            SELECT id, name, email, password, phone, address, role, status,
                   otp_code, otp_expires_at, otp_type, is_email_verified
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

    updatePassword: async (id, hashedPassword) => {
        const query = `
            UPDATE ${USER_TABLE}
            SET password = $1
            WHERE id = $2
            RETURNING id, name, email, phone, address, role, status
        `;

        const result = await pool.query(query, [hashedPassword, id]);
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
            is_email_verified = true,
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
            INSERT INTO ${USER_TABLE} (name, email, password, phone, address, role, status, is_email_verified)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id, name, email, phone, address, role, status, is_email_verified
        `;

        const values = [name, email, password, phone || null, address || null, normalizedRole, status, is_email_verified];
        const result = await pool.query(query, values);
        return result.rows[0];
    },

    // Save OTP for user
    saveOTP: async (email, otpData) => {
        const { otp_code, otp_expires_at, otp_type } = otpData;
        const query = `
            UPDATE ${USER_TABLE}
            SET otp_code = $1, otp_expires_at = $2, otp_type = $3
            WHERE LOWER(email) = LOWER($4)
            RETURNING id, name, email, phone, address, role, status, is_email_verified
        `;

        const result = await pool.query(query, [otp_code, otp_expires_at, otp_type, email]);
        return result.rows[0] || null;
    },

    // Get user with OTP fields
    findByEmailWithOTP: async (email) => {
        const query = `
            SELECT id, name, email, password, phone, address, role, status, 
                   otp_code, otp_expires_at, otp_type, is_email_verified
            FROM ${USER_TABLE}
            WHERE LOWER(email) = LOWER($1)
            LIMIT 1
        `;

        const result = await pool.query(query, [email]);
        return result.rows[0] || null;
    },

    // Verify OTP and clear it
    verifyOTPAndClear: async (email, otpType) => {
        const query = `
            UPDATE ${USER_TABLE}
            SET otp_code = NULL, otp_expires_at = NULL, otp_type = NULL, is_email_verified = true
            WHERE LOWER(email) = LOWER($1)
              AND otp_type = $2
            RETURNING id, name, email, phone, address, role, status, is_email_verified
        `;

        const result = await pool.query(query, [email, otpType]);
        return result.rows[0] || null;
    },

    // Update password and clear OTP
    updatePasswordAndClearOTP: async (email, hashedPassword, otpType) => {
        const query = `
            UPDATE ${USER_TABLE}
            SET password = $1, otp_code = NULL, otp_expires_at = NULL, otp_type = NULL
            WHERE LOWER(email) = LOWER($2)
              AND ($3::text IS NULL OR otp_type = $3)
            RETURNING id, name, email, phone, address, role, status
        `;

        const result = await pool.query(query, [hashedPassword, email, otpType || null]);
        return result.rows[0] || null;
    },
};

module.exports = User;
