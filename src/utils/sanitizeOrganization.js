// utils/sanitizeOrganization.js

exports.sanitizeOrganization = org => {
  if (!org) return org;

  const {
    // Authentication fields
    contact_password_hash,
    ...safe
  } = org;

  return safe;
};
