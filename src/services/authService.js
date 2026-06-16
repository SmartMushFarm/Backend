const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
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

        // If user exists but not verified, update them
        if (existingUser && !existingUser.is_email_verified) {
            const updatedUser = await User.saveOTP(email, otpData);
            // Also update password in temp user
            await User.updatePassword(existingUser.id, hashedPassword);
        } else {
            // Create new user with OTP
            const userData = {
                name,
                email,
                password: hashedPassword,
                phone,
                address,
                role: 'user',
                status: 'Active',
                is_email_verified: false,
            };
            await User.create(userData);
            await User.saveOTP(email, otpData);
        }

        // Send OTP via email
        let emailDelivery;
        try {
            emailDelivery = await emailService.sendRegistrationOTP(email, otpData.otp_code);
        } catch (error) {
            console.error('Error sending OTP email:', error);
            throw createHttpError(500, 'Failed to send OTP email');
        }

        return {
            message: 'OTP has been sent to your email',
            email: email,
            email_delivery: {
                message_id: emailDelivery.messageId,
                accepted: emailDelivery.accepted || [],
                rejected: emailDelivery.rejected || [],
                response: emailDelivery.response,
            },
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
        await User.saveOTP(email, otpData);

        // Send OTP via email
        let emailDelivery;
        try {
            emailDelivery = await emailService.sendForgotPasswordOTP(email, otpData.otp_code);
        } catch (error) {
            console.error('Error sending OTP email:', error);
            throw createHttpError(500, 'Failed to send OTP email');
        }

        return {
            message: 'OTP has been sent to your email',
            email: email,
            email_delivery: {
                message_id: emailDelivery.messageId,
                accepted: emailDelivery.accepted || [],
                rejected: emailDelivery.rejected || [],
                response: emailDelivery.response,
            },
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
        await User.saveOTP(user.email, otpData);

        // Send OTP via email
        let emailDelivery;
        try {
            emailDelivery = await emailService.sendChangePasswordOTP(user.email, otpData.otp_code);
        } catch (error) {
            console.error('Error sending OTP email:', error);
            throw createHttpError(500, 'Failed to send OTP email');
        }

        return {
            message: 'OTP has been sent to your email',
            email: user.email,
            email_delivery: {
                message_id: emailDelivery.messageId,
                accepted: emailDelivery.accepted || [],
                rejected: emailDelivery.rejected || [],
                response: emailDelivery.response,
            },
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
