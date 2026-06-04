const express = require('express');
const orderController = require('../controllers/orderController');
const maintenanceController = require('../controllers/maintenanceController');
const dashboardController = require('../controllers/dashboardController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

const router = express.Router();

// All admin routes require auth + Admin role
router.use(authMiddleware, roleMiddleware('Admin'));

// Orders
router.get('/orders', orderController.getAllOrders);
router.put('/orders/:id/status', orderController.updateOrderStatus);

// Maintenance
router.get('/maintenance-requests', maintenanceController.getAllRequests);
router.put('/maintenance-requests/:id/approve', maintenanceController.approve);
router.put('/maintenance-requests/:id/schedule', maintenanceController.schedule);
router.put('/maintenance-requests/:id/cancel', maintenanceController.cancel);
router.put('/maintenance-requests/:id/confirm-completed', maintenanceController.confirmCompleted);

// Dashboard
router.get('/dashboard/revenue', dashboardController.revenue);
router.get('/dashboard/orders', dashboardController.orders);
router.get('/dashboard/users', dashboardController.users);
router.get('/dashboard/maintenance', dashboardController.maintenance);
router.get('/dashboard/products', dashboardController.products);

module.exports = router;
