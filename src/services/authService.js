const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

const toPublicUser = (user) => {
    if (!user) {
        return null;
    }

    const { password, ...publicUser } = user;
    return publicUser;
};

const createHttpError = (status, message) => {
    const error = new Error(message);
    error.status = status;
    return error;
};

const authService = {
    register: async (payload) => {
        const name = (payload.name || payload.full_name || '').trim();
        const email = (payload.email || '').trim().toLowerCase();
        const password = payload.password || '';
        const phone = (payload.phone || payload.phone_number || '').trim();
        const address = (payload.address || '').trim();

        if (!name || !email || !password) {
            throw createHttpError(400, 'name, email and password are required');
        }

        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            throw createHttpError(409, 'Email already exists');
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const createdUser = await User.create({
            name,
            email,
            password: hashedPassword,
            phone,
            address,
            role: 'user',
            status: 'Active',
        });

        return toPublicUser(createdUser);
    },

    login: async (payload) => {
        const email = (payload.email || '').trim().toLowerCase();
        const password = payload.password || '';

        if (!email || !password) {
            throw createHttpError(400, 'email and password are required');
        }

        const user = await User.findByEmail(email);
        if (!user) {
            throw createHttpError(404, 'Email does not exist');
        }

        if (user.status !== 'Active') {
            throw createHttpError(403, 'User account is not active');
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw createHttpError(401, 'Invalid password');
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
            user: toPublicUser(user),
        };
    },

    getCurrentUser: async (userId) => {
        const user = await User.findById(userId);
        if (!user) throw createHttpError(404, 'User not found');
        return user;
    },

    getUsers: async () => {
        return User.findAll();
    },

    updateUserStatus: async (id, status) => {
        const allowed = ['Active', 'Inactive'];
        if (!allowed.includes(status)) {
            throw createHttpError(400, `status must be one of: ${allowed.join(', ')}`);
        }
        const user = await User.updateStatus(id, status);
        if (!user) throw createHttpError(404, 'User not found');
        return user;
    },

    getAllUsers: async () => {
        return User.findAll();
    },
};

module.exports = authService;