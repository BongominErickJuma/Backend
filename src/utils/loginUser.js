const bcrypt = require('bcryptjs');
const db = require('../config/db.config');
const AppError = require('./appError');
const createSendToken = require('./createSendToken ');

const loginUser = async ({
  table,
  identifierField,
  identifierValue,
  passwordField,
  passwordValue,
  idField,
  tokenTable,
  res,
  next,
  notFoundMsg,
  invalidMsg
}) => {
  // 1. Validate inputs
  if (!identifierValue || !passwordValue) {
    return next(
      new AppError(`Please provide ${identifierField} and password`, 400)
    );
  }

  // 2. Fetch user record
  const [rows] = await db.query(
    `SELECT * FROM ${table} WHERE ${identifierField} = ?`,
    [identifierValue.trim()]
  );

  if (rows.length === 0) {
    return next(new AppError(notFoundMsg, 404));
  }

  const user = rows[0];

  // 3. Check verification for partner_organizations
  if (table === 'partner_organizations' && !user.is_verified) {
    return next(
      new AppError(
        'Your account has not been verified yet. Please wait for approval.',
        403
      )
    );
  }

  // 3. Compare passwords
  const isMatch = await bcrypt.compare(passwordValue, user[passwordField]);
  if (!isMatch) {
    return next(new AppError(invalidMsg, 401));
  }

  // 4. Remove password before sending
  delete user[passwordField];
  // 5. Create and send token

  createSendToken(res, user, user[idField], tokenTable, 200);
};

module.exports = loginUser;
