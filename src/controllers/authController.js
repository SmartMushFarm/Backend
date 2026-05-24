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
            const users = await authService.getAllUsers();

            return res.status(200).json({
                success: true,
                users,
            });
        } catch (error) {
            console.error('Error fetching users:', error);
            return sendError(res, error);
        }
    },
};

module.exports = authController;