const express = require('express');
const riderController = require('../controllers/riders.controller');
const loginAuthController = require('../controllers/auth/loginAuth.controller');
const authController = require('../controllers/auth.controller');

const {
  uploadVerificationDocuments,
  resizeVerificationDocuments
} = require('../middlewares/uploadDeliveryRiderDocuments');

const router = express.Router();

router.post(
  '/',
  uploadVerificationDocuments,
  resizeVerificationDocuments,
  riderController.addRider
);
router.post('/login', loginAuthController.loginRider);
router.get('/logout', authController.logout);

router.use(authController.protect);

router.route('/').get(riderController.getDeliveryRiders);

router
  .route('/:id')
  .get(riderController.getRider)
  .delete(riderController.deleteRider)
  .patch(
    uploadVerificationDocuments,
    resizeVerificationDocuments,
    riderController.updateRider
  );

module.exports = router;
