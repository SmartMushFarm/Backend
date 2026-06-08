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
 *         - name
 *         - email
 *         - password
 *       properties:
 *         name:
 *           type: string
 *           example: Nguyen Van A
 *         email:
 *           type: string
 *           format: email
 *           example: vana@gmail.com
 *         password:
 *           type: string
 *           example: 123456
 *         phone:
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
 *         name:
 *           type: string
 *           example: Nguyen Van A
 *         email:
 *           type: string
 *           example: vana@gmail.com
 *         phone:
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
 *     UserUpdateInput:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           example: Nguyen Van B
 *         phone:
 *           type: string
 *           nullable: true
 *           example: 0987654321
 *         address:
 *           type: string
 *           nullable: true
 *           example: Da Nang
 *     ChangePasswordInput:
 *       type: object
 *       required:
 *         - old_password
 *         - new_password
 *       properties:
 *         old_password:
 *           type: string
 *           example: "123456"
 *         new_password:
 *           type: string
 *           example: "newpassword123"
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
 *             name: Nguyen Van A
 *             email: vana@gmail.com
 *             password: "123456"
 *             phone: "0123456789"
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
 * /api/auth/me:
 *   put:
 *     tags:
 *       - Auth
 *     summary: Update current logged-in user profile
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserUpdateInput'
 *           example:
 *             name: Nguyen Van B
 *             phone: "0987654321"
 *             address: Da Nang
 *     responses:
 *       200:
 *         description: User profile updated
 */
router.put('/me', authMiddleware, authController.updateMe);

/**
 * @openapi
 * /api/auth/change-password:
 *   put:
 *     tags:
 *       - Auth
 *     summary: Change current user's password
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ChangePasswordInput'
 *           example:
 *             old_password: "123456"
 *             new_password: "newpassword123"
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       401:
 *         description: Old password is incorrect
 */
router.put('/change-password', authMiddleware, authController.changePassword);

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
 * /api/auth/users/{id}:
 *   put:
 *     tags: [Auth]
 *     summary: Admin - Update user information
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
 *             $ref: '#/components/schemas/UserUpdateInput'
 *     responses:
 *       200:
 *         description: User updated
 *       403:
 *         description: Admin only
 *       404:
 *         description: User not found
 */
router.put('/users/:id', authMiddleware, roleMiddleware('Admin'), authController.updateUser);

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
