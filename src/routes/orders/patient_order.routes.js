const express = require('express');
const orderController = require('../../controllers/orders.controller');
const authController = require('../../controllers/auth.controller');

const router = express.Router({ mergeParams: true });

// All routes require authentication
router.use(authController.protect);
router.use(authController.restrictTo('patients'));

// Patient-specific routes
router.post('/place_order', orderController.placeOrder);

router.get('/track_order/:id', orderController.getOrder);

router.get('/my_orders', orderController.getMyOrders);

router.patch('/cancel_order/:id', orderController.cancelOrder);

router.patch('/approve_delivery/:id', orderController.approveDelivery);

module.exports = router;
