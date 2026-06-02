const express = require('express');
const componentController = require('../controllers/componentController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

const router = express.Router();

/**
 * @openapi
 * tags:
 *   - name: Components
 *     description: Device component management
 */
/**
 * @openapi
 * /api/components:
 *   get:
 *     tags: [Components]
 *     summary: Get all components
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List of components
 */
router.get('/', authMiddleware, componentController.getAll);

/**
 * @openapi
 * /api/components:
 *   post:
 *     tags: [Components]
 *     summary: Create a component
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Component created
 */
router.post('/', authMiddleware, roleMiddleware('Admin'), componentController.create);

/**
 * @openapi
 * /api/components/{id}:
 *   put:
 *     tags: [Components]
 *     summary: Update component by id
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Component updated
 */
router.put('/:id', authMiddleware, roleMiddleware('Admin'), componentController.update);

/**
 * @openapi
 * /api/components/{id}:
 *   delete:
 *     tags: [Components]
 *     summary: Delete component by id
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Component deleted
 */
router.delete('/:id', authMiddleware, roleMiddleware('Admin'), componentController.delete);

/**
 * @openapi
 * /api/components/device-components/{id}:
 *   put:
 *     tags: [Components]
 *     summary: Update device-specific component
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Device component updated
 */
router.put('/device-components/:id', authMiddleware, componentController.updateDeviceComponent);

module.exports = router;
