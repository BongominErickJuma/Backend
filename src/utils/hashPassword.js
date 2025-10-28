const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 12;

function hashContactPersonPassword(contactPerson) {
  if (!contactPerson) return contactPerson;
  // If contactPerson is a string (already JSON) try parsing safely
  let cp = contactPerson;
  if (typeof cp === 'string') {
    try {
      cp = JSON.parse(cp);
    } catch (err) {
      // Not JSON — leave as-is (will be stored as string)
      return contactPerson;
    }
  }

  if (cp && typeof cp === 'object' && cp.password) {
    // Hash only if password is non-empty
    if (cp.password && cp.password.length > 0) {
      const salt = bcrypt.genSaltSync(SALT_ROUNDS);
      cp.password = bcrypt.hashSync(cp.password, salt);
    } else {
      // Remove empty password if provided
      delete cp.password;
    }
  }

  return cp;
}

// Helper: hash password
function hashPassword(password) {
  const salt = bcrypt.genSaltSync(SALT_ROUNDS);
  return bcrypt.hashSync(password, salt);
}

// Helper: safely parse JSON
function safeJSONParse(str, fallback = {}) {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

module.exports = { hashContactPersonPassword, hashPassword, safeJSONParse };
