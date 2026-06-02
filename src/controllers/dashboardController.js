const { pool } = require('../config/db');
const sendError = (res, e) => res.status(e.status || 500).json({ success: false, message: e.message });

const dashboardController = {
    revenue: async (req, res) => {
        try {
            const result = await pool.query(`
                SELECT
                    COALESCE(SUM(CASE WHEN DATE(created_at) = CURRENT_DATE THEN total_amount ELSE 0 END), 0) as today,
                    COALESCE(SUM(CASE WHEN DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW()) THEN total_amount ELSE 0 END), 0) as this_month,
                    COALESCE(SUM(total_amount), 0) as total
                FROM orders
                WHERE status = 'Completed'
            `);
            return res.json({ success: true, data: result.rows[0] });
        } catch (e) { return sendError(res, e); }
    },

    orders: async (req, res) => {
        try {
            const result = await pool.query(`
                SELECT
                    COUNT(*) as total,
                    COUNT(*) FILTER (WHERE status = 'Pending') as pending,
                    COUNT(*) FILTER (WHERE status = 'Completed') as completed,
                    COUNT(*) FILTER (WHERE status = 'Cancelled') as cancelled
                FROM orders
            `);
            return res.json({ success: true, data: result.rows[0] });
        } catch (e) { return sendError(res, e); }
    },

    users: async (req, res) => {
        try {
            const result = await pool.query(`
                SELECT
                    COUNT(*) as total,
                    COUNT(*) FILTER (WHERE status = 'Active') as active,
                    COUNT(*) FILTER (WHERE status = 'Inactive') as inactive,
                    COUNT(*) FILTER (WHERE role = 'Technician') as technicians
                FROM "User"
            `);
            return res.json({ success: true, data: result.rows[0] });
        } catch (e) { return sendError(res, e); }
    },

    maintenance: async (req, res) => {
        try {
            const result = await pool.query(`
                SELECT
                    COUNT(*) as total,
                    COUNT(*) FILTER (WHERE status = 'Pending') as pending,
                    COUNT(*) FILTER (WHERE status = 'Processing') as processing,
                    COUNT(*) FILTER (WHERE status = 'Completed') as completed
                FROM maintenance_requests
            `);
            return res.json({ success: true, data: result.rows[0] });
        } catch (e) { return sendError(res, e); }
    },

    products: async (req, res) => {
        try {
            const topSelling = await pool.query(`
                SELECT p.id, p.name, p.image_url, SUM(od.quantity) as total_sold
                FROM order_details od
                JOIN products p ON od.product_id = p.id
                GROUP BY p.id, p.name, p.image_url
                ORDER BY total_sold DESC
                LIMIT 5
            `);
            const lowStock = await pool.query(`
                SELECT id, name, stock_quantity FROM products
                WHERE stock_quantity <= 10 AND (status = 'Active' OR status = 'active')
                ORDER BY stock_quantity ASC
            `);
            const totalActive = await pool.query(`
                SELECT COUNT(*) as count FROM products WHERE status = 'Active' OR status = 'active'
            `);
            return res.json({
                success: true,
                data: {
                    top_selling: topSelling.rows,
                    low_stock: lowStock.rows,
                    total_active: totalActive.rows[0].count,
                },
            });
        } catch (e) { return sendError(res, e); }
    },
};

module.exports = dashboardController;
