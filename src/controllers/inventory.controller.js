const db = require('../config/db.config');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');


function computeStatus(stock_qty, expiry_date) {
  const today = new Date();
  const expDate = new Date(expiry_date);

  // 1. Out of stock
  if (stock_qty <= 0) return "Out of stock";

  // 2. Expired
  if (expDate < today) return "Expired";

  // 3. Low in stock (below 200)
  if (stock_qty < 200) return "Low in stock";

  // 4. In-stock (200+)
  return "In-stock";
}


exports.getAllInventories = catchAsync(async (req, res, next) => {
   const orgId = req.user.partner_id;

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

  data.partner_id = req.user.partner_id;

  // Compute status before insert
  data.status = computeStatus(data.stock_qty, data.expiry_date);

  const [result] = await db.query('INSERT INTO inventory SET ?', [data]);
  const [newRows] = await db.query(
    'SELECT * FROM inventory WHERE inventory_id = ?',
    [result.insertId]
  );

  res.status(201).json({
    status: 'success',
    partnerInventory: newRows[0]
  });
});


exports.updateInventory = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const data = req.body;

  const [existingRows] = await db.query(
    'SELECT * FROM inventory WHERE inventory_id = ?',
    [id]
  );
  if (existingRows.length === 0) {
    return next(new AppError('Partner Inventory not found', 404));
  }

  // Use updated or existing values to compute accurate status
  const updatedStock = data.stock_qty ?? existingRows[0].stock_qty;
  const updatedExpiry = data.expiry_date ?? existingRows[0].expiry_date;

  data.status = computeStatus(updatedStock, updatedExpiry);

  await db.query('UPDATE inventory SET ? WHERE inventory_id = ?', [data, id]);

  const [updatedRows] = await db.query(
    'SELECT * FROM inventory WHERE inventory_id = ?', [id]
  );

  res.status(200).json({
    status: 'success',
    partnerInventory: updatedRows[0]
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
