const db = require('../config/db.config');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const MySQLAPIFeatures = require('../utils/mySQLAPIFeatures');
const {
  hashContactPersonPassword,
  hashPassword,
  safeJSONParse
} = require('../utils/hashPassword');

const bcrypt = require('bcryptjs');

const getAllHospitals = catchAsync(async (req, res, next) => {
  const baseQuery = 'SELECT * FROM hospitals';

  const features = new MySQLAPIFeatures(baseQuery, req.query)
    .filter()
    .search([
      'facility_name',
      'medical_services',
      'diagnostic_equipment',
      'facility_type'
    ])
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

const getOneHospital = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const [rows] = await db.query('SELECT * FROM hospitals WHERE id = ?', [id]);

  if (rows.length === 0) {
    return next(new AppError('Hospital not found', 404));
  }
  const hospital = rows[0];

  res.status(200).json({
    status: 'success',
    hospital
  });
});

const addHospital = catchAsync(async (req, res, next) => {
  const data = req.body;

  // Basic validation
  if (!data.facility_name || !data.facility_type) {
    return next(new AppError('Facility name and type are required', 400));
  }

  // Hash contact_person.password if present
  const contactPersonObj = hashContactPersonPassword(data.contact_person);

  const query = `
    INSERT INTO hospitals (
      facility_type, facility_name, registration_number, year_established,
      number_of_beds, physical_address, city_town, district, region,
      facility_phone, facility_email, website, opening_hrs, closing_hrs,
      is_24_7_operation, status, contact_person, medical_services,
      diagnostic_equipment, number_of_doctors, number_of_nurses,
      number_of_ambulances, ambulance_services, insurance_companies,
      brief_description, verification_files, has_agreed_terms_and_conditions,
      has_given_accurate_information, has_allowed_verification,
      has_agreed_communication
    )
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `;

  const values = [
    data.facility_type || null,
    data.facility_name,
    data.registration_number || null,
    data.year_established || null,
    data.number_of_beds || null,
    data.physical_address || null,
    data.city_town || null,
    data.district || null,
    data.region || 'Central',
    data.facility_phone || null,
    data.facility_email || null,
    data.website || null,
    data.opening_hrs || null,
    data.closing_hrs || null,
    data.is_24_7_operation || false,
    data.status || 'pending',
    JSON.stringify(contactPersonObj || {}),
    JSON.stringify(data.medical_services || []),
    JSON.stringify(data.diagnostic_equipment || []),
    data.number_of_doctors || 0,
    data.number_of_nurses || 0,
    data.number_of_ambulances || 0,
    data.ambulance_services || false,
    JSON.stringify(data.insurance_companies || []),
    data.brief_description || null,
    JSON.stringify(data.verification_files || []),
    data.has_agreed_terms_and_conditions || false,
    data.has_given_accurate_information || false,
    data.has_allowed_verification || false,
    data.has_agreed_communication || false
  ];

  const [result] = await db.query(query, values);

  const [newHospital] = await db.query('SELECT * FROM hospitals WHERE id = ?', [
    result.insertId
  ]);

  res.status(201).json({
    status: 'success',
    message: 'Hospital added successfully',
    hospital: newHospital[0]
  });
});

const updateHospital = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const updates = req.body;

  const [exists] = await db.query('SELECT * FROM hospitals WHERE id = ?', [id]);
  if (exists.length === 0) {
    return next(new AppError('Hospital not found', 404));
  }

  const currentHospital = exists[0];

  const currentContactPerson = currentHospital.contact_person;

  const allowedKeys = [
    'facility_type',
    'facility_name',
    'registration_number',
    'year_established',
    'number_of_beds',
    'physical_address',
    'city_town',
    'district',
    'region',
    'facility_phone',
    'facility_email',
    'website',
    'opening_hrs',
    'closing_hrs',
    'is_24_7_operation',
    'status',
    'contact_person',
    'medical_services',
    'diagnostic_equipment',
    'number_of_doctors',
    'number_of_nurses',
    'number_of_ambulances',
    'ambulance_services',
    'insurance_companies',
    'brief_description',
    'verification_files',
    'has_agreed_terms_and_conditions',
    'has_given_accurate_information',
    'has_allowed_verification',
    'has_agreed_communication'
  ];

  const updateKeys = Object.keys(updates).filter(k => allowedKeys.includes(k));
  if (updateKeys.length === 0) {
    return next(new AppError('No valid fields provided for update', 400));
  }

  const fields = [];
  const values = [];

  for (const key of updateKeys) {
    let value = updates[key];

    if (key === 'contact_person') {
      // Handle contact_person update
      const {
        current_password,
        new_password,
        confirm_password,
        ...otherFields
      } = value || {};

      // Merge existing contact person fields with new ones
      let updatedContact = { ...currentContactPerson, ...otherFields };

      // If a password change is requested:
      if (current_password || new_password || confirm_password) {
        if (!current_password || !new_password || !confirm_password) {
          return next(
            new AppError(
              'To change password, provide current_password, new_password, and confirm_password',
              400
            )
          );
        }

        if (new_password !== confirm_password) {
          return next(
            new AppError('New password and confirm password do not match', 400)
          );
        }

        // Verify the current password
        const match = await bcrypt.compare(
          current_password,
          currentContactPerson.password || ''
        );
        if (!match) {
          return next(new AppError('Current password is incorrect', 401));
        }

        // Hash the new password
        updatedContact.password = hashPassword(new_password);
      }

      value = JSON.stringify(updatedContact);
    } else if (
      [
        'medical_services',
        'diagnostic_equipment',
        'insurance_companies',
        'verification_files'
      ].includes(key)
    ) {
      value = JSON.stringify(value || []);
    }

    fields.push(`${key} = ?`);
    values.push(value);
  }

  const query = `UPDATE hospitals SET ${fields.join(', ')} WHERE id = ?`;
  values.push(id);

  await db.query(query, values);

  const [updated] = await db.query('SELECT * FROM hospitals WHERE id = ?', [
    id
  ]);

  // remove password from response
  const hospital = updated[0];
  const contact = safeJSONParse(hospital.contact_person);
  if (contact && contact.password) delete contact.password;
  hospital.contact_person = contact;

  res.status(200).json({
    status: 'success',
    message: 'Hospital updated successfully',
    hospital
  });
});

const deleteHospital = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const [exists] = await db.query('SELECT * FROM hospitals WHERE id = ?', [id]);
  if (exists.length === 0) {
    return next(new AppError('Hospital not found', 404));
  }

  await db.query('DELETE FROM hospitals WHERE id = ?', [id]);

  res.status(204).json({
    status: 'success',
    message: 'Hospital deleted successfully'
  });
});
module.exports = {
  getAllHospitals,
  getOneHospital,
  addHospital,
  updateHospital,
  deleteHospital
};
