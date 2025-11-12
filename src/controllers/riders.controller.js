const db = require('../config/db.config');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const bcrypt = require('bcryptjs');

const { sanitizeOrganization } = require('../utils/sanitizeOrganization');

const {
  allowedDeliveryRiderFields,
  requiredRiderFields,
  filterAllowedFields,
  validateRequiredFields,
  processRiderFieldValue
} = require('../config/riderFields');

exports.getDeliveryRiders = catchAsync(async (req, res, next) => {
  const result = await db.query('SELECT * FROM delivery_riders');

  const riders = result[0];
  const sanitized = riders.map(sanitizeOrganization);

  res.status(200).json({
    status: 'success',
    results: sanitized.length,
    data: sanitized
  });
});

exports.getRider = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const [rows] = await db.query(
    'SELECT * FROM delivery_riders WHERE rider_id = ?',
    [id]
  );

  if (rows.length === 0) {
    return next(new AppError('Delivery Rider not found', 404));
  }

  const rider = sanitizeOrganization(rows[0]);

  res.status(200).json({
    status: 'success',
    rider
  });
});

exports.addRider = catchAsync(async (req, res, next) => {
  const data = req.body;

  // 1. Validate required fields
  try {
    validateRequiredFields(data, requiredRiderFields);
  } catch (error) {
    return next(new AppError(error.message, 400));
  }

  // 2. Filter out unwanted fields
  const filteredData = filterAllowedFields(data, allowedDeliveryRiderFields);

  // 3. Handle password hashing
  // The API can accept either `password` or `contact_password_hash` (raw password)
  let rawPassword = data.password;

  if (!rawPassword) {
    return next(new AppError('Password is required for delivery person', 400));
  }

  const hashedPassword = await bcrypt.hash(rawPassword, 12);
  filteredData.password = hashedPassword;

  // Determine who is creating this rider
  if (req.user.admin_id) {
    // Super admin or system admin creating
    filteredData.created_by_type = 'admin';
    filteredData.created_by_id = req.user.admin_id;
  } else if (req.user.partner_id) {
    // Partner organization creating
    filteredData.created_by_type = 'organization';
    filteredData.created_by_id = req.user.partner_id;
  } else {
    // Self-registration (rider creating their own account)
    filteredData.created_by_type = 'self';
    filteredData.created_by_id = null;
  }

  // 4. Prepare dynamic insert query
  const fields = Object.keys(filteredData);
  const placeholders = fields.map(() => '?').join(',');
  const values = fields.map(f => processRiderFieldValue(f, filteredData[f]));

  const query = `INSERT INTO delivery_riders (${fields.join(', ')}) VALUES (${placeholders})`;

  // 5. Execute insert
  const [result] = await db.query(query, values);

  // 6. Fetch and return the new record
  const [newRider] = await db.query(
    'SELECT * FROM delivery_riders WHERE rider_id = ?',
    [result.insertId]
  );

  // Remove password hash before responding
  delete newRider[0].password;

  res.status(201).json({
    status: 'success',
    message: 'Delivery Person added successfully',
    rider: newRider[0]
  });
});

exports.updateRider = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const updates = req.body;

  const [exists] = await db.query(
    'SELECT * FROM delivery_riders WHERE rider_id = ?',
    [id]
  );
  if (exists.length === 0) {
    return next(new AppError('Delivery Person not found', 404));
  }

  const filteredUpdates = filterAllowedFields(
    updates,
    allowedDeliveryRiderFields
  );
  if (Object.keys(filteredUpdates).length === 0) {
    return next(new AppError('No valid fields provided for update', 400));
  }

  const fields = [];
  const values = [];

  for (const key in filteredUpdates) {
    const processedValue = processRiderFieldValue(key, filteredUpdates[key]);
    fields.push(`${key} = ?`);
    values.push(processedValue);
  }

  fields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);

  const query = `UPDATE delivery_riders SET ${fields.join(', ')} WHERE rider_id = ?`;

  await db.query(query, values);

  const [updatedRider] = await db.query(
    'SELECT * FROM delivery_riders WHERE rider_id = ?',
    [id]
  );

  delete updatedRider[0].password;

  res.status(200).json({
    status: 'success',
    message: 'Delivery Person updated successfully',
    Person: updatedRider[0]
  });
});

exports.deleteRider = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const [exists] = await db.query(
    'SELECT * FROM delivery_riders WHERE rider_id = ?',
    [id]
  );
  if (exists.length === 0) {
    return next(new AppError('Delivery Person not found', 404));
  }

  await db.query('DELETE FROM delivery_riders WHERE rider_id = ?', [id]);

  res.status(204).json({
    status: 'success',
    message: 'Delivery Person deleted successfully'
  });
});
