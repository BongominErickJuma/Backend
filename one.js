const { sanitizeOrganization } = require('../utils/sanitizeOrganization');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const db = require('../config/db');
const MySQLAPIFeatures = require('../utils/mysqlAPIFeatures');

exports.getAllOrganizations = catchAsync(async (req, res, next) => {
  const baseQuery = 'SELECT * FROM partner_organizations';

  const features = new MySQLAPIFeatures(baseQuery, req.query)
    .filter()
    .search(['organization_name', 'city', 'organization_type'])
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
