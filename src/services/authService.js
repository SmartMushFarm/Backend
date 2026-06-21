const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const { pool } = require('../config/db');
const otpService = require('./otpService');
const emailService = require('./emailService');

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

const rollbackTransaction = async (client) => {
    try {
        await client.query('ROLLBACK');
    } catch (rollbackError) {
        console.error('Error rolling back transaction:', rollbackError);
    }
};

const buildEmailDeliveryResponse = (emailDelivery) => ({
    message_id: emailDelivery.messageId,
    accepted: emailDelivery.accepted || [],
    rejected: emailDelivery.rejected || [],
    response: emailDelivery.response,
});

const allowedRoles = ['Customer', 'Admin', 'Technician'];

const normalizeRole = (role) => {
    const value = String(role || '').trim().toLowerCase();
    const normalized = allowedRoles.find(item => item.toLowerCase() === value);
    if (!normalized) {
        throw createHttpError(400, `role must be one of: ${allowedRoles.join(', ')}`);
    }
    return normalized;
};

const normalizeUserProfileInput = (payload, existingUser) => {
    const data = {};

    if (Object.prototype.hasOwnProperty.call(payload, 'email')) {
        throw createHttpError(400, 'email cannot be changed');
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'name')) {
        data.name = String(payload.name || '').trim();
        if (!data.name) throw createHttpError(400, 'name cannot be empty');
    } else {
        data.name = existingUser.name;
    }

    data.email = existingUser.email;

    data.phone = Object.prototype.hasOwnProperty.call(payload, 'phone')
        ? String(payload.phone || '').trim() || null
        : existingUser.phone;
    data.address = Object.prototype.hasOwnProperty.call(payload, 'address')
        ? String(payload.address || '').trim() || null
        : existingUser.address;

    return data;
};

const verifyUserOTP = (user, otp, expectedType) => {
    if (!user.otp_code || !user.otp_expires_at || user.otp_type !== expectedType) {
        throw createHttpError(400, 'Invalid or expired OTP');
    }

    const otpVerification = otpService.verifyOTP(otp, user.otp_code, user.otp_expires_at);
    if (!otpVerification.valid) {
        throw createHttpError(400, otpVerification.message);
    }
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

        if (user.is_email_verified === false && user.otp_type === 'registration') {
            throw createHttpError(403, 'Please verify your email before logging in');
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw createHttpError(401, 'Invalid password');
        }

        if (!process.env.JWT_SECRET) {
            throw createHttpError(500, 'JWT_SECRET is not configured');
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

    getUsersByRole: async (role) => {
        return User.findAllByRole(normalizeRole(role));
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

    updateUserProfile: async (id, payload) => {
        const existingUser = await User.findById(id);
        if (!existingUser) throw createHttpError(404, 'User not found');

        const data = normalizeUserProfileInput(payload, existingUser);

        const updatedUser = await User.updateProfile(id, data);
        if (!updatedUser) throw createHttpError(404, 'User not found');
        return updatedUser;
    },

    changePassword: async (id, payload) => {
        const oldPassword = payload.old_password || payload.current_password || '';
        const newPassword = payload.new_password || '';

        if (!oldPassword || !newPassword) {
            throw createHttpError(400, 'old_password and new_password are required');
        }

        if (newPassword.length < 6) {
            throw createHttpError(400, 'new_password must be at least 6 characters');
        }

        if (oldPassword === newPassword) {
            throw createHttpError(400, 'new_password must be different from old_password');
        }

        const user = await User.findByIdWithPassword(id);
        if (!user) throw createHttpError(404, 'User not found');

        const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
        if (!isOldPasswordValid) {
            throw createHttpError(401, 'Old password is incorrect');
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const updatedUser = await User.updatePassword(id, hashedPassword);
        if (!updatedUser) throw createHttpError(404, 'User not found');
        return updatedUser;
    },

    getAllUsers: async () => {
        return User.findAll();
    },

    // ============ OTP-BASED REGISTRATION ============
    registerWithOTP: async (payload) => {
        const name = (payload.name || payload.full_name || '').trim();
        const email = (payload.email || '').trim().toLowerCase();
        const password = payload.password || '';
        const phone = (payload.phone || payload.phone_number || '').trim();
        const address = (payload.address || '').trim();

        if (!name || !email || !password) {
            throw createHttpError(400, 'name, email and password are required');
        }

        const existingUser = await User.findByEmailWithOTP(email);
        if (existingUser && existingUser.is_email_verified) {
            throw createHttpError(409, 'Email already registered');
        }

        // Generate OTP for registration
        const otpData = otpService.generateOTPData('registration');

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        let emailDelivery;
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            if (existingUser && !existingUser.is_email_verified) {
                await client.query(
                    `
                        UPDATE users
                        SET password = $1,
                            otp_code = $2,
                            otp_expires_at = $3,
                            otp_type = $4
                        WHERE id = $5
                    `,
                    [
                        hashedPassword,
                        otpData.otp_code,
                        otpData.otp_expires_at,
                        otpData.otp_type,
                        existingUser.id,
                    ]
                );
            } else {
                await client.query(
                    `
                        INSERT INTO users (
                            name,
                            email,
                            password,
                            phone,
                            address,
                            role,
                            status,
                            is_email_verified,
                            otp_code,
                            otp_expires_at,
                            otp_type
                        )
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                    `,
                    [
                        name,
                        email,
                        hashedPassword,
                        phone || null,
                        address || null,
                        'Customer',
                        'Active',
                        false,
                        otpData.otp_code,
                        otpData.otp_expires_at,
                        otpData.otp_type,
                    ]
                );
            }

            emailDelivery = await emailService.sendRegistrationOTP(email, otpData.otp_code);
            await client.query('COMMIT');
        } catch (error) {
            await rollbackTransaction(client);
            console.error('Error sending OTP email:', error);
            throw createHttpError(500, 'Failed to send OTP email');
        } finally {
            client.release();
        }

        return {
            message: 'OTP has been sent to your email',
            email: email,
            email_delivery: buildEmailDeliveryResponse(emailDelivery),
        };
    },

    // Verify OTP for registration
    verifyRegistrationOTP: async (payload) => {
        const email = (payload.email || '').trim().toLowerCase();
        const otp = (payload.otp || '').trim();

        if (!email || !otp) {
            throw createHttpError(400, 'email and otp are required');
        }

        const user = await User.findByEmailWithOTP(email);
        if (!user) {
            throw createHttpError(404, 'Email not found');
        }

        verifyUserOTP(user, otp, 'registration');

        // Clear OTP and mark email as verified
        const verifiedUser = await User.verifyOTPAndClear(email, 'registration');
        if (!verifiedUser) {
            throw createHttpError(400, 'Invalid or expired OTP');
        }

        return {
            message: 'Email verified successfully. You can now login.',
            user: toPublicUser(verifiedUser),
        };
    },

    // ============ OTP-BASED PASSWORD RESET ============
    requestPasswordReset: async (payload) => {
        const email = (payload.email || '').trim().toLowerCase();

        if (!email) {
            throw createHttpError(400, 'email is required');
        }

        const user = await User.findByEmail(email);
        if (!user) {
            // For security, don't reveal if email exists
            return {
                message: 'If email exists, OTP has been sent',
            };
        }

        // Generate OTP for password reset
        const otpData = otpService.generateOTPData('forgot_password');

        let emailDelivery;
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            await client.query(
                `
                    UPDATE users
                    SET otp_code = $1,
                        otp_expires_at = $2,
                        otp_type = $3
                    WHERE LOWER(email) = LOWER($4)
                `,
                [
                    otpData.otp_code,
                    otpData.otp_expires_at,
                    otpData.otp_type,
                    email,
                ]
            );

            emailDelivery = await emailService.sendForgotPasswordOTP(email, otpData.otp_code);
            await client.query('COMMIT');
        } catch (error) {
            await rollbackTransaction(client);
            console.error('Error sending OTP email:', error);
            throw createHttpError(500, 'Failed to send OTP email');
        } finally {
            client.release();
        }

        return {
            message: 'OTP has been sent to your email',
            email: email,
            email_delivery: buildEmailDeliveryResponse(emailDelivery),
        };
    },

    // Verify OTP and reset password
    resetPasswordWithOTP: async (payload) => {
        const email = (payload.email || '').trim().toLowerCase();
        const otp = (payload.otp || '').trim();
        const newPassword = payload.new_password || '';

        if (!email || !otp || !newPassword) {
            throw createHttpError(400, 'email, otp and new_password are required');
        }

        if (newPassword.length < 6) {
            throw createHttpError(400, 'new_password must be at least 6 characters');
        }

        const user = await User.findByEmailWithOTP(email);
        if (!user) {
            throw createHttpError(404, 'Email not found');
        }

        verifyUserOTP(user, otp, 'forgot_password');

        // Hash new password and update
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const updatedUser = await User.updatePasswordAndClearOTP(email, hashedPassword, 'forgot_password');
        if (!updatedUser) {
            throw createHttpError(400, 'Invalid or expired OTP');
        }

        return {
            message: 'Password reset successfully. You can now login with your new password.',
            user: toPublicUser(updatedUser),
        };
    },

    // ============ OTP-BASED CHANGE PASSWORD ============
    requestChangePasswordOTP: async (userId) => {
        const user = await User.findById(userId);
        if (!user) {
            throw createHttpError(404, 'User not found');
        }

        // Generate OTP for password change
        const otpData = otpService.generateOTPData('change_password');

        let emailDelivery;
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            await client.query(
                `
                    UPDATE users
                    SET otp_code = $1,
                        otp_expires_at = $2,
                        otp_type = $3
                    WHERE LOWER(email) = LOWER($4)
                `,
                [
                    otpData.otp_code,
                    otpData.otp_expires_at,
                    otpData.otp_type,
                    user.email,
                ]
            );

            emailDelivery = await emailService.sendChangePasswordOTP(user.email, otpData.otp_code);
            await client.query('COMMIT');
        } catch (error) {
            await rollbackTransaction(client);
            console.error('Error sending OTP email:', error);
            throw createHttpError(500, 'Failed to send OTP email');
        } finally {
            client.release();
        }

        return {
            message: 'OTP has been sent to your email',
            email: user.email,
            email_delivery: buildEmailDeliveryResponse(emailDelivery),
        };
    },

    // Change password with OTP verification
    changePasswordWithOTP: async (userId, payload) => {
        const otp = (payload.otp || '').trim();
        const newPassword = payload.new_password || '';

        if (!otp || !newPassword) {
            throw createHttpError(400, 'otp and new_password are required');
        }

        if (newPassword.length < 6) {
            throw createHttpError(400, 'new_password must be at least 6 characters');
        }

        const user = await User.findByIdWithPassword(userId);
        if (!user) {
            throw createHttpError(404, 'User not found');
        }

        verifyUserOTP(user, otp, 'change_password');

        // Hash new password and update
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const updatedUser = await User.updatePasswordAndClearOTP(user.email, hashedPassword, 'change_password');
        if (!updatedUser) {
            throw createHttpError(400, 'Invalid or expired OTP');
        }

        return {
            message: 'Password changed successfully.',
            user: toPublicUser(updatedUser),
        };
    },
};

module.exports = authService;
