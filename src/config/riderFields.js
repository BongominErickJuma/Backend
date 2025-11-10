// utils/deliveryRiderFields.js

/**
 * All valid fields that can be received from the frontend
 */
exports.allowedDeliveryRiderFields = [
  // Authentication
  'username',
  'password',

  // Personal Information
  'first_name',
  'last_name',
  'date_of_birth',
  'gender',
  'national_id_number',
  'phone_number',
  'alt_phone',
  'email',
  'emergency_contact_name',
  'emergency_contact_phone',
  'relationship',

  // Address
  'physical_address',
  'city_town',
  'district',

  // Profile
  'profile_picture_url',
  'bio',

  // Vehicle Information
  'vehicle_type',
  'vehicle_make',
  'vehicle_model',
  'vehicle_year',
  'vehicle_color',
  'license_plate',
  'vehicle_registration_number',
  'vehicle_insurance_company',
  'vehicle_insurance_policy_number',
  'vehicle_insurance_expiry_date',

  // Vehicle Images
  'front_view',
  'side_view',
  'back_view',

  // Legal Documents (URLs)
  'national_id_card',
  'driver_licence',
  'vehicle_registration_document',
  'vehicle_insurance_certificate',
  'police_clearance_certificate',
  'medical_fitness_certificate',

  // Account Setup
  'start_date',
  'work_status',
  'work_zone',
  'employment_type',
  'additional_text',
  'generated_rider_id'
];

/**
 * Required fields for creating a new delivery rider
 * (choose only what must be provided at registration)
 */
exports.requiredRiderFields = [
  'username',
  'password',
  'first_name',
  'last_name',
  'phone_number',
  'email',
  'gender',
  'city_town'
];

/**
 * Filter only allowed fields
 */
exports.filterAllowedFields = (data, allowedFields) => {
  const filtered = {};
  for (const key of Object.keys(data)) {
    if (allowedFields.includes(key)) {
      filtered[key] = data[key];
    }
  }
  return filtered;
};

/**
 * Validate required fields exist
 */
exports.validateRequiredFields = (data, requiredFields) => {
  const missing = requiredFields.filter(field => !data[field]);
  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }
};

/**
 * Basic validators
 */
const isValidEmail = val => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
const isValidDate = val => !isNaN(Date.parse(val));
const isValidYear = val => /^\d{4}$/.test(val);

/**
 * Smart value processor (typecasting)
 */
exports.processRiderFieldValue = (key, value) => {
  if (value === undefined || value === null || value === '') return null;

  switch (key) {
    case 'email':
      return isValidEmail(value) ? value.trim() : null;

    case 'date_of_birth':
    case 'vehicle_insurance_expiry_date':
    case 'start_date':
      return isValidDate(value) ? value : null;

    case 'vehicle_year':
      return isValidYear(value) ? parseInt(value, 10) : null;

    case 'vehicle_type':
    case 'gender':
    case 'work_status':
    case 'employment_type':
      return typeof value === 'string' ? value.trim() : value;

    default:
      return typeof value === 'string' ? value.trim() : value;
  }
};
