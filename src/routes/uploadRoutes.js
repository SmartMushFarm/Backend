const express = require('express');
const router = express.Router();

const { upload, uploadToCloudinary } = require('../middlewares/uploadImage');

/**
 * @openapi
 * /api/uploads/image:
 *   post:
 *     tags:
 *       - Uploads
 *     summary: Upload a single image and return its URL
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Uploaded image URL
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 image_url:
 *                   type: string
 */
router.post('/image', upload.single('image'), uploadToCloudinary, (req, res) => {
    res.json({
        success: true,
        message: 'Image uploaded successfully',
        image_url: req.body.image_url,
        public_id: req.cloudinary_id || null,
    });
});

/**
 * @openapi
 * /api/uploads/images:
 *   post:
 *     tags:
 *       - Uploads
 *     summary: Upload multiple images (up to 5) and return their URLs
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Uploaded image URLs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 image_urls:
 *                   type: array
 *                   items:
 *                     type: string
 */
router.post('/images', upload.array('images', 5), uploadToCloudinary, (req, res) => {
    res.json({
        success: true,
        message: 'Images uploaded successfully',
        image_urls: req.body.image_urls,
        public_ids: req.cloudinary_ids || null,
    });
});

module.exports = router;