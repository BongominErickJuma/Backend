const express = require('express');
const hospitalController = require('../controllers/hospitals.controller');

const router = express.Router();

router
  .route('/')
  .get(hospitalController.getAllHospitals)
  .post(hospitalController.addHospital);

router
  .route('/:id')
  .get(hospitalController.getOneHospital)
  .delete(hospitalController.deleteHospital)
  .patch(hospitalController.updateHospital);

module.exports = router;
