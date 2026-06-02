const express = require('express');
const { getHealth } = require('../controllers/health.controller');

const router = express.Router();
const deviceRoutes = require("./deviceRoutes");
const historyRoutes = require("./historyRoutes");

router.use("/devices", deviceRoutes);
router.use("/history", historyRoutes);
/**
 * @openapi
 * /api/health:
 *   get:
 *     tags:
 *       - Health
 *     summary: Check API health
 *     responses:
 *       200:
 *         description: API is healthy
 */
router.get('/health', getHealth);

module.exports = router;