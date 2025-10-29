// Shared field configuration for partner_organizations
exports.allowedOrganizationFields = [
  // Organization Details
  'organization_name',
  'organization_type',
  'registration_number',
  'tax_id',

  // Contact Information
  'primary_email',
  'secondary_email',
  'primary_phone',
  'secondary_phone',
  'website',

  // Address
  'address_line1',
  'address_line2',
  'city',
  'state_province',
  'postal_code',
  'country',
  'latitude',
  'longitude',

  // Operating Hours
  'operating_hours',
  'emergency_services_available',

  // Branding
  'logo_url',
  'banner_image_url',

  // Business Details
  'license_number',
  'license_expiry_date',
  'insurance_provider',
  'insurance_policy_number',
  'insurance_expiry_date',

  // Financial
  'bank_name',
  'bank_account_number',
  'bank_account_name',
  'bank_branch',
  'swift_code',
  'mobile_money_number',
  'mobile_money_provider',

  // Service Categories
  'services_offered',
  'specializations',

  // Verification & Status
  'verification_status',
  'rejection_reason',

  // Subscription
  'subscription_tier',
  'subscription_start_date',
  'subscription_end_date',

  // Active status
  'is_active'
];

// Fields that should be handled as JSON
exports.jsonFields = ['operating_hours', 'services_offered', 'specializations'];

// Fields that should be handled as dates
exports.dateFields = [
  'license_expiry_date',
  'insurance_expiry_date',
  'subscription_start_date',
  'subscription_end_date'
];

// Fields that should be handled as booleans
exports.booleanFields = ['emergency_services_available', 'is_active'];

// Required fields for creation
exports.requiredFields = [
  'organization_name',
  'organization_type',
  'primary_email',
  'password',
  'primary_phone'
];
