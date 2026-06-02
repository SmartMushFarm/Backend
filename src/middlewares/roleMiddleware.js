const roleMiddleware = (...roles) => {
    // Normalize allowed roles to lowercase for case-insensitive comparison
    const allowed = roles.map(r => String(r).toLowerCase());

    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const userRole = String(req.user.role || '').toLowerCase();
        if (!allowed.includes(userRole)) {
            return res.status(403).json({ success: false, message: 'Forbidden: insufficient role' });
        }

        return next();
    };
};

module.exports = roleMiddleware;
