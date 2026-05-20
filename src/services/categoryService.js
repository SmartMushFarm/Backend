const Category = require('../models/categoryModel');

const categoryService = {
  getAllCategories: async () => {
    return await Category.find();
  },

  getCategoryById: async (id) => {
    return await Category.findById(id);
  },

  createCategory: async (categoryData) => {
    return await Category.create(categoryData);
  },

  updateCategory: async (id, updateData) => {
    return await Category.findByIdAndUpdate(id, updateData);
  },

  deleteCategory: async (id) => {
    return await Category.findByIdAndDelete(id);
  },
};

module.exports = categoryService;