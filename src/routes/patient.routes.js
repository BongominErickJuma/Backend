const express = require('express');
const patientController = require('../controllers/patients.controller');
const authController = require('../controllers/auth.controller');

const router = express.Router();

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.get('/logout', authController.logout);

router.use(authController.protect);

router.route('/').get(patientController.getAllPatients);

router
  .route('/:id')
  .get(patientController.getOnePatient)
  .delete(patientController.deletePatient)
  .patch(patientController.updatePatient);

module.exports = router;
