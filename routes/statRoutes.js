const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET /api/stats - Dashboard summary metrics
router.get('/', async (req, res, next) => {
  try {
    const isConnected = db.getIsConnected();

    if (isConnected) {
      const [doctorCount] = await db.query('SELECT COUNT(*) as total FROM doctors');
      const [apptStats] = await db.query(`
        SELECT 
          COUNT(*) as total_appointments,
          SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'Confirmed' THEN 1 ELSE 0 END) as confirmed,
          SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN status = 'Cancelled' THEN 1 ELSE 0 END) as cancelled
        FROM appointments
      `);

      return res.json({
        success: true,
        data: {
          totalDoctors: doctorCount.total || 0,
          totalAppointments: apptStats.total_appointments || 0,
          pendingAppointments: apptStats.pending || 0,
          confirmedAppointments: apptStats.confirmed || 0,
          completedAppointments: apptStats.completed || 0,
          cancelledAppointments: apptStats.cancelled || 0,
          storage: 'mysql'
        }
      });
    }

    // In-memory fallback
    const totalDoctors = db.inMemoryStore.doctors.length;
    const totalAppointments = db.inMemoryStore.appointments.length;
    const pendingAppointments = db.inMemoryStore.appointments.filter(a => a.status === 'Pending').length;
    const confirmedAppointments = db.inMemoryStore.appointments.filter(a => a.status === 'Confirmed').length;
    const completedAppointments = db.inMemoryStore.appointments.filter(a => a.status === 'Completed').length;
    const cancelledAppointments = db.inMemoryStore.appointments.filter(a => a.status === 'Cancelled').length;

    res.json({
      success: true,
      data: {
        totalDoctors,
        totalAppointments,
        pendingAppointments,
        confirmedAppointments,
        completedAppointments,
        cancelledAppointments,
        storage: 'fallback-memory'
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
