const { pool } = require('../config/db');

const Cart = {
    findByUserId: async (userId) => {
        const result = await pool.query(`SELECT * FROM carts WHERE user_id = $1 LIMIT 1`, [userId]);
        return result.rows[0] || null;
    },

    create: async (userId) => {
        const result = await pool.query(
            `INSERT INTO carts (user_id) VALUES ($1) RETURNING *`,
            [userId]
        );
        return result.rows[0];
    },

    getCartWithItems: async (userId) => {
        const cartResult = await pool.query(`SELECT * FROM carts WHERE user_id = $1 LIMIT 1`, [userId]);
        const cart = cartResult.rows[0];
        if (!cart) return null;

        const itemsResult = await pool.query(
            `SELECT ci.*, p.name, p.price, p.image_url, p.stock_quantity
             FROM cart_items ci
             JOIN products p ON ci.product_id = p.id
             WHERE ci.cart_id = $1`,
            [cart.id]
        );
        return { ...cart, items: itemsResult.rows };
    },

    findItem: async (cartId, productId) => {
        const result = await pool.query(
            `SELECT * FROM cart_items WHERE cart_id = $1 AND product_id = $2`,
            [cartId, productId]
        );
        return result.rows[0] || null;
    },

    addItem: async (cartId, productId, quantity) => {
        const result = await pool.query(
            `INSERT INTO cart_items (cart_id, product_id, quantity) VALUES ($1, $2, $3) RETURNING *`,
            [cartId, productId, quantity]
        );
        return result.rows[0];
    },

    updateItemQuantity: async (itemId, quantity) => {
        const result = await pool.query(
            `UPDATE cart_items SET quantity = $1 WHERE id = $2 RETURNING *`,
            [quantity, itemId]
        );
        return result.rows[0] || null;
    },

    incrementItemQuantity: async (itemId, addQty) => {
        const result = await pool.query(
            `UPDATE cart_items SET quantity = quantity + $1 WHERE id = $2 RETURNING *`,
            [addQty, itemId]
        );
        return result.rows[0] || null;
    },

    deleteItem: async (itemId) => {
        const result = await pool.query(
            `DELETE FROM cart_items WHERE id = $1 RETURNING *`,
            [itemId]
        );
        return result.rows[0] || null;
    },

    clearCart: async (cartId) => {
        await pool.query(`DELETE FROM cart_items WHERE cart_id = $1`, [cartId]);
    },

    findItemById: async (itemId) => {
        const result = await pool.query(
            `SELECT ci.*, c.user_id FROM cart_items ci JOIN carts c ON ci.cart_id = c.id WHERE ci.id = $1`,
            [itemId]
        );
        return result.rows[0] || null;
    },
};

module.exports = Cart;
