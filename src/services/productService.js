const Product = require('../models/productModel');

const productService = {
    getAllProducts: async () => {
        return await Product.find();
    },
    getProductById: async (id) => {
        return await Product.findById(id);
    },
    createProduct: async (productData) => {
        return await Product.create(productData);
    },
    updateProduct: async (id, updateData) => {
        return await Product.findByIdAndUpdate(id, updateData);
    },
    deleteProduct: async (id) => {
        return await Product.findByIdAndDelete(id);
    }
};

module.exports = productService;