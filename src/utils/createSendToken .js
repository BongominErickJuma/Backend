const jwt = require('jsonwebtoken');

const signToken = (id, loginType) => {
  return jwt.sign(
    { id, loginType }, // 👈 include extra data
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
};

const createSendToken = (res, user, id, loginType, statusCode) => {
  const token = signToken(id, loginType);

  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax'
  };

  res.cookie('gsghjwt', token, cookieOptions);

  res.status(statusCode).json({
    status: 'success',
    token,
    data: user
  });
};
module.exports = createSendToken;
