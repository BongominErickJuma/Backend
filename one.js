const {
  allowedOrganizationFields,
  requiredFields
} = require('../config/partnerOrganizationFields');
const {
  processFieldValue,
  validateRequiredFields
} = require('../utils/fieldProcessor');

exports.addHospital = catchAsync(async (req, res, next) => {
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
