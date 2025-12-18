const express = require('express');
const orderController = require('../../controllers/orders.controller');
const authController = require('../../controllers/auth.controller');

const router = express.Router({ mergeParams: true });

// All routes require authentication
router.use(authController.protect);
router.use(authController.restrictTo('delivery_riders'));

// Rider-specific routes
router.post('/update_location', orderController.updateLocation);

router.get('/my_assigned_orders', orderController.getMyAssignedOrders);

router.patch('/update_order_status/:id', orderController.updateOrderStatus);

router.get('/track_order/:id', orderController.getOrder);

module.exports = router;
