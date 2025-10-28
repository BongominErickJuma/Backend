const db = require('../config/db.config');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 12;

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

const updateHospital = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const updates = req.body;

  const [exists] = await db.query('SELECT * FROM hospitals WHERE id = ?', [id]);
  if (exists.length === 0) {
    return next(new AppError('Hospital not found', 404));
  }

  const currentHospital = exists[0];
  const currentContactPerson = safeJSONParse(currentHospital.contact_person);

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
