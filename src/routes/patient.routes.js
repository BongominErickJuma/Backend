const express = require('express');
const patientController = require('../controllers/patients.controller');
const loginAuthController = require('../controllers/auth/loginAuth.controller');
const authController = require('../controllers/auth.controller');

const router = express.Router();

router.post('/signup', patientController.signup);
router.post('/login', loginAuthController.loginPatients);
router.get('/logout', authController.logout);

router.use(authController.protect);

router.route('/').get(patientController.getAllPatients);

router
  .route('/:id')
  .get(patientController.getOnePatient)
  .delete(patientController.deletePatient)
  .patch(patientController.updatePatient);

module.exports = router;
