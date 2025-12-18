const express = require('express');
const orderController = require('../../controllers/orders.controller');
const authController = require('../../controllers/auth.controller');

const router = express.Router({ mergeParams: true });

// All routes require authentication
router.use(authController.protect);
router.use(authController.restrictTo('super_administrators'));

// Admin-specific routes
router.get('/get_order_details', orderController.getAllOrders);

router.get('/get_order_details/:id', orderController.getOrderDetails);

module.exports = router;
