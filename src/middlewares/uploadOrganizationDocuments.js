const multer = require('multer');
const path = require('path');
const fs = require('fs');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

// Base directories and URLs
const uploadDir = '/home/cognosp1/uploads.goodshepherd.health/organizations';

const baseUrl = 'https://upload.goodshepherd.health/organizations/';

// Ensure the upload folder exists (safe for both environments)
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 1. Storage configuration
const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

// 2. File type filter
const multerFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/jpg'
  ];
  if (!allowedTypes.includes(file.mimetype)) {
    return cb(
      new AppError('Only PDF, PNG, and JPG files are allowed!', 400),
      false
    );
  }
  cb(null, true);
};

// 3. Multer instance
const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// 4. Fields
exports.uploadVerificationDocuments = upload.fields([
  { name: 'registration_cert_url', maxCount: 1 },
  { name: 'license_url', maxCount: 1 },
  { name: 'tin_cert_url', maxCount: 1 },
  { name: 'contact_id_url', maxCount: 1 },
  { name: 'authorization_letter_url', maxCount: 1 },
  { name: 'logo_url', maxCount: 1 }
]);

// 5. Attach URLs to req.body
exports.resizeVerificationDocuments = catchAsync(async (req, res, next) => {
  if (!req.files) return next();

  const uploadedUrls = {};

  const mapField = field => {
    if (req.files[field])
      uploadedUrls[field] = baseUrl + req.files[field][0].filename;
  };

  [
    'registration_cert_url',
    'license_url',
    'tin_cert_url',
    'contact_id_url',
    'authorization_letter_url',
    'logo_url'
  ].forEach(mapField);

  req.body = { ...req.body, ...uploadedUrls };

  next();
});
