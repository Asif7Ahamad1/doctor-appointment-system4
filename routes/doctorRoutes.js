const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctorController');

// GET /api/doctors - list all doctors with optional filters
router.get('/', doctorController.getAllDoctors);

// GET /api/doctors/specialties - list unique specialties
router.get('/meta/specialties', doctorController.getSpecialties);

// GET /api/doctors/:id - get doctor details and available slots
router.get('/:id', doctorController.getDoctorById);

// POST /api/doctors - add new doctor profile (admin)
router.post('/', doctorController.addDoctor);

module.exports = router;
