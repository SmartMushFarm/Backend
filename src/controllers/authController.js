const authService = require('../services/authService');

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
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Internal server error',
            });
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
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Internal server error',
            });
        }
    },

    me: async (req, res) => {
        try {
            const user = await authService.getCurrentUser(req.user.id);

            return res.status(200).json({
                success: true,
                message: 'Current user retrieved successfully',
                user,
            });
        } catch (error) {
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Internal server error',
            });
        }
    },
};

module.exports = authController;