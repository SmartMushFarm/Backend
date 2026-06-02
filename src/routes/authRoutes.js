const express = require('express');
const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

const router = express.Router();

/**
 * @openapi
 * tags:
 *   - name: Auth
 *     description: Authentication APIs
 */

/**
 * @openapi
 * components:
 *   schemas:
 *     AuthRegisterInput:
 *       type: object
 *       required:
 *         - full_name
 *         - email
 *         - password
 *       properties:
 *         full_name:
 *           type: string
 *           example: Nguyen Van A
 *         email:
 *           type: string
 *           format: email
 *           example: vana@gmail.com
 *         password:
 *           type: string
 *           example: 123456
 *         phone_number:
 *           type: string
 *           example: 0123456789
 *         address:
 *           type: string
 *           example: Ho Chi Minh
 *     AuthLoginInput:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: vana@gmail.com
 *         password:
 *           type: string
 *           example: 123456
 *     UserResponse:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         full_name:
 *           type: string
 *           example: Nguyen Van A
 *         email:
 *           type: string
 *           example: vana@gmail.com
 *         phone_number:
 *           type: string
 *           example: 0123456789
 *         address:
 *           type: string
 *           example: Ho Chi Minh
 *         role:
 *           type: string
 *           example: user
 *         status:
 *           type: string
 *           example: Active
 *         created_at:
 *           type: string
 *           format: date-time
 *     UsersResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         users:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/UserResponse'
 */

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Register new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AuthRegisterInput'
 *           example:
 *             full_name: Nguyen Van A
 *             email: vana@gmail.com
 *             password: "123456"
 *             phone_number: "0123456789"
 *             address: Ho Chi Minh
 *     responses:
 *       201:
 *         description: User registered successfully
 */
router.post('/register', authController.register);

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Login user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AuthLoginInput'
 *           example:
 *             email: vana@gmail.com
 *             password: "123456"
 *     responses:
 *       200:
 *         description: Login successful
 */
router.post('/login', authController.login);

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     tags:
 *       - Auth
 *     summary: Get current logged-in user
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Current user info
 */
router.get('/me', authMiddleware, authController.me);

/**
 * @openapi
 * /api/auth/users:
 *   get:
 *     tags: [Auth]
 *     summary: Admin - Get all users
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List of users
 */
router.get('/users', authMiddleware, roleMiddleware('Admin'), authController.getUsers);

/**
 * @openapi
 * /api/auth/users/{id}/status:
 *   put:
 *     tags: [Auth]
 *     summary: Admin - Update user status (Active/Inactive)
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
 *             properties:
 *               status: { type: string, example: Inactive }
 *     responses:
 *       200:
 *         description: User status updated
 */
router.put('/users/:id/status', authMiddleware, roleMiddleware('Admin'), authController.updateUserStatus);

module.exports = router;
