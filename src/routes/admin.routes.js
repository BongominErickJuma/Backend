const express = require('express');
const loginAuthController = require('../controllers/auth/loginAuth.controller');
const adminController = require('../controllers/admin.controller');

const router = express.Router();

router.post('/login', loginAuthController.loginAdmin);
router.post('/signup', adminController.signupAdmins);

module.exports = router;
