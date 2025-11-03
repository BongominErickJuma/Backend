const db = require('../config/db.config');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const createSendToken = require('../utils/createSendToken ');
const bcrypt = require('bcryptjs');

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
  const [rows] = await db.query('SELECT * FROM patients WHERE patient_id = ?', [
    id
  ]);

  if (rows.length === 0) {
    return next(new AppError('Patient not found', 404));
  }

  const patient = rows[0];

  res.status(200).json({
    status: 'success',
    data: patient
  });
});

exports.updatePatient = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const data = req.body;

  const [updatedPatient] = await db.query(
    'SELECT * FROM patients WHERE patient_id = ?',
    [id]
  );

  if (updatedPatient.length === 0) {
    return next(new AppError('Patient not found', 404));
  }

  await db.query('UPDATE patients SET ? WHERE patient_id = ?', [data, id]);

  res.status(200).json({
    status: 'success',
    data: { patient: updatedPatient }
  });
});

exports.deletePatient = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  await db.query('DELETE FROM patients WHERE patient_id = ?', [id]);
  res.status(204).json({
    status: 'success',
    message: 'Patient deleted successfully'
  });
});

// SIGN UP USERS

exports.signup = catchAsync(async (req, res, next) => {
  const data = req.body;

  if (!data.email || !data.password_hash) {
    return next(new AppError('Please provide email and password', 400));
  }

  data.password_hash = await bcrypt.hash(data.password_hash, 12);

  const result = await db.query('INSERT INTO patients SET ?', [data]);

  const [newPatient] = await db.query(
    'SELECT * FROM patients WHERE patient_id = ?',
    [result[0].insertId]
  );

  res.status(201).json({
    status: 'success',
    message: 'Your Data has been saved successfully',
    data: newPatient[0]
  });
});
