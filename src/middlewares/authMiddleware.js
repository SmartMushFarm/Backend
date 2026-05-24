const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    const authorizationHeader = req.headers.authorization;

    if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            message: 'Unauthorized: missing token',
        });
    }

    const token = authorizationHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        return next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Unauthorized: invalid or expired token',
        });
    }
};

module.exports = authMiddleware;