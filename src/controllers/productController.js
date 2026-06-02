const ProductService = require('../services/productService');

const productController = {
    getAllProducts: async (req, res) => {
        try {
            const { categoryId, keyword, status } = req.query;
            const products = await ProductService.getAllProducts({ categoryId, keyword, status });
            return res.status(200).json({success: true, data: products});
        }catch (error) {
            console.error('Error fetching products:', error);
            return res.status(500).json({success: false, message: error.message});
        }
    },
    getProductById: async (req, res) => {
        try {
            const { id } = req.params;
            const product = await ProductService.getProductById(id);
            if (!product) {
                return res.status(404).json({success: false, message: 'Product not found'});
            }
            return res.status(200).json({success: true, data: product});
        }catch (error) {
            console.error('Error fetching product:', error);
            return res.status(500).json({success: false, message: error.message});
        }
    },
    createProduct: async (req, res) => {
        try {
            const productData = {
                ...req.body,
                image_url: req.body.image_url || null,
            };

            const newProduct = await ProductService.createProduct(productData);
            return res.status(201).json({success: true, data: newProduct});
        }catch (error) {
            console.error('Error creating product:', error);
            return res.status(500).json({success: false, message: error.message});
        }
    },
    updateProduct: async (req, res) => {
        try {
            const { id } = req.params;
            const existingProduct = await ProductService.getProductById(id);

            if (!existingProduct) {
                return res.status(404).json({success: false, message: 'Product not found'});
            }

            const updateData = {
                ...existingProduct,
                ...req.body,
                image_url: req.body.image_url || existingProduct.image_url,
            };

            const updatedProduct = await ProductService.updateProduct(id, updateData);
            if (!updatedProduct) {
                return res.status(404).json({success: false, message: 'Product not found'});
            }
            return res.status(200).json({success: true, data: updatedProduct});
        }catch (error) {
            console.error('Error updating product:', error);
            return res.status(500).json({success: false, message: error.message});
        }
    },
    deleteProduct: async (req, res) => {
        try {
            const { id } = req.params;
            const deletedProduct = await ProductService.deleteProduct(id);
            if (!deletedProduct) {
                return res.status(404).json({success: false, message: 'Product not found'});
            }
            return res.status(200).json({success: true, data: deletedProduct});
        }catch (error) {
            console.error('Error deleting product:', error);
            return res.status(500).json({success: false, message: error.message});
        }
    }
};

module.exports = productController;