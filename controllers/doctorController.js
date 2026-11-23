const db = require('../config/db');

/**
 * Helper to generate 30-minute appointment slots between start and end time
 */
function generateTimeSlots(fromTime = '09:00:00', toTime = '17:00:00') {
  const slots = [];
  const [startHour, startMin] = fromTime.split(':').map(Number);
  const [endHour, endMin] = toTime.split(':').map(Number);

  let currentMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  while (currentMinutes + 30 <= endMinutes) {
    const h = Math.floor(currentMinutes / 60);
    const m = currentMinutes % 60;
    const formatted = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    slots.push(formatted);
    currentMinutes += 30; // 30-min intervals
  }
  return slots;
}

/**
 * Get all doctors with optional search and specialty filtering
 */
async function getAllDoctors(req, res, next) {
  try {
    const { specialty, search } = req.query;
    const isConnected = db.getIsConnected();

    if (isConnected) {
      let sql = 'SELECT * FROM doctors WHERE 1=1';
      const params = [];

      if (specialty && specialty.trim() && specialty !== 'All') {
        sql += ' AND specialty = ?';
        params.push(specialty.trim());
      }

      if (search && search.trim()) {
        sql += ' AND (name LIKE ? OR specialty LIKE ? OR qualification LIKE ?)';
        const searchTerm = `%${search.trim()}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      sql += ' ORDER BY rating DESC, name ASC';
      const doctors = await db.query(sql, params);

      return res.json({
        success: true,
        count: doctors.length,
        data: doctors,
        storage: 'mysql'
      });
    }

    // Fallback store
    let doctors = [...db.inMemoryStore.doctors];

    if (specialty && specialty.trim() && specialty !== 'All') {
      doctors = doctors.filter(d => d.specialty.toLowerCase() === specialty.trim().toLowerCase());
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      doctors = doctors.filter(d =>
        d.name.toLowerCase().includes(q) ||
        d.specialty.toLowerCase().includes(q) ||
        d.qualification.toLowerCase().includes(q)
      );
    }

    res.json({
      success: true,
      count: doctors.length,
      data: doctors,
      storage: 'fallback-memory'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get a single doctor by ID along with their available schedule slots
 */
async function getDoctorById(req, res, next) {
  try {
    const doctorId = Number(req.params.id);
    const selectedDate = req.query.date; // YYYY-MM-DD
    const isConnected = db.getIsConnected();

    let doctor = null;
    let bookedTimes = [];

    if (isConnected) {
      const [doc] = await db.query('SELECT * FROM doctors WHERE id = ?', [doctorId]);
      if (!doc) {
        return res.status(404).json({ success: false, message: 'Doctor not found.' });
      }
      doctor = doc;

      // Find booked times for this doctor on that date
      if (selectedDate) {
        const booked = await db.query(
          'SELECT appointment_time FROM appointments WHERE doctor_id = ? AND appointment_date = ? AND status != "Cancelled"',
          [doctorId, selectedDate]
        );
        bookedTimes = booked.map(b => b.appointment_time.slice(0, 5));
      }
    } else {
      doctor = db.inMemoryStore.doctors.find(d => d.id === doctorId);
      if (!doctor) {
        return res.status(404).json({ success: false, message: 'Doctor not found.' });
      }

      if (selectedDate) {
        bookedTimes = db.inMemoryStore.appointments
          .filter(a => a.doctor_id === doctorId && a.appointment_date === selectedDate && a.status !== 'Cancelled')
          .map(a => a.appointment_time.slice(0, 5));
      }
    }

    // Calculate slots
    const rawSlots = generateTimeSlots(doctor.available_from, doctor.available_to);
    const slots = rawSlots.map(time => ({
      time,
      isAvailable: !bookedTimes.includes(time)
    }));

    res.json({
      success: true,
      data: doctor,
      slots
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get distinct list of medical specialties
 */
async function getSpecialties(req, res, next) {
  try {
    const isConnected = db.getIsConnected();

    if (isConnected) {
      const rows = await db.query('SELECT DISTINCT specialty FROM doctors ORDER BY specialty ASC');
      return res.json({
        success: true,
        data: rows.map(r => r.specialty)
      });
    }

    const uniqueSpecialties = Array.from(new Set(db.inMemoryStore.doctors.map(d => d.specialty))).sort();
    res.json({
      success: true,
      data: uniqueSpecialties
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Add a new doctor (Admin feature)
 */
async function addDoctor(req, res, next) {
  try {
    const {
      name,
      specialty,
      qualification,
      experience_years,
      consultation_fee,
      email,
      phone,
      available_days,
      available_from,
      available_to,
      bio,
      image_url
    } = req.body;

    if (!name || !specialty || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Name, specialty, email, and phone are mandatory fields.'
      });
    }

    const isConnected = db.getIsConnected();
    const newDoctor = {
      name: name.trim(),
      specialty: specialty.trim(),
      qualification: (qualification || 'MBBS, MD').trim(),
      experience_years: Number(experience_years) || 5,
      consultation_fee: Number(consultation_fee) || 80.00,
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      available_days: available_days || 'Monday,Tuesday,Wednesday,Thursday,Friday',
      available_from: available_from || '09:00:00',
      available_to: available_to || '17:00:00',
      rating: 5.0,
      bio: (bio || 'Experienced medical practitioner committed to quality care.').trim(),
      image_url: image_url || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=400'
    };

    if (isConnected) {
      const sql = `
        INSERT INTO doctors 
        (name, specialty, qualification, experience_years, consultation_fee, email, phone, available_days, available_from, available_to, rating, bio, image_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const result = await db.query(sql, [
        newDoctor.name,
        newDoctor.specialty,
        newDoctor.qualification,
        newDoctor.experience_years,
        newDoctor.consultation_fee,
        newDoctor.email,
        newDoctor.phone,
        newDoctor.available_days,
        newDoctor.available_from,
        newDoctor.available_to,
        newDoctor.rating,
        newDoctor.bio,
        newDoctor.image_url
      ]);

      newDoctor.id = result.insertId;
    } else {
      newDoctor.id = db.inMemoryStore.doctors.length + 1;
      db.inMemoryStore.doctors.push(newDoctor);
    }

    res.status(201).json({
      success: true,
      message: 'Doctor added successfully.',
      data: newDoctor
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: 'A doctor with this email address already exists.'
      });
    }
    next(error);
  }
}

module.exports = {
  getAllDoctors,
  getDoctorById,
  getSpecialties,
  addDoctor
};
