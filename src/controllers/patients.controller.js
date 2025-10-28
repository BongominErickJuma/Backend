const db = require('../config/db.config');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const { hashPassword } = require('../utils/hashPassword');

exports.getAllPatients = catchAsync(async (req, res, next) => {
  const result = await db.query('SELECT * FROM patients');

  const patients = result[0];

  res.status(200).json({
    status: 'success',
    results: patients.length,
    data: patients
  });
});

exports.getOnePatient = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const [rows] = await db.query('SELECT * FROM patients WHERE id = ?', [id]);

  if (rows.length === 0) {
    return next(new AppError('Patient not found', 404));
  }

  const patient = rows[0];

  res.status(200).json({
    status: 'success',
    data: patient
  });
});

exports.addPatient = catchAsync(async (req, res, next) => {
  const data = req.body;
  if (data.password) {
    data.password = hashPassword(data.password);
  }
  const result = await db.query('INSERT INTO patients SET ?', [data]);

  console.log(result[0].insertId);

  const [newPatient] = await db.query('SELECT * FROM patients WHERE id = ?', [
    result[0].insertId
  ]);

  res.status(201).json({
    status: 'success',
    message: 'Your Data has been saved successfully',
    data: newPatient[0]
  });
});

exports.updatePatient = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const data = req.body;
  if (data.password) {
    return next(new AppError('This route does not update password', 400));
  }
  await db.query('UPDATE patients SET ? WHERE id = ?', [data, id]);
  const [updatedPatient] = await db.query(
    'SELECT * FROM patients WHERE id = ?',
    [id]
  );
  res.status(200).json({
    status: 'success',
    data: { patient: updatedPatient }
  });
});

exports.deletePatient = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  await db.query('DELETE FROM patients WHERE id = ?', [id]);
  res.status(204).json({
    status: 'success',
    message: 'Patient deleted successfully'
  });
});
