const catchAsync = require('../../utils/catchAsync');
const loginUser = require('../../utils/loginUser');

// login organizations

exports.loginOrg = catchAsync(async (req, res, next) => {
  await loginUser({
    table: 'partner_organizations',
    identifierField: 'facility_email',
    identifierValue: req.body.facility_email,
    passwordField: 'password',
    passwordValue: req.body.password,
    idField: 'partner_id',
    tokenTable: 'partner_organizations',
    res,
    next,
    notFoundMsg: 'Organization not found',
    invalidMsg: 'Incorrect email or password'
  });
});

// login patients

exports.loginPatients = catchAsync(async (req, res, next) => {
  await loginUser({
    table: 'patients',
    identifierField: 'phone_number',
    identifierValue: req.body.phone_number,
    passwordField: 'password_hash',
    passwordValue: req.body.password_hash,
    idField: 'patient_id',
    tokenTable: 'patients',
    res,
    next,
    notFoundMsg: 'Patient not found',
    invalidMsg: 'Incorrect phone number or password'
  });
});

// login Partners Users

exports.loginPartnerUser = catchAsync(async (req, res, next) => {
  await loginUser({
    table: 'partner_users',
    identifierField: 'email',
    identifierValue: req.body.email,
    passwordField: 'password_hash',
    passwordValue: req.body.password_hash,
    idField: 'user_id',
    tokenTable: 'partner_users',
    res,
    next,
    notFoundMsg: 'Partner user not found',
    invalidMsg: 'Incorrect email or password'
  });
});

// login Delivery Riders

exports.loginRider = catchAsync(async (req, res, next) => {
  await loginUser({
    table: 'delivery_riders',
    identifierField: 'phone_number',
    identifierValue: req.body.phone_number,
    passwordField: 'password',
    passwordValue: req.body.password,
    idField: 'rider_id',
    tokenTable: 'delivery_riders',
    res,
    next,
    notFoundMsg: 'Delivery rider not found',
    invalidMsg: 'Incorrect phone number or password'
  });
});

// login Admins

exports.loginAdmin = catchAsync(async (req, res, next) => {
  await loginUser({
    table: 'super_administrators',
    identifierField: 'email',
    identifierValue: req.body.email,
    passwordField: 'password_hash',
    passwordValue: req.body.password_hash,
    idField: 'admin_id',
    tokenTable: 'super_administrators',
    res,
    next,
    notFoundMsg: 'Admin not found',
    invalidMsg: 'Incorrect email or password'
  });
});
