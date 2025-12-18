const express = require('express');
const authController = require('../controllers/auth.controller');
const statController = require('../controllers/stats.controller');

const router = express.Router();

router.use(authController.protect);

router.get(
  '/sadmin',
  authController.restrictTo('super_administrators'),
  statController.getSuperAdminStats
);
router.get('/main', statController.getMainStats);

module.exports = router;
