const promotionService = require('../services/promotionService');

const sendError = (res, error) => {
  const status = error.status || 500;
  return res.status(status).json({
    success: false,
    message: error.message || 'Internal Server Error',
  });
};

const promotionController = {
  getAllPromotions: async (req, res) => {
    try {
      const promotions = await promotionService.getAllPromotions();
      return res.status(200).json({ success: true, data: promotions });
    } catch (error) {
      return sendError(res, error);
    }
  },

  getPromotionById: async (req, res) => {
    try {
      const promotion = await promotionService.getPromotionById(req.params.id);
      if (!promotion) {
        return res.status(404).json({ success: false, message: 'Promotion not found' });
      }
      return res.status(200).json({ success: true, data: promotion });
    } catch (error) {
      return sendError(res, error);
    }
  },

  getPromotionByCode: async (req, res) => {
    try {
      const promotion = await promotionService.getPromotionByCode(req.params.code);
      if (!promotion) {
        return res.status(404).json({ success: false, message: 'Promotion not found' });
      }
      return res.status(200).json({ success: true, data: promotion });
    } catch (error) {
      return sendError(res, error);
    }
  },

  createPromotion: async (req, res) => {
    try {
      const promotion = await promotionService.createPromotion(req.body);
      return res.status(201).json({ success: true, data: promotion });
    } catch (error) {
      return sendError(res, error);
    }
  },

  updatePromotion: async (req, res) => {
    try {
      const promotion = await promotionService.updatePromotion(req.params.id, req.body);
      if (!promotion) {
        return res.status(404).json({ success: false, message: 'Promotion not found' });
      }
      return res.status(200).json({ success: true, data: promotion });
    } catch (error) {
      return sendError(res, error);
    }
  },

  deletePromotion: async (req, res) => {
    try {
      const promotion = await promotionService.deletePromotion(req.params.id);
      if (!promotion) {
        return res.status(404).json({ success: false, message: 'Promotion not found' });
      }
      return res.status(200).json({ success: true, data: promotion });
    } catch (error) {
      return sendError(res, error);
    }
  },
};

module.exports = promotionController;
