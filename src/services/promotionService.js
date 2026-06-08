const Promotion = require('../models/promotionModel');

const createHttpError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const VALID_STATUSES = ['Active', 'Inactive'];

const normalizePromotionInput = (payload, { partial = false } = {}) => {
  const code = typeof payload.code === 'string' ? payload.code.trim().toUpperCase() : undefined;
  const discountPercent = payload.discount_percent;
  const status = payload.status;
  const validFrom = payload.valid_from || null;
  const validTo = payload.valid_to || null;

  if (!partial && !code) throw createHttpError(400, 'code is required');
  if (code === '') throw createHttpError(400, 'code is required');

  if (!partial && (discountPercent === undefined || discountPercent === null || discountPercent === '')) {
    throw createHttpError(400, 'discount_percent is required');
  }

  let normalizedDiscount;
  if (discountPercent !== undefined && discountPercent !== null && discountPercent !== '') {
    normalizedDiscount = Number(discountPercent);
    if (!Number.isFinite(normalizedDiscount) || normalizedDiscount < 0 || normalizedDiscount > 100) {
      throw createHttpError(400, 'discount_percent must be between 0 and 100');
    }
  }

  if (status !== undefined && !VALID_STATUSES.includes(status)) {
    throw createHttpError(400, `status must be one of: ${VALID_STATUSES.join(', ')}`);
  }

  if (validFrom && Number.isNaN(Date.parse(validFrom))) {
    throw createHttpError(400, 'valid_from must be a valid date');
  }

  if (validTo && Number.isNaN(Date.parse(validTo))) {
    throw createHttpError(400, 'valid_to must be a valid date');
  }

  if (validFrom && validTo && new Date(validTo) < new Date(validFrom)) {
    throw createHttpError(400, 'valid_to must be greater than or equal to valid_from');
  }

  return {
    code,
    discount_percent: normalizedDiscount,
    valid_from: validFrom,
    valid_to: validTo,
    status,
  };
};

const handleDbError = (error) => {
  if (error.code === '23505') throw createHttpError(409, 'Promotion code already exists');
  if (error.code === '23514') throw createHttpError(400, 'Promotion data violates database constraints');
  throw error;
};

const promotionService = {
  getAllPromotions: async () => Promotion.find(),

  getPromotionById: async (id) => Promotion.findById(id),

  getPromotionByCode: async (code) => Promotion.findByCode(code),

  createPromotion: async (payload) => {
    const data = normalizePromotionInput(payload);
    try {
      return await Promotion.create(data);
    } catch (error) {
      handleDbError(error);
    }
  },

  updatePromotion: async (id, payload) => {
    const existing = await Promotion.findById(id);
    if (!existing) return null;

    const data = normalizePromotionInput(
      {
        code: payload.code,
        discount_percent: payload.discount_percent,
        valid_from: payload.valid_from ?? existing.valid_from,
        valid_to: payload.valid_to ?? existing.valid_to,
        status: payload.status,
      },
      { partial: true }
    );

    try {
      return await Promotion.findByIdAndUpdate(id, data);
    } catch (error) {
      handleDbError(error);
    }
  },

  deletePromotion: async (id) => Promotion.findByIdAndDelete(id),
};

module.exports = promotionService;
