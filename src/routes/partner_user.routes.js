const express = require('express');
const partnerUserController = require('../controllers/partner_users.controller');

const router = express.Router({ mergeParams: true });

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
