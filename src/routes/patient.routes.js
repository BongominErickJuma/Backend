const express = require('express');
const patientController = require('../controllers/patients.controller');

const router = express.Router();

router
  .route('/')
  .get(patientController.getAllPatients)
  .post(patientController.addPatient);

router
  .route('/:id')
  .get(patientController.getOnePatient)
  .delete(patientController.deletePatient)
  .patch(patientController.updatePatient);

module.exports = router;
