const express = require('express');
const healthRoutes = require('./index');
const authRoutes = require('./authRoutes');
const productRoutes = require('./productRoutes');
const categoryRoutes = require('./categoryRoutes');
const uploadRoutes = require('./uploadRoutes');
const cartRoutes = require('./cartRoutes');
const orderRoutes = require('./orderRoutes');
const paymentRoutes = require('./paymentRoutes');
const deviceRoutes = require('./deviceRoutes');
const presetRoutes = require('./presetRoutes');
const componentRoutes = require('./componentRoutes');
const maintenanceRoutes = require('./maintenanceRoutes');
const repairBillRoutes = require('./repairBillRoutes');
const notificationRoutes = require('./notificationRoutes');
const technicianRoutes = require('./technicianRoutes');
const adminRoutes = require('./adminRoutes');

const router = express.Router();

router.use('/', healthRoutes);
router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/categories', categoryRoutes);
router.use('/uploads', uploadRoutes);
router.use('/cart', cartRoutes);
router.use('/orders', orderRoutes);
router.use('/payments', paymentRoutes);
router.use('/devices', deviceRoutes);
router.use('/presets', presetRoutes);
router.use('/components', componentRoutes);
router.use('/maintenance-requests', maintenanceRoutes);
router.use('/repair-bills', repairBillRoutes);
router.use('/notifications', notificationRoutes);
router.use('/technician', technicianRoutes);
router.use('/admin', adminRoutes);

module.exports = router;
