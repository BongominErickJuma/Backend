const bcrypt = require('bcryptjs');
const db = require('../config/db.config');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const MySQLAPIFeatures = require('../utils/mySQLAPIFeatures');
const { sanitizeOrganization } = require('../utils/sanitizeOrganization');

const {
  allowedOrganizationFields,
  requiredFields,
  filterAllowedFields,
  validateRequiredFields,
  processFieldValue
} = require('../config/partnerOrganizationFields');

exports.getAllOrganizations = catchAsync(async (req, res, next) => {
  const baseQuery = `
    SELECT 
      partner_id,
      facility_type,
      created_at,
      facility_name,
      physical_address,
      town_city,
      district,
      contact_first_name,
      contact_last_name,
      contact_phone,
      verification_status
    FROM partner_organizations
  `;

  const features = new MySQLAPIFeatures(baseQuery, req.query)
    .filter()
    .search(['facility_name', 'town_city', 'district']) // Updated search fields to match selected columns
    .sort()
    .paginate();

  const builtQuery = features.build();
  const [organizations] = await db.query(builtQuery.sql, builtQuery.params);

  // Sanitize all results
  const sanitized = organizations.map(sanitizeOrganization);

  res.status(200).json({
    status: 'success',
    results: sanitized.length,
    organizations: sanitized
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

  const organization = sanitizeOrganization(rows[0]);

  res.status(200).json({
    status: 'success',
    organization
  });
});

exports.getPartners = catchAsync(async (req, res, next) => {
  // Fetch verified organizations
  const [rows] = await db.query(
    `SELECT facility_name, year_established, town_city, district, logo_url, brief_description
     FROM partner_organizations
     WHERE verification_status = "verified"
     ORDER BY year_established DESC`
  );

  // Split into featured and all partners
  const featured = rows.slice(0, 3); // first 3 with description
  const partners = rows.map(({ brief_description, ...rest }) => rest); // remove description for all

  res.status(200).json({
    status: 'success',
    total: rows.length,
    featuredCount: featured.length,
    partnersCount: partners.length,
    featured,
    partners
  });
});

exports.addOrganization = catchAsync(async (req, res, next) => {
  const data = req.body;

  // 1. Validate required fields
  try {
    validateRequiredFields(data, requiredFields);
  } catch (error) {
    return next(new AppError(error.message, 400));
  }

  // 2. Filter out unwanted fields
  const filteredData = filterAllowedFields(data, allowedOrganizationFields);

  // 3. Handle password hashing
  // The API can accept either `password` or `contact_password_hash` (raw password)
  let rawPassword = data.password || data.password;

  if (!rawPassword) {
    return next(
      new AppError('Password is required for organization contact', 400)
    );
  }

  const hashedPassword = await bcrypt.hash(rawPassword, 12);
  filteredData.password = hashedPassword;

  // 4. Prepare dynamic insert query
  const fields = Object.keys(filteredData);
  const placeholders = fields.map(() => '?').join(',');
  const values = fields.map(f => processFieldValue(f, filteredData[f]));

  const query = `INSERT INTO partner_organizations (${fields.join(', ')}) VALUES (${placeholders})`;

  console.log(query);

  // 5. Execute insert
  const [result] = await db.query(query, values);

  // 6. Fetch and return the new record
  const [newOrg] = await db.query(
    'SELECT * FROM partner_organizations WHERE partner_id = ?',
    [result.insertId]
  );

  // Remove password hash before responding
  delete newOrg[0].password;

  res.status(201).json({
    status: 'success',
    message: 'Organization added successfully',
    organization: newOrg[0]
  });
});

exports.updateOrganization = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const updates = req.body;

  const [exists] = await db.query(
    'SELECT * FROM partner_organizations WHERE partner_id = ?',
    [id]
  );
  if (exists.length === 0) {
    return next(new AppError('Organization not found', 404));
  }

  const filteredUpdates = filterAllowedFields(
    updates,
    allowedOrganizationFields
  );
  if (Object.keys(filteredUpdates).length === 0) {
    return next(new AppError('No valid fields provided for update', 400));
  }

  const fields = [];
  const values = [];

  for (const key in filteredUpdates) {
    const processedValue = processFieldValue(key, filteredUpdates[key]);
    fields.push(`${key} = ?`);
    values.push(processedValue);
  }

  fields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);

  const query = `UPDATE partner_organizations SET ${fields.join(', ')} WHERE partner_id = ?`;

  await db.query(query, values);

  const [updatedOrg] = await db.query(
    'SELECT * FROM partner_organizations WHERE partner_id = ?',
    [id]
  );

  delete updatedOrg[0].password;

  res.status(200).json({
    status: 'success',
    message: 'Organization updated successfully',
    organization: updatedOrg[0]
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
