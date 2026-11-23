const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const {
  validateAppointmentBooking,
  validateStatusUpdate
} = require('../middleware/validation');

// POST /api/appointments - Book a new appointment
router.post('/', validateAppointmentBooking, appointmentController.bookAppointment);

// GET /api/appointments - List appointments (supports doctor_id, patient_id, patient_email, date, status, search)
router.get('/', appointmentController.getAllAppointments);

// GET /api/appointments/lookup/:reference - Search appointment by ref code or email
router.get('/lookup/:reference', appointmentController.lookupAppointment);

// PATCH /api/appointments/:id/status - Update appointment status (Pending, Confirmed, etc.)
router.patch('/:id/status', validateStatusUpdate, appointmentController.updateAppointmentStatus);

// PATCH /api/appointments/:id/notes - Doctor clinical notes & prescription
router.patch('/:id/notes', appointmentController.updateDoctorNotes);

// DELETE /api/appointments/:id - Cancel appointment
router.delete('/:id', appointmentController.cancelAppointment);

// -------------------------------------------------------------
// Doctor & Patient Replies / Messages Endpoints
// -------------------------------------------------------------
// GET /api/appointments/:id/messages - Get all consultation messages
router.get('/:id/messages', appointmentController.getAppointmentMessages);

// POST /api/appointments/:id/messages - Post reply from Doctor or Patient
router.post('/:id/messages', appointmentController.postAppointmentMessage);

module.exports = router;
