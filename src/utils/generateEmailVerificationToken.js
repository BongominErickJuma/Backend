const crypto = require('crypto');
const db = require('../config/db.config');

module.exports = async user => {
  const verificationToken = crypto.randomBytes(32).toString('hex');

  const hashedToken = crypto
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex');

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await db.query(
    `UPDATE users
     SET verification_token = $1,
         verification_token_expires = $2
     WHERE user_id = $3`,
    [hashedToken, expiresAt, user.user_id]
  );

  return verificationToken;
};
