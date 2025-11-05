const bcrypt = require('bcryptjs');
const db = require('../config/db.config');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.signupAdmins = catchAsync(async (req, res, next) => {
  const data = req.body;

  if (!data.email || !data.password_hash) {
    return next(new AppError('Please provide email and password', 400));
  }

  data.password_hash = await bcrypt.hash(data.password_hash, 12);

  const result = await db.query('INSERT INTO super_administrators SET ?', [
    data
  ]);

  const [newPatient] = await db.query(
    'SELECT * FROM super_administrators WHERE admin_id = ?',
    [result[0].insertId]
  );

  res.status(201).json({
    status: 'success',
    message: 'Your Data has been saved successfully',
    data: newPatient[0]
  });
});
