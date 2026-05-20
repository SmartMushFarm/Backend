const CategoryService = require('../services/categoryService');

const categoryController = {
  getAllCategories: async (req, res) => {
    try {
      const categories = await CategoryService.getAllCategories();
      return res.status(200).json({ success: true, data: categories });
    } catch (error) {
      console.error('Error fetching categories:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  getCategoryById: async (req, res) => {
    try {
      const { id } = req.params;
      const category = await CategoryService.getCategoryById(id);

      if (!category) {
        return res.status(404).json({ success: false, message: 'Category not found' });
      }

      return res.status(200).json({ success: true, data: category });
    } catch (error) {
      console.error('Error fetching category:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  createCategory: async (req, res) => {
    try {
      const { name } = req.body;

      if (!name) {
        return res.status(400).json({ success: false, message: 'name is required' });
      }

      const newCategory = await CategoryService.createCategory(req.body);
      return res.status(201).json({ success: true, data: newCategory });
    } catch (error) {
      console.error('Error creating category:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  updateCategory: async (req, res) => {
    try {
      const { id } = req.params;
      const { name } = req.body;

      if (!name) {
        return res.status(400).json({ success: false, message: 'name is required' });
      }

      const updatedCategory = await CategoryService.updateCategory(id, req.body);

      if (!updatedCategory) {
        return res.status(404).json({ success: false, message: 'Category not found' });
      }

      return res.status(200).json({ success: true, data: updatedCategory });
    } catch (error) {
      console.error('Error updating category:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  deleteCategory: async (req, res) => {
    try {
      const { id } = req.params;
      const deletedCategory = await CategoryService.deleteCategory(id);

      if (!deletedCategory) {
        return res.status(404).json({ success: false, message: 'Category not found' });
      }

      return res.status(200).json({ success: true, data: deletedCategory });
    } catch (error) {
      console.error('Error deleting category:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },
};

module.exports = categoryController;