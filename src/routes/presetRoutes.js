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

router.get('/', authMiddleware, presetController.getAll);
router.post('/', authMiddleware, roleMiddleware('Admin'), presetController.create);
router.put('/:id', authMiddleware, roleMiddleware('Admin'), presetController.update);
router.delete('/:id', authMiddleware, roleMiddleware('Admin'), presetController.delete);

module.exports = router;
