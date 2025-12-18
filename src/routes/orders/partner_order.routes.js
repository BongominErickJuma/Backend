const express = require('express');
const orderController = require('../../controllers/orders.controller');
const authController = require('../../controllers/auth.controller');

const router = express.Router({ mergeParams: true });

// All routes require authentication
router.use(authController.protect);
router.use(authController.restrictTo('partner_organizations'));

// Partner-specific routes
router.get('/get_client_order_details', orderController.getClientOrders);

router.get('/track_order/:id', orderController.getOrder);

router.patch('/accept_order/:id', orderController.acceptOrder);

router.patch(
  '/assign_order_for_delivery/:id',
  orderController.assignOrderForDelivery
);

router.patch('/cancel_order/:id', orderController.cancelOrder);

module.exports = router;
