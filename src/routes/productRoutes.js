const ProductController = require('../controllers/productController');
const express = require('express');
const { upload, uploadToCloudinary } = require('../middlewares/uploadImage');
const router = express.Router();

/**
 * @openapi
 * tags:
 *   - name: Products
 *     description: Product management APIs
 */

/**
 * @openapi
 * components:
 *   schemas:
 *     Product:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         name:
 *           type: string
 *           example: Sample Product
 *         description:
 *           type: string
 *           example: Sample product description
 *         price:
 *           type: number
 *           format: float
 *           example: 129.99
 *         stock_quantity:
 *           type: integer
 *           example: 20
 *         image_url:
 *           type: string
 *           example: https://example.com/image.jpg
 *         status:
 *           type: string
 *           example: active
 *         category_id:
 *           type: integer
 *           nullable: true
 *           example: 2
 *         category_name:
 *           type: string
 *           nullable: true
 *           example: Sample Category
 *         created_at:
 *           type: string
 *           format: date-time
 *     ProductInput:
 *       type: object
 *       required:
 *         - name
 *         - price
 *         - stock_quantity
 *       properties:
 *         name:
 *           type: string
 *           example: Sample Product
 *         description:
 *           type: string
 *           example: Sample product description
 *         price:
 *           type: number
 *           format: float
 *           example: 129.99
 *         stock_quantity:
 *           type: integer
 *           example: 20
 *         image:
 *           type: string
 *           format: binary
 *           description: Choose an image from your device, backend uploads it to Cloudinary and stores the link in image_url
 *         image_url:
 *           type: string
 *           description: Image URL returned after Cloudinary upload
 *         status:
 *           type: string
 *           example: active
 *         category_id:
 *           type: integer
 *           nullable: true
 */

/**
 * @openapi
 * /api/products:
 *   get:
 *     tags:
 *       - Products
 *     summary: Get all products (with category name)
 *     responses:
 *       200:
 *         description: Product list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 */
router.get('/', ProductController.getAllProducts);

/**
 * @openapi
 * /api/products/{id}:
 *   get:
 *     tags:
 *       - Products
 *     summary: Get product by id
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Product detail
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Product'
 *       404:
 *         description: Product not found
 */
router.get('/:id', ProductController.getProductById);

/**
 * @openapi
 * /api/products:
 *   post:
 *     tags:
 *       - Products
 *     summary: Create product and upload image to Cloudinary
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - price
 *               - stock_quantity
 *             properties:
 *               name:
 *                 type: string
 *                 example: Sample Product
 *               description:
 *                 type: string
 *                 example: Sample product description
 *               price:
 *                 type: number
 *                 format: float
 *                 example: 129.99
 *               stock_quantity:
 *                 type: integer
 *                 example: 20
 *               category_id:
 *                 type: integer
 *                 nullable: true
 *                 example: 2
 *               status:
 *                 type: string
 *                 example: active
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Choose an image from your device, backend uploads it to Cloudinary and stores the link in image_url
 *           encoding:
 *             image:
 *               contentType: image/*
 *     responses:
 *       201:
 *         description: Created
 *       500:
 *         description: Server error
 */
router.post('/', upload.single('image'), uploadToCloudinary, ProductController.createProduct);

/**
 * @openapi
 * /api/products/{id}:
 *   put:
 *     tags:
 *       - Products
 *     summary: Update product and Cloudinary image
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - price
 *               - stock_quantity
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *                 format: float
 *               stock_quantity:
 *                 type: integer
 *               category_id:
 *                 type: integer
 *                 nullable: true
 *               status:
 *                 type: string
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Nếu chọn ảnh mới, backend upload Cloudinary và cập nhật image_url
 *           encoding:
 *             image:
 *               contentType: image/*
 *     responses:
 *       200:
 *         description: Updated
 *       404:
 *         description: Product not found
 */
router.put('/:id', upload.single('image'), uploadToCloudinary, ProductController.updateProduct);

/**
 * @openapi
 * /api/products/{id}:
 *   delete:
 *     tags:
 *       - Products
 *     summary: Delete product by id
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Deleted
 *       404:
 *         description: Product not found
 */
router.delete('/:id', ProductController.deleteProduct);

module.exports = router;