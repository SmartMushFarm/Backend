const express = require('express');
const healthRoutes = require('./index');
const productRoutes = require('./productRoutes');
const categoryRoutes = require('./categoryRoutes');
const uploadRoutes = require('./uploadRoutes');
const authRoutes = require('./authRoutes');

const router = express.Router();

router.use('/', healthRoutes);
router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/categories', categoryRoutes);
router.use('/uploads', uploadRoutes);

module.exports = router;