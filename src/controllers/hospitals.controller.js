const db = require('../config/db.config');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const MySQLAPIFeatures = require('../utils/mySQLAPIFeatures');

const getAllHospitals = catchAsync(async (req, res, next) => {
  const baseQuery = 'SELECT * FROM hospitals';

  const features = new MySQLAPIFeatures(baseQuery, req.query)
    .filter()
    .search(['facility_name', 'medical_services', 'diagnostic_equipment'])
    .sort()
    .paginate();

  const builtQuery = features.build();

  const [hospitals] = await db.query(builtQuery.sql, builtQuery.params);

  res.status(200).json({
    status: 'success',
    results: hospitals.length,
    hospitals
  });
});

module.exports = { getAllHospitals };
