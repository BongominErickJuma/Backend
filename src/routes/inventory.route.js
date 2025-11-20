const express = require('express');
const inventoryController = require('../controllers/inventory.controller');

const router = express.Router({ mergeParams: true });

router
  .route('/')
  .get(inventoryController.getAllInventories)
  .post(inventoryController.addInventory);

router
  .route('/:id')
  .get(inventoryController.getInventory)
  .patch(inventoryController.updateInventory)
  .delete(inventoryController.deleteInventory);

module.exports = router;
