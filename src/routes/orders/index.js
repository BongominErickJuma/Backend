// routes/orders/index.js
const express = require('express');
const patientOrderRoutes = require('./patient_order.routes');
const partnerOrderRoutes = require('./partner_order.routes');
const adminOrderRoutes = require('./admin_order.routes');
const riderOrderRoutes = require('./rider_order.routes');

const router = express.Router({ mergeParams: true });

// Mount all order routes
router.use('/patient', patientOrderRoutes);
router.use('/partner', partnerOrderRoutes);
router.use('/admin', adminOrderRoutes);
router.use('/rider', riderOrderRoutes);

module.exports = router;
