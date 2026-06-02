const express = require('express');
const presetController = require('../controllers/presetController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

const router = express.Router();

/**
 * @openapi
 * tags:
 *   - name: Presets
 *     description: Mushroom growing presets
 */

/**
 * @openapi
 * /api/presets:
 *   get:
 *     summary: Get presets (recommended or created by user)
 *     tags: [Presets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: false
 *         schema:
 *           type: integer
 *         description: User id to filter presets (recommended OR created_by = userId)
 *     responses:
 *       200:
 *         description: List of presets
 */
router.get('/', authMiddleware, presetController.getAll);

/**
 * @openapi
 * /api/presets:
 *   post:
 *     summary: Create a new preset
 *     tags: [Presets]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Preset created
 */
router.post('/', authMiddleware, roleMiddleware('Admin'), presetController.create);

/**
 * @openapi
 * /api/presets/{id}:
 *   put:
 *     summary: Update preset
 *     tags: [Presets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Preset updated
 */
router.put('/:id', authMiddleware, roleMiddleware('Admin'), presetController.update);

/**
 * @openapi
 * /api/presets/{id}:
 *   delete:
 *     summary: Delete preset
 *     tags: [Presets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Preset deleted
 */
router.delete('/:id', authMiddleware, roleMiddleware('Admin'), presetController.delete);

module.exports = router;
