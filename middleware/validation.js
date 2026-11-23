/**
 * Validation Middleware for Doctor Appointments and Doctor profiles
 */

// Email regex helper
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validates phone number (ensures between 7 and 15 digits, allowing symbols +, -, (, ), spaces)
 */
function isValidPhone(phone) {
  if (!phone || typeof phone !== 'string') return false;
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

/**
 * Validates appointment booking request payload
 */
function validateAppointmentBooking(req, res, next) {
  const {
    doctor_id,
    patient_name,
    patient_email,
    patient_phone,
    patient_age,
    patient_gender,
    appointment_date,
    appointment_time,
    symptoms
  } = req.body;

  const errors = [];

  // Doctor validation
  if (!doctor_id || isNaN(Number(doctor_id)) || Number(doctor_id) <= 0) {
    errors.push('Valid doctor selection (doctor_id) is required.');
  }

  // Patient Name
  if (!patient_name || typeof patient_name !== 'string' || patient_name.trim().length < 2) {
    errors.push('Patient name must be at least 2 characters long.');
  }

  // Patient Email
  if (!patient_email || !EMAIL_REGEX.test(patient_email.trim())) {
    errors.push('A valid email address is required.');
  }

  // Patient Phone
  if (!patient_phone || !isValidPhone(patient_phone.trim())) {
    errors.push('A valid phone number is required (7-15 digits).');
  }

  // Patient Age
  const age = Number(patient_age);
  if (!patient_age || isNaN(age) || age < 0 || age > 125) {
    errors.push('Patient age must be a valid number between 1 and 125.');
  }

  // Patient Gender
  const validGenders = ['Male', 'Female', 'Other'];
  if (patient_gender && !validGenders.includes(patient_gender)) {
    errors.push(`Gender must be one of: ${validGenders.join(', ')}.`);
  }

  // Appointment Date
  if (!appointment_date) {
    errors.push('Appointment date is required (format: YYYY-MM-DD).');
  } else {
    const bookingDate = new Date(appointment_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isNaN(bookingDate.getTime())) {
      errors.push('Invalid appointment date format.');
    } else if (bookingDate < today) {
      errors.push('Appointment date cannot be in the past.');
    }
  }

  // Appointment Time
  if (!appointment_time || typeof appointment_time !== 'string') {
    errors.push('Appointment time slot is required (format: HH:MM).');
  }

  // If there are validation errors, reject early
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed. Please review the submitted fields.',
      errors
    });
  }

  // Sanitize trimmed values
  req.body.patient_name = patient_name.trim();
  req.body.patient_email = patient_email.trim().toLowerCase();
  req.body.patient_phone = patient_phone.trim();
  req.body.doctor_id = Number(doctor_id);
  req.body.patient_age = age;
  req.body.patient_gender = patient_gender || 'Other';
  req.body.symptoms = (symptoms || '').trim();

  next();
}

/**
 * Validates status update for appointments
 */
function validateStatusUpdate(req, res, next) {
  const { status } = req.body;
  const allowed = ['Pending', 'Confirmed', 'Completed', 'Cancelled'];

  if (!status || !allowed.includes(status)) {
    return res.status(400).json({
      success: false,
      message: `Invalid status. Must be one of: ${allowed.join(', ')}.`
    });
  }

  next();
}

module.exports = {
  validateAppointmentBooking,
  validateStatusUpdate
};
