const express = require('express');
const authController = require('../controllers/authController');

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
 *     summary: Get all users from User table
 *     responses:
 *       200:
 *         description: List of all users
 */
router.get('/me', authController.me);

module.exports = router;