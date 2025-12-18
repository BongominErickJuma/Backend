const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const db = require('../config/db.config');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// LOGOUT USER

exports.logout = (req, res) => {
  res.cookie('gsghjwt', 'loggedOut', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax'
  });

  res.status(200).json({
    status: 'succes',
    message: 'Logout successfull'
  });
};

// PROTECT ROUTES

exports.protect = catchAsync(async (req, res, next) => {
  // 1️ Get token from headers or cookies
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.gsghjwt) {
    token = req.cookies.gsghjwt;
  }

  if (!token) return next(new AppError('You are not logged in', 401));

  // 2️ Verify token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3️ Allowed login types with their ID fields
  const allowedTables = {
    patients: 'patient_id',
    partner_organizations: 'partner_id',
    super_administrators: 'admin_id',
    delivery_riders: 'rider_id' // ADD THIS
  };

  // 4️ Validate loginType
  const tableName = decoded.loginType;
  const idField = allowedTables[tableName];

  if (!idField) {
    return next(new AppError('Invalid login type', 401));
  }

  // 5️ Query correct table and ID column
  const [rows] = await db.query(
    `SELECT * FROM \`${tableName}\` WHERE \`${idField}\` = ?`,
    [decoded.id]
  );

  const currentUser = rows[0];
  if (!currentUser) {
    return next(new AppError('The user no longer exists', 401));
  }

  // 6️ Attach to req
  req.user = currentUser;
  req.loginType = tableName;

  console.log('logged in as:', req.loginType, req.user);
  next();
});

// RESTRICT ACTIONS NOT YET IMPLEMENTED

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.loginType)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }
    next();
  };
};
