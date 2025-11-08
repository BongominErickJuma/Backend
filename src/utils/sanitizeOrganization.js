// utils/sanitizeOrganization.js

exports.sanitizeOrganization = org => {
  if (!org) return org;

  const {
    // Authentication fields
    password,
    ...safe
  } = org;

  return safe;
};
