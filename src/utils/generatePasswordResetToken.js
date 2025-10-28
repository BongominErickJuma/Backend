const crypto = require('crypto');
const db = require('./../config/db.config');

module.exports = async user => {
  // 1. Create random token
  const resetToken = crypto.randomBytes(32).toString('hex');

  const hashedToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // 3. Set expiration (10 minutes from now)
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  // 4. Save to database
  const query = {
    text: `UPDATE users 
           SET reset_password_token = $1, 
               reset_token_expires = $2 
           WHERE user_id = $3 RETURNING*`,
    values: [hashedToken, expiresAt, user.user_id]
  };

  await db.query(query);

  return resetToken;
};
