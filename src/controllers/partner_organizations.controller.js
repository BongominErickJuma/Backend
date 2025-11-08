const multer = require('multer');
const sharp = require('sharp');
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

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image! Please upload only images.', 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter
});

exports.uploadVerificationDocuments = upload.fields([
  { name: 'imageCover', maxCount: 1 },
  { name: 'images', maxCount: 3 }
]);

// upload.single('image') req.file
// upload.array('images', 5) req.files

exports.resizeVerificationDocuments = catchAsync(async (req, res, next) => {
  if (!req.files.imageCover || !req.files.images) return next();

  // 1) Cover image
  req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;
  await sharp(req.files.imageCover[0].buffer)
    .resize(2000, 1333)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/tours/${req.body.imageCover}`);

  // 2) Images
  req.body.images = [];

  await Promise.all(
    req.files.images.map(async (file, i) => {
      const filename = `tour-${req.params.id}-${Date.now()}-${i + 1}.jpeg`;

      await sharp(file.buffer)
        .resize(2000, 1333)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`public/img/tours/${filename}`);

      req.body.images.push(filename);
    })
  );

  next();
});

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
  let rawPassword = data.password || data.contact_password_hash;

  if (!rawPassword) {
    return next(
      new AppError('Password is required for organization contact', 400)
    );
  }

  const hashedPassword = await bcrypt.hash(rawPassword, 12);
  filteredData.contact_password_hash = hashedPassword;

  // 4. Prepare dynamic insert query
  const fields = Object.keys(filteredData);
  const placeholders = fields.map(() => '?').join(',');
  const values = fields.map(f => processFieldValue(f, filteredData[f]));

  const query = `INSERT INTO partner_organizations (${fields.join(', ')}) VALUES (${placeholders})`;

  // 5. Execute insert
  const [result] = await db.query(query, values);

  // 6. Fetch and return the new record
  const [newOrg] = await db.query(
    'SELECT * FROM partner_organizations WHERE partner_id = ?',
    [result.insertId]
  );

  // Remove password hash before responding
  delete newOrg[0].contact_password_hash;

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

  delete updatedOrg[0].contact_password_hash;

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
