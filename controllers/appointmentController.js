const db = require('../config/db');

function generateBookingReference() {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `DOC-${dateStr}-${randomHex}`;
}

/**
 * Book a new appointment
 */
async function bookAppointment(req, res, next) {
  try {
    const {
      doctor_id,
      patient_id,
      patient_name,
      patient_email,
      patient_phone,
      patient_age,
      patient_gender,
      appointment_date,
      appointment_time,
      symptoms
    } = req.body;

    const isConnected = db.getIsConnected();
    const formattedTime = appointment_time.length === 5 ? `${appointment_time}:00` : appointment_time;

    // Verify doctor exists
    let doctor = null;
    if (isConnected) {
      const [doc] = await db.query('SELECT * FROM doctors WHERE id = ?', [doctor_id]);
      doctor = doc;
    } else {
      doctor = db.inMemoryStore.doctors.find(d => d.id === doctor_id);
    }

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Selected doctor does not exist.'
      });
    }

    // Check slot conflict
    if (isConnected) {
      const conflicts = await db.query(
        `SELECT id FROM appointments 
         WHERE doctor_id = ? 
           AND appointment_date = ? 
           AND appointment_time = ? 
           AND status != 'Cancelled'`,
        [doctor_id, appointment_date, formattedTime]
      );

      if (conflicts.length > 0) {
        return res.status(409).json({
          success: false,
          message: `The time slot (${appointment_time}) on ${appointment_date} is already booked for Dr. ${doctor.name}. Please select a different time or date.`
        });
      }
    } else {
      const conflict = db.inMemoryStore.appointments.find(
        a => a.doctor_id === doctor_id &&
             a.appointment_date === appointment_date &&
             a.appointment_time.slice(0, 5) === appointment_time.slice(0, 5) &&
             a.status !== 'Cancelled'
      );

      if (conflict) {
        return res.status(409).json({
          success: false,
          message: `The time slot (${appointment_time}) on ${appointment_date} is already booked for Dr. ${doctor.name}. Please select a different time or date.`
        });
      }
    }

    const bookingReference = generateBookingReference();

    const newAppointment = {
      booking_reference: bookingReference,
      doctor_id,
      patient_id: patient_id ? Number(patient_id) : null,
      patient_name,
      patient_email,
      patient_phone,
      patient_age,
      patient_gender,
      appointment_date,
      appointment_time: formattedTime,
      symptoms: symptoms || null,
      status: 'Pending',
      created_at: new Date().toISOString()
    };

    if (isConnected) {
      const sql = `
        INSERT INTO appointments 
        (booking_reference, doctor_id, patient_id, patient_name, patient_email, patient_phone, patient_age, patient_gender, appointment_date, appointment_time, symptoms, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const result = await db.query(sql, [
        newAppointment.booking_reference,
        newAppointment.doctor_id,
        newAppointment.patient_id,
        newAppointment.patient_name,
        newAppointment.patient_email,
        newAppointment.patient_phone,
        newAppointment.patient_age,
        newAppointment.patient_gender,
        newAppointment.appointment_date,
        newAppointment.appointment_time,
        newAppointment.symptoms,
        newAppointment.status
      ]);

      newAppointment.id = result.insertId;
    } else {
      newAppointment.id = db.inMemoryStore.appointments.length + 1;
      db.inMemoryStore.appointments.push(newAppointment);
    }

    res.status(201).json({
      success: true,
      message: 'Appointment booked successfully! Please save your booking reference.',
      data: {
        ...newAppointment,
        doctor_name: doctor.name,
        doctor_specialty: doctor.specialty,
        consultation_fee: doctor.consultation_fee
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get all appointments
 * Filter by: doctor_id, patient_id, patient_email, date, status, search
 */
async function getAllAppointments(req, res, next) {
  try {
    const { doctor_id, patient_id, patient_email, date, status, search } = req.query;
    const isConnected = db.getIsConnected();

    if (isConnected) {
      let sql = `
        SELECT 
          a.*,
          d.name AS doctor_name,
          d.specialty AS doctor_specialty,
          d.consultation_fee,
          d.phone AS doctor_phone,
          d.email AS doctor_email
        FROM appointments a
        JOIN doctors d ON a.doctor_id = d.id
        WHERE 1=1
      `;
      const params = [];

      if (doctor_id) {
        sql += ' AND a.doctor_id = ?';
        params.push(Number(doctor_id));
      }

      if (patient_id) {
        sql += ' AND a.patient_id = ?';
        params.push(Number(patient_id));
      }

      if (patient_email) {
        sql += ' AND a.patient_email = ?';
        params.push(patient_email.trim().toLowerCase());
      }

      if (date) {
        sql += ' AND a.appointment_date = ?';
        params.push(date);
      }

      if (status && status !== 'All') {
        sql += ' AND a.status = ?';
        params.push(status);
      }

      if (search && search.trim()) {
        const q = `%${search.trim()}%`;
        sql += ' AND (a.booking_reference LIKE ? OR a.patient_name LIKE ? OR a.patient_email LIKE ? OR a.patient_phone LIKE ?)';
        params.push(q, q, q, q);
      }

      sql += ' ORDER BY a.appointment_date DESC, a.appointment_time DESC';
      const appointments = await db.query(sql, params);

      return res.json({
        success: true,
        count: appointments.length,
        data: appointments,
        storage: 'mysql'
      });
    }

    // In-memory fallback
    let list = db.inMemoryStore.appointments.map(a => {
      const doc = db.inMemoryStore.doctors.find(d => d.id === a.doctor_id) || {};
      return {
        ...a,
        doctor_name: doc.name || 'Unknown',
        doctor_specialty: doc.specialty || 'General',
        consultation_fee: doc.consultation_fee || 0,
        doctor_phone: doc.phone || '',
        doctor_email: doc.email || ''
      };
    });

    if (doctor_id) {
      list = list.filter(a => a.doctor_id === Number(doctor_id));
    }
    if (patient_id) {
      list = list.filter(a => a.patient_id === Number(patient_id));
    }
    if (patient_email) {
      list = list.filter(a => a.patient_email.toLowerCase() === patient_email.trim().toLowerCase());
    }
    if (date) {
      list = list.filter(a => a.appointment_date === date);
    }
    if (status && status !== 'All') {
      list = list.filter(a => a.status.toLowerCase() === status.toLowerCase());
    }
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(a =>
        a.booking_reference.toLowerCase().includes(q) ||
        a.patient_name.toLowerCase().includes(q) ||
        a.patient_email.toLowerCase().includes(q) ||
        a.patient_phone.includes(q)
      );
    }

    res.json({
      success: true,
      count: list.length,
      data: list,
      storage: 'fallback-memory'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get appointment by ID or reference
 */
async function lookupAppointment(req, res, next) {
  try {
    const { reference } = req.params;
    const isConnected = db.getIsConnected();

    if (isConnected) {
      const sql = `
        SELECT 
          a.*,
          d.name AS doctor_name,
          d.specialty AS doctor_specialty,
          d.consultation_fee,
          d.phone AS doctor_phone,
          d.email AS doctor_email,
          d.qualification,
          d.image_url AS doctor_image
        FROM appointments a
        JOIN doctors d ON a.doctor_id = d.id
        WHERE a.booking_reference = ? OR a.patient_email = ? OR a.id = ?
        ORDER BY a.appointment_date DESC
      `;
      const rows = await db.query(sql, [reference.trim(), reference.trim(), isNaN(Number(reference)) ? 0 : Number(reference)]);

      if (rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: `No appointment found matching "${reference}".`
        });
      }

      return res.json({
        success: true,
        data: rows
      });
    }

    // In-memory fallback
    const matched = db.inMemoryStore.appointments
      .filter(a =>
        a.booking_reference.toLowerCase() === reference.trim().toLowerCase() ||
        a.patient_email.toLowerCase() === reference.trim().toLowerCase() ||
        a.id === Number(reference)
      )
      .map(a => {
        const doc = db.inMemoryStore.doctors.find(d => d.id === a.doctor_id) || {};
        return {
          ...a,
          doctor_name: doc.name || 'Unknown',
          doctor_specialty: doc.specialty || 'General',
          consultation_fee: doc.consultation_fee || 0,
          doctor_phone: doc.phone || '',
          doctor_email: doc.email || '',
          qualification: doc.qualification || '',
          doctor_image: doc.image_url || ''
        };
      });

    if (matched.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No appointment found matching "${reference}".`
      });
    }

    res.json({
      success: true,
      data: matched
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update appointment status (Pending, Confirmed, Completed, Cancelled)
 */
async function updateAppointmentStatus(req, res, next) {
  try {
    const id = Number(req.params.id);
    const { status, doctor_notes, prescription } = req.body;
    const isConnected = db.getIsConnected();

    if (isConnected) {
      const [existing] = await db.query('SELECT * FROM appointments WHERE id = ?', [id]);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Appointment not found.' });
      }

      await db.query(
        'UPDATE appointments SET status = ?, doctor_notes = COALESCE(?, doctor_notes), prescription = COALESCE(?, prescription) WHERE id = ?',
        [status, doctor_notes || null, prescription || null, id]
      );

      const [updated] = await db.query('SELECT * FROM appointments WHERE id = ?', [id]);
      return res.json({
        success: true,
        message: `Appointment status updated to ${status}.`,
        data: updated
      });
    }

    const appt = db.inMemoryStore.appointments.find(a => a.id === id);
    if (!appt) {
      return res.status(404).json({ success: false, message: 'Appointment not found.' });
    }

    appt.status = status;
    if (doctor_notes) appt.doctor_notes = doctor_notes;
    if (prescription) appt.prescription = prescription;

    res.json({
      success: true,
      message: `Appointment status updated to ${status}.`,
      data: appt
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update Doctor Clinical Notes / Prescription
 */
async function updateDoctorNotes(req, res, next) {
  try {
    const id = Number(req.params.id);
    const { doctor_notes, prescription, status } = req.body;
    const isConnected = db.getIsConnected();

    if (isConnected) {
      const [existing] = await db.query('SELECT * FROM appointments WHERE id = ?', [id]);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Appointment not found.' });
      }

      await db.query(
        `UPDATE appointments 
         SET doctor_notes = COALESCE(?, doctor_notes), 
             prescription = COALESCE(?, prescription),
             status = COALESCE(?, status)
         WHERE id = ?`,
        [doctor_notes || null, prescription || null, status || null, id]
      );

      return res.json({
        success: true,
        message: 'Clinical notes and prescription updated successfully.'
      });
    }

    const appt = db.inMemoryStore.appointments.find(a => a.id === id);
    if (!appt) {
      return res.status(404).json({ success: false, message: 'Appointment not found.' });
    }

    if (doctor_notes !== undefined) appt.doctor_notes = doctor_notes;
    if (prescription !== undefined) appt.prescription = prescription;
    if (status) appt.status = status;

    res.json({
      success: true,
      message: 'Clinical notes and prescription updated successfully.',
      data: appt
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Cancel an appointment
 */
async function cancelAppointment(req, res, next) {
  try {
    const id = Number(req.params.id);
    const isConnected = db.getIsConnected();

    if (isConnected) {
      const [existing] = await db.query('SELECT * FROM appointments WHERE id = ?', [id]);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Appointment not found.' });
      }

      await db.query('UPDATE appointments SET status = "Cancelled" WHERE id = ?', [id]);
      return res.json({
        success: true,
        message: 'Appointment has been cancelled successfully.'
      });
    }

    const appt = db.inMemoryStore.appointments.find(a => a.id === id);
    if (!appt) {
      return res.status(404).json({ success: false, message: 'Appointment not found.' });
    }

    appt.status = 'Cancelled';
    res.json({
      success: true,
      message: 'Appointment has been cancelled successfully.'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * -------------------------------------------------------------
 * APPOINTMENT CONVERSATION & REPLIES (Doctor <-> Patient)
 * -------------------------------------------------------------
 */

/**
 * Get all messages / replies for a given appointment
 */
async function getAppointmentMessages(req, res, next) {
  try {
    const appointmentId = Number(req.params.id);
    const isConnected = db.getIsConnected();

    if (isConnected) {
      const sql = `
        SELECT * FROM appointment_messages 
        WHERE appointment_id = ? 
        ORDER BY created_at ASC
      `;
      const messages = await db.query(sql, [appointmentId]);
      return res.json({
        success: true,
        data: messages
      });
    }

    const messages = db.inMemoryStore.messages.filter(m => m.appointment_id === appointmentId);
    res.json({
      success: true,
      data: messages
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Post a new message / reply from Doctor or Patient
 */
async function postAppointmentMessage(req, res, next) {
  try {
    const appointmentId = Number(req.params.id);
    const { sender_id, sender_role, sender_name, message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message content cannot be empty.'
      });
    }

    const cleanRole = (sender_role || 'patient').toLowerCase() === 'doctor' ? 'doctor' : 'patient';
    const cleanName = (sender_name || (cleanRole === 'doctor' ? 'Doctor' : 'Patient')).trim();
    const cleanMsg = message.trim();
    const isConnected = db.getIsConnected();

    const newMsg = {
      appointment_id: appointmentId,
      sender_id: sender_id ? Number(sender_id) : null,
      sender_role: cleanRole,
      sender_name: cleanName,
      message: cleanMsg,
      created_at: new Date().toISOString()
    };

    if (isConnected) {
      const sql = `
        INSERT INTO appointment_messages (appointment_id, sender_id, sender_role, sender_name, message)
        VALUES (?, ?, ?, ?, ?)
      `;
      const result = await db.query(sql, [
        newMsg.appointment_id,
        newMsg.sender_id,
        newMsg.sender_role,
        newMsg.sender_name,
        newMsg.message
      ]);

      newMsg.id = result.insertId;
    } else {
      newMsg.id = db.inMemoryStore.messages.length + 1;
      db.inMemoryStore.messages.push(newMsg);
    }

    res.status(201).json({
      success: true,
      message: 'Reply sent successfully.',
      data: newMsg
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  bookAppointment,
  getAllAppointments,
  lookupAppointment,
  updateAppointmentStatus,
  updateDoctorNotes,
  cancelAppointment,
  getAppointmentMessages,
  postAppointmentMessage
};
