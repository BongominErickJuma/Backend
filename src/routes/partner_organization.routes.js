const express = require('express');
const orgController = require('../controllers/partner_organizations.controller');
const loginAuthController = require('../controllers/auth/loginAuth.controller');
const authController = require('../controllers/auth.controller');
const partnerUserRoutes = require('./partner_user.routes');

const router = express.Router();

router.post('/', orgController.addOrganization);
router.post('/login', loginAuthController.loginOrg);
router.get('/logout', authController.logout);

// Login Organization Users

router.post('/login/users', loginAuthController.loginPartnerUser);

router.use(authController.protect);

// Partner Organization User Routes

router.use('/users', partnerUserRoutes);
router.use('/:orgId/users', partnerUserRoutes);

// router.post('changePassword', orgController.changeOrgPassword);

router.route('/').get(orgController.getAllOrganizations);

router
  .route('/:id')
  .get(orgController.getOneOrganization)
  .delete(orgController.deleteOrganization)
  .patch(orgController.updateOrganization);

module.exports = router;
