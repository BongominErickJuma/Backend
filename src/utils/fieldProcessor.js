const {
  jsonFields,
  dateFields,
  booleanFields
} = require('../config/partnerOrganizationFields');

exports.processFieldValue = (key, value) => {
  // Handle JSON fields
  if (jsonFields.includes(key)) {
    return JSON.stringify(value || (key === 'operating_hours' ? {} : []));
  }

  // Handle date fields
  if (dateFields.includes(key)) {
    return value || null;
  }

  // Handle boolean fields
  if (booleanFields.includes(key)) {
    return Boolean(value);
  }

  return value;
};

exports.filterAllowedFields = (data, allowedFields) => {
  const filtered = {};
  Object.keys(data).forEach(key => {
    if (allowedFields.includes(key)) {
      filtered[key] = data[key];
    }
  });
  return filtered;
};

exports.validateRequiredFields = (data, requiredFields) => {
  const missingFields = requiredFields.filter(field => !data[field]);
  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
  }
  return true;
};
