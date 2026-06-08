const authService = require('../services/authService');

const sendError = (res, error) => {
    const status = error.status || 500;
    return res.status(status).json({
        success: false,
        message: error.message || 'Internal Server Error',
    });
};

const authController = {
    register: async (req, res) => {
        try {
            const user = await authService.register(req.body);

            return res.status(201).json({
                success: true,
                message: 'Register successfully',
                user,
            });
        } catch (error) {
            console.error('Error registering user:', error);
            return sendError(res, error);
        }
    },

    login: async (req, res) => {
        try {
            const result = await authService.login(req.body);

            return res.status(200).json({
                success: true,
                message: 'Login successfully',
                token: result.token,
                user: result.user,
            });
        } catch (error) {
            console.error('Error logging in user:', error);
            return sendError(res, error);
        }
    },

    me: async (req, res) => {
        try {
            const user = await authService.getCurrentUser(req.user.id);
            return res.status(200).json({ success: true, user });
        } catch (error) {
            console.error('Error fetching current user:', error);
            return sendError(res, error);
        }
    },

    updateMe: async (req, res) => {
        try {
            const user = await authService.updateUserProfile(req.user.id, req.body);
            return res.status(200).json({
                success: true,
                message: 'User profile updated',
                user,
            });
        } catch (error) {
            return sendError(res, error);
        }
    },

    changePassword: async (req, res) => {
        try {
            await authService.changePassword(req.user.id, req.body);
            return res.status(200).json({
                success: true,
                message: 'Password changed successfully',
            });
        } catch (error) {
            return sendError(res, error);
        }
    },

    getUsers: async (req, res) => {
        try {
            const users = await authService.getUsers();
            return res.status(200).json({ success: true, data: users });
        } catch (error) {
            return sendError(res, error);
        }
    },

    updateUser: async (req, res) => {
        try {
            const { id } = req.params;
            if (!id || isNaN(id)) {
                return res.status(400).json({ success: false, message: 'Invalid user ID' });
            }

            const user = await authService.updateUserProfile(id, req.body);
            return res.status(200).json({
                success: true,
                message: 'User updated',
                user,
            });
        } catch (error) {
            return sendError(res, error);
        }
    },

    updateUserStatus: async (req, res) => {
        try {
            const { id } = req.params;
            const { status } = req.body;
            if (!id || isNaN(id)) {
                return res.status(400).json({ success: false, message: 'Invalid user ID' });
            }
            if (!status) {
                return res.status(400).json({ success: false, message: 'Status field is required' });
            }
            const user = await authService.updateUserStatus(id, status);
            return res.status(200).json({ success: true, message: 'User status updated', user });
        } catch (error) {
            return sendError(res, error);
        }
    },
};

module.exports = authController;
