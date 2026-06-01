const express = require("express");
const router = express.Router();

const historyController = require("../controllers/historyController");

/**
 * @swagger
 * tags:
 *   name: History
 *   description: Sensor history APIs
 */

/**
 * @swagger
 * /api/history/device/{deviceId}:
 *   get:
 *     summary: Get sensor history by device id
 *     tags: [History]
 *     parameters:
 *       - in: path
 *         name: deviceId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Device database id
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           example: 50
 *         description: Number of records to return
 *     responses:
 *       200:
 *         description: Get history successfully
 *       500:
 *         description: Server error
 */
router.get("/device/:deviceId", historyController.getHistoryByDeviceId);

/**
 * @swagger
 * /api/history/device/{deviceId}/latest:
 *   get:
 *     summary: Get latest sensor data by device id
 *     tags: [History]
 *     parameters:
 *       - in: path
 *         name: deviceId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Device database id
 *     responses:
 *       200:
 *         description: Get latest history successfully
 *       500:
 *         description: Server error
 */
router.get(
  "/device/:deviceId/latest",
  historyController.getLatestHistoryByDeviceId
);

module.exports = router;