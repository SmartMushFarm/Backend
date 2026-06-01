const express = require("express");
const router = express.Router();

const deviceController = require("../controllers/deviceController");

/**
 * @swagger
 * tags:
 *   name: Devices
 *   description: Device APIs and MQTT control
 */

/**
 * @swagger
 * /api/devices:
 *   get:
 *     summary: Get all devices
 *     tags: [Devices]
 *     responses:
 *       200:
 *         description: Get all devices successfully
 */
router.get("/", deviceController.getAllDevices);

/**
 * @swagger
 * /api/devices/{id}:
 *   get:
 *     summary: Get device by id
 *     tags: [Devices]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Device database id
 *     responses:
 *       200:
 *         description: Get device successfully
 *       404:
 *         description: Device not found
 */
router.get("/:id", deviceController.getDeviceById);

/**
 * @swagger
 * /api/devices/{id}/control:
 *   post:
 *     summary: Control MOSFET by MQTT
 *     tags: [Devices]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Device database id
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - device
 *               - action
 *             properties:
 *               device:
 *                 type: string
 *                 enum: [fan, heater, mist, all]
 *                 example: fan
 *               action:
 *                 type: string
 *                 enum: [on, off]
 *                 example: on
 *     responses:
 *       200:
 *         description: Command sent successfully
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 */
router.post("/:id/control", deviceController.controlDevice);

module.exports = router;