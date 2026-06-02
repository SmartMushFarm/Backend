const Cart = require('../models/cartModel');
const Product = require('../models/productModel');

const createHttpError = (status, message) => {
    const error = new Error(message);
    error.status = status;
    return error;
};

const cartService = {
    getCart: async (userId) => {
        const cart = await Cart.getCartWithItems(userId);
        if (!cart) return { items: [], total: 0 };
        const total = cart.items.reduce((sum, i) => sum + Number(i.price) * i.quantity, 0);
        return { ...cart, total };
    },

    addItem: async (userId, productId, quantity) => {
        if (!productId || !quantity || quantity < 1) {
            throw createHttpError(400, 'product_id and quantity (>= 1) are required');
        }

        const product = await Product.findById(productId);
        if (!product) throw createHttpError(404, 'Product not found');
        if (product.status !== 'Active' && product.status !== 'active') {
            throw createHttpError(400, 'Product is not available');
        }
        if (product.stock_quantity < quantity) {
            throw createHttpError(400, `Not enough stock. Available: ${product.stock_quantity}`);
        }

        let cart = await Cart.findByUserId(userId);
        if (!cart) cart = await Cart.create(userId);

        const existingItem = await Cart.findItem(cart.id, productId);
        if (existingItem) {
            const newQty = existingItem.quantity + quantity;
            if (product.stock_quantity < newQty) {
                throw createHttpError(400, `Not enough stock. Available: ${product.stock_quantity}`);
            }
            return Cart.incrementItemQuantity(existingItem.id, quantity);
        }

        return Cart.addItem(cart.id, productId, quantity);
    },

    updateItem: async (userId, itemId, quantity) => {
        if (!quantity || quantity < 1) throw createHttpError(400, 'quantity must be >= 1');

        const item = await Cart.findItemById(itemId);
        if (!item) throw createHttpError(404, 'Cart item not found');
        if (item.user_id !== userId) throw createHttpError(403, 'Forbidden');

        const product = await Product.findById(item.product_id);
        if (product.stock_quantity < quantity) {
            throw createHttpError(400, `Not enough stock. Available: ${product.stock_quantity}`);
        }

        return Cart.updateItemQuantity(itemId, quantity);
    },

    deleteItem: async (userId, itemId) => {
        const item = await Cart.findItemById(itemId);
        if (!item) throw createHttpError(404, 'Cart item not found');
        if (item.user_id !== userId) throw createHttpError(403, 'Forbidden');
        return Cart.deleteItem(itemId);
    },

    clearCart: async (userId) => {
        const cart = await Cart.findByUserId(userId);
        if (!cart) return;
        await Cart.clearCart(cart.id);
    },
};

module.exports = cartService;
