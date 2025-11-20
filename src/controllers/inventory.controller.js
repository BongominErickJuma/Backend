const db = require('../config/db.config');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.getAllInventories = catchAsync(async (req, res, next) => {
  const { orgId } = req.params;

  const [partnerInventories] = await db.query(
    'SELECT * FROM inventory WHERE partner_id = ?',
    [orgId]
  );

  res.status(200).json({
    status: 'success',
    results: partnerInventories.length,
    partnerInventories
  });
});

exports.getInventory = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const [rows] = await db.query(
    'SELECT * FROM inventory WHERE inventory_id = ?',
    [id]
  );
  if (rows.length === 0) {
    return next(new AppError('Partner Inventory not found', 404));
  }
  const partnerInventory = rows[0];
  res.status(200).json({
    status: 'success',
    partnerInventory
  });
});

exports.addInventory = catchAsync(async (req, res, next) => {
  const data = req.body;
  //   data.parthner_id

  data.partner_id = req.user.partner_id;

  const [result] = await db.query('INSERT INTO inventory SET ?', [data]);
  const [newPartnerInventory] = await db.query(
    'SELECT * FROM inventory WHERE inventory_id = ?',
    [result.insertId]
  );
  const newInventory = newPartnerInventory[0];
  res.status(201).json({
    status: 'success',
    partnerInventory: newInventory
  });
});

exports.updateInventory = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const data = req.body;
  const [existingInventoryRows] = await db.query(
    'SELECT * FROM inventory WHERE inventory_id = ?',
    [id]
  );
  if (existingInventoryRows.length === 0) {
    return next(new AppError('Partner Inventory not found', 404));
  }
  await db.query('UPDATE inventory SET ? WHERE inventory_id = ?', [data, id]);
  const [updatedInventoryRows] = await db.query(
    'SELECT * FROM inventory WHERE inventory_id = ?',
    [id]
  );
  const updatedInventory = updatedInventoryRows[0];
  res.status(200).json({
    status: 'success',
    partnerInventory: updatedInventory
  });
});

exports.deleteInventory = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const [rows] = await db.query(
    'DELETE FROM inventory WHERE inventory_id = ?',
    [id]
  );

  if (rows.affectedRows === 0) {
    return next(new AppError('Partner Inventory not found', 404));
  }

  res.status(204).json({
    status: 'success',
    message: 'Partner inventory deleted successfully'
  });
});
