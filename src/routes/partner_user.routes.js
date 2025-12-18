const express = require('express');
const partnerUserController = require('../controllers/partner_users.controller');
const authController = require('../controllers/auth.controller');

const router = express.Router({ mergeParams: true });

router.use(authController.protect);
router.use(authController.restrictTo('partner_organizations'));
router
  .route('/')
  .get(partnerUserController.getOneOrganizationPartnerUsers)
  .post(partnerUserController.addPartnerUser);

router
  .route('/:id')
  .get(partnerUserController.getOnePartnerUser)
  .patch(partnerUserController.updatePartnerUser)
  .delete(partnerUserController.deletePartnerUser);

module.exports = router;
