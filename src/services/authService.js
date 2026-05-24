const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

function normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
}

function sanitizeUser(user) {
    if (!user) {
        return null;
    }

    const {
        password,
        passwordHash,
        passwordhash,
        ...safeUser
    } = user;
    return safeUser;
}

function createError(statusCode, message) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
}

const authService = {
    register: async (payload) => {
        const full_name = String(payload.full_name || '').trim();
        const email = normalizeEmail(payload.email);
        const password = String(payload.password || '');
        const phone_number = String(payload.phone_number || '').trim();
        const address = String(payload.address || '').trim();

        if (!full_name || !email || !password) {
            throw createError(400, 'full_name, email, and password are required');
        }

        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            throw createError(409, 'Email already exists');
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const createdUser = await User.create({
            full_name,
            email,
            password: hashedPassword,
            phone_number,
            address,
            role: 'Customer',
            status: 'Active',
        });

        return sanitizeUser(createdUser);
    },

    login: async (payload) => {
        const email = normalizeEmail(payload.email);
        const password = String(payload.password || '');

        if (!email || !password) {
            throw createError(400, 'email and password are required');
        }

        const user = await User.findByEmail(email);
        if (!user) {
            throw createError(404, 'User not found');
        }

        const passwordHash = user.password || user.passwordHash || user.passwordhash;
        if (!passwordHash) {
            throw createError(500, 'Password hash is missing for this user record');
        }

        const isPasswordValid = await bcrypt.compare(password, passwordHash);
        if (!isPasswordValid) {
            throw createError(401, 'Invalid email or password');
        }

        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                role: user.role,
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        return {
            token,
            user: sanitizeUser(user),
        };
    },

    getCurrentUser: async (userId) => {
        const user = await User.findById(userId);
        if (!user) {
            throw createError(404, 'User not found');
        }

        return sanitizeUser(user);
    },
};

module.exports = authService;