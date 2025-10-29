const express = require('express');
const orgController = require('../controllers/partner_organizations.controller');
const authController = require('../controllers/auth.controller');

const router = express.Router();

router.post('/', orgController.addOrganization);
router.post('/login', orgController.loginOrg);
router.get('/logout', authController.logout);

router.use(authController.protect);

router.post('changePassword', orgController.changeOrgPassword);

router.route('/').get(orgController.getAllOrganizations);

router
  .route('/:id')
  .get(orgController.getOneOrganization)
  .delete(orgController.deleteOrganization)
  .patch(orgController.updateOrganization);

module.exports = router;
