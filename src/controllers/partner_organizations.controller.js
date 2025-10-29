const bcrypt = require('bcryptjs');
const db = require('../config/db.config');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const MySQLAPIFeatures = require('../utils/mySQLAPIFeatures');
const createSendToken = require('../utils/createSendToken ');

const {
  allowedOrganizationFields,
  requiredFields
} = require('../config/partnerOrganizationFields');
const {
  processFieldValue,
  validateRequiredFields,
  filterAllowedFields
} = require('../utils/fieldProcessor');

exports.getAllOrganizations = catchAsync(async (req, res, next) => {
  const baseQuery = 'SELECT * FROM partner_organizations';

  const features = new MySQLAPIFeatures(baseQuery, req.query)
    .filter() // now filters by verification_status
    .search(['organization_name', 'city', 'organization_type']) // updated fields
    .sort()
    .paginate();

  const builtQuery = features.build();
  const [organizations] = await db.query(builtQuery.sql, builtQuery.params);

  res.status(200).json({
    status: 'success',
    results: organizations.length,
    organizations
  });
});

exports.getOneOrganization = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const [rows] = await db.query(
    'SELECT * FROM partner_organizations WHERE partner_id = ?',
    [id]
  );

  if (rows.length === 0) {
    return next(new AppError('Organization not found', 404));
  }
  const organization = rows[0];

  res.status(200).json({
    status: 'success',
    organization
  });
});

exports.addOrganization = catchAsync(async (req, res, next) => {
  const data = req.body;

  try {
    validateRequiredFields(data, requiredFields);
  } catch (error) {
    return next(new AppError(error.message, 400));
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(data.password, 12);

  // Filter and process data
  const filteredData = filterAllowedFields(data, allowedOrganizationFields);

  // Build query dynamically
  const fields = [...allowedOrganizationFields, 'password']; // Add password separately
  const placeholders = fields.map(() => '?').join(',');

  const query = `INSERT INTO partner_organizations (${fields.join(', ')}) VALUES (${placeholders})`;

  // Prepare values
  const values = fields.map(field => {
    if (field === 'password') return hashedPassword;
    return processFieldValue(field, filteredData[field] || null);
  });

  // Insert organization
  const [result] = await db.query(query, values);

  // Fetch newly added record (without password)
  const [newOrg] = await db.query(
    'SELECT * FROM partner_organizations WHERE partner_id = ?',
    [result.insertId]
  );

  // Remove password from response
  const organization = { ...newOrg[0] };
  delete organization.password;

  res.status(201).json({
    status: 'success',
    message: 'Organization added successfully',
    organization
  });
});

exports.updateOrganization = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const updates = req.body;

  // Check if organization exists
  const [exists] = await db.query(
    'SELECT * FROM partner_organizations WHERE partner_id = ?',
    [id]
  );
  if (exists.length === 0) {
    return next(new AppError('Organization not found', 404));
  }

  // Filter valid updates
  const filteredUpdates = filterAllowedFields(
    updates,
    allowedOrganizationFields
  );

  if (Object.keys(filteredUpdates).length === 0) {
    return next(new AppError('No valid fields provided for update', 400));
  }

  // Build dynamic query
  const fields = [];
  const values = [];

  Object.keys(filteredUpdates).forEach(key => {
    const processedValue = processFieldValue(key, filteredUpdates[key]);
    fields.push(`${key} = ?`);
    values.push(processedValue);
  });

  // Add updated_at timestamp
  fields.push('updated_at = CURRENT_TIMESTAMP');

  const query = `UPDATE partner_organizations SET ${fields.join(', ')} WHERE partner_id = ?`;
  values.push(id);

  await db.query(query, values);

  // Fetch updated organization (without password)
  const [updatedOrg] = await db.query(
    'SELECT * FROM partner_organizations WHERE partner_id = ?',
    [id]
  );

  // Remove password from response
  const organization = { ...updatedOrg[0] };
  delete organization.password;

  res.status(200).json({
    status: 'success',
    message: 'Organization updated successfully',
    organization
  });
});

exports.deleteOrganization = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const [exists] = await db.query(
    'SELECT * FROM partner_organizations WHERE partner_id = ?',
    [id]
  );
  if (exists.length === 0) {
    return next(new AppError('Organization not found', 404));
  }

  await db.query('DELETE FROM partner_organizations WHERE partner_id = ?', [
    id
  ]);

  res.status(204).json({
    status: 'success',
    message: 'Organization deleted successfully'
  });
});

exports.loginOrg = catchAsync(async (req, res, next) => {
  const { primary_email: email, password } = req.body;

  // 1. Check if email and password exist
  if (!password || !email) {
    return next(new AppError('Please provide Email and password', 400));
  }

  const [rows] = await db.query(
    'SELECT * FROM partner_organizations WHERE primary_email = ?',
    [email.trim()]
  );

  if (rows.length === 0) {
    return next(new AppError('Organization not found', 404));
  }

  const org = rows[0];

  // 3. Check if user exists and password is correct
  if (!org || !(await bcrypt.compare(password, org.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }

  // Remove password from the user object
  org.password = undefined;

  // 5. If everything is OK, send token
  createSendToken(res, org, org.partner_id, 'partner_organizations', 200);
});

exports.changeOrgPassword = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { current_password, new_password, confirm_password } = req.body;

  // Simple validation
  if (!current_password || !new_password || !confirm_password) {
    return next(
      new AppError(
        'Current password, new password and confirm password are all required',
        400
      )
    );
  }

  if (new_password !== confirm_password) {
    return next(
      new AppError('New password and confirmation do not match', 400)
    );
  }

  // Get current organization
  const [org] = await db.query(
    'SELECT password FROM partner_organizations WHERE partner_id = ?',
    [id]
  );
  if (org.length === 0) {
    return next(new AppError('Organization not found', 404));
  }

  // Verify current password
  const isMatch = await bcrypt.compare(current_password, org[0].password);
  if (!isMatch) {
    return next(new AppError('Current password is incorrect', 401));
  }

  // Hash new password and update
  const hashedPassword = await bcrypt.hash(new_password, 12);
  await db.query(
    'UPDATE partner_organizations SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE partner_id = ?',
    [hashedPassword, id]
  );

  res.status(200).json({
    status: 'success',
    message: 'Password updated successfully'
  });
});
