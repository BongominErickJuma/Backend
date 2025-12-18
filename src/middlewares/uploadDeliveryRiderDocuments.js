const multer = require('multer');
const path = require('path');
const fs = require('fs');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

// Base directories and URLs
const uploadDir = '/home/cognosp1/upload.goodshepherd.health/delivery_riders';

const baseUrl = 'https://upload.goodshepherd.health/delivery_riders/';

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


exports.uploadVerificationDocuments = upload.fields([
  { name: 'front_view', maxCount: 1 },
  { name: 'side_view', maxCount: 1 },
  { name: 'back_view', maxCount: 1 },
  { name: 'profile_picture_url', maxCount: 1 },
  
  // Verification documents
  { name: 'national_id_card', maxCount: 1 },
  { name: 'driver_licence', maxCount: 1 },
  { name: 'vehicle_registration_document', maxCount: 1 },
  { name: 'vehicle_insurance_certificate', maxCount: 1 },
  { name: 'police_clearance_certificate', maxCount: 1 },
  { name: 'medical_fitness_certificate', maxCount: 1 }
]);

// 5. Attach URLs to req.body
exports.resizeVerificationDocuments = catchAsync(async (req, res, next) => {
  if (!req.files) return next();

  const uploadedUrls = {};

  const mapField = field => {
    if (req.files[field])
      uploadedUrls[field] = baseUrl + req.files[field][0].filename;
  };

  ['front_view', 'side_view', 'back_view', 'profile_picture_url', 'vehicle_registration_document', 'vehicle_insurance_certificate', 'police_clearance_certificate', 'medical_fitness_certificate','national_id_card', 'driver_licence' ].forEach(
    mapField
  );

  req.body = { ...req.body, ...uploadedUrls };

  next();
});
