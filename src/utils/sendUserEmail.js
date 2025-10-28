const Email = require('./email');
const db = require('../config/db.config');

module.exports = async options => {
  const { user, url, tokenField, expiresField, emailType } = options;

  try {
    if (emailType === 'emailVerification') {
      await new Email(user, url).sendEmailVerification();
    } else if (emailType === 'passwordReset') {
      await new Email(user, url).sendPasswordReset();
    } else if (emailType === 'welcomeUser') {
      await new Email(user, url).sendWelcome();
    }
  } catch (err) {
    // Clear the token fields if provided
    if (tokenField && expiresField && user.user_id) {
      await db.query(
        `UPDATE users SET ${tokenField} = NULL, ${expiresField} = NULL WHERE user_id = $1`,
        [user.user_id]
      );
    }

    throw new Error('There was an error sending the email. Try again later!');
  }
};
