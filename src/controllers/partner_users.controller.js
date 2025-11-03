const catchAsync = require('../utils/catchAsync');
const db = require('../config/db.config');
const AppError = require('../utils/appError');
const bcrypt = require('bcryptjs');

exports.getOneOrganizationPartnerUsers = catchAsync(async (req, res, next) => {
  const { orgId } = req.params;

  const [partnerUsers] = await db.query(
    'SELECT * FROM partner_users WHERE partner_id = ?',
    [orgId]
  );

  res.status(200).json({
    status: 'success',
    results: partnerUsers.length,
    partnerUsers
  });
});

exports.getOnePartnerUser = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const [rows] = await db.query(
    'SELECT * FROM partner_users WHERE user_id = ?',
    [id]
  );
  if (rows.length === 0) {
    return next(new AppError('Partner user not found', 404));
  }
  const partnerUser = rows[0];
  res.status(200).json({
    status: 'success',
    partnerUser
  });
});

exports.addPartnerUser = catchAsync(async (req, res, next) => {
  const data = req.body;
  //   data.parthner_id
  data.partner_id = req.user.partner_id; // Assuming req.user contains the authenticated user's info

  console.log('Adding Partner User with data:', data);

  data.password_hash = await bcrypt.hash(data.password_hash, 12);

  const [result] = await db.query('INSERT INTO partner_users SET ?', [data]);
  const [newUserRows] = await db.query(
    'SELECT * FROM partner_users WHERE user_id = ?',
    [result.insertId]
  );
  const newUser = newUserRows[0];
  res.status(201).json({
    status: 'success',
    partnerUser: newUser
  });
});

exports.updatePartnerUser = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const data = req.body;
  const [existingUserRows] = await db.query(
    'SELECT * FROM partner_users WHERE user_id = ?',
    [id]
  );
  if (existingUserRows.length === 0) {
    return next(new AppError('Partner user not found', 404));
  }
  await db.query('UPDATE partner_users SET ? WHERE user_id = ?', [data, id]);
  const [updatedUserRows] = await db.query(
    'SELECT * FROM partner_users WHERE user_id = ?',
    [id]
  );
  const updatedUser = updatedUserRows[0];
  res.status(200).json({
    status: 'success',
    partnerUser: updatedUser
  });
});

exports.deletePartnerUser = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const [rows] = await db.query('DELETE FROM partner_users WHERE user_id = ?', [
    id
  ]);

  if (rows.affectedRows === 0) {
    return next(new AppError('Partner user not found', 404));
  }

  res.status(204).json({
    status: 'success',
    message: 'Partner user deleted successfully'
  });
});
