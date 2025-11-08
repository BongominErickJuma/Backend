// utils/organizationFields.js

/**
 * All valid fields in the partner_organizations table
 */
exports.allowedOrganizationFields = [
  // Facility Information
  'facility_type',
  'facility_name',
  'registration_number',
  'year_established',
  'number_of_beds',
  'physical_address',
  'town_city',
  'district',
  'facility_phone',
  'facility_email',
  'website',
  'opening_hour',
  'closing_hour',
  'operates_24_7',
  'is_verified',
  'verified_by',

  // Contact Person
  'contact_first_name',
  'contact_last_name',
  'contact_job_title',
  'contact_department',
  'contact_personal_email',
  'contact_phone',
  'contact_alt_phone',
  'contact_nin',
  'password',
  'contact_is_confirmed',

  // Services & specialization
  'medical_services',
  'diagnostic_equipment',
  'number_of_doctors',
  'number_of_nurses',
  'number_of_ambulances',
  'ambulance_services',
  'accepted_insurance',
  'brief_description',

  // Document URLs
  'registration_cert_url',
  'license_url',
  'tin_cert_url',
  'contact_id_url',
  'authorization_letter_url',
  'logo_url',

  // Terms & agreements
  'has_agreed_terms_and_conditions',
  'has_given_accurate_information',
  'has_allowed_verification',
  'has_agreed_communication'
];

/**
 * Required fields for creating a new organization
 */
exports.requiredFields = [
  'facility_name',
  'facility_type',
  'facility_phone',
  'facility_email',
  'password'
];

/**
 * Filter out fields not allowed in the schema
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
 * Simple type validation helpers
 */
const isValidYear = val => /^\d{4}$/.test(val);
const isValidTime = val => /^([01]\d|2[0-3]):([0-5]\d)$/.test(val);
const isValidEmail = val => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);

/**
 * Smart value processor — validates and typecasts before DB insert/update
 */
exports.processFieldValue = (key, value) => {
  if (value === undefined || value === null || value === '') return null;

  // ✅ Convert strings to proper types
  switch (key) {
    case 'year_established':
      if (!isValidYear(value)) return null;
      return parseInt(value, 10);

    case 'number_of_beds':
    case 'number_of_doctors':
    case 'number_of_nurses':
    case 'number_of_ambulances':
      return Number.isFinite(Number(value)) ? Number(value) : 0;

    case 'opening_hour':
    case 'closing_hour':
      return isValidTime(value) ? value : null;

    case 'facility_email':
    case 'contact_personal_email':
      return isValidEmail(value) ? value.trim() : null;

    case 'operates_24_7':
    case 'is_verified':
    case 'contact_is_confirmed':
    case 'ambulance_services':
    case 'has_agreed_terms_and_conditions':
    case 'has_given_accurate_information':
    case 'has_allowed_verification':
    case 'has_agreed_communication':
      return Boolean(value);

    // JSON fields (store arrays or objects as strings)
    case 'medical_services':
    case 'diagnostic_equipment':
    case 'accepted_insurance':
      try {
        return typeof value === 'string' ? value : JSON.stringify(value);
      } catch {
        return '[]';
      }

    default:
      return typeof value === 'string' ? value.trim() : value;
  }
};
