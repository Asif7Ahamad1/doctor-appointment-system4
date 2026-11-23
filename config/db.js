require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

let pool = null;
let isConnected = false;

// Fallback in-memory store in case MySQL service is not yet started by the user
const inMemoryStore = {
  users: [
    {
      id: 1,
      name: 'Dr. Sarah Jenkins',
      email: 'sarah.jenkins@hospital.org',
      password_hash: 'Password123!',
      role: 'doctor',
      phone: '+1 (555) 234-5678'
    },
    {
      id: 2,
      name: 'Dr. Robert Chen',
      email: 'robert.chen@hospital.org',
      password_hash: 'Password123!',
      role: 'doctor',
      phone: '+1 (555) 345-6789'
    },
    {
      id: 3,
      name: 'Jane Doe',
      email: 'patient@example.com',
      password_hash: 'Password123!',
      role: 'patient',
      phone: '+1 (555) 891-2345'
    }
  ],
  doctors: [
    {
      id: 1,
      user_id: 1,
      name: 'Dr. Sarah Jenkins',
      specialty: 'Cardiology',
      qualification: 'MD, FACC - Harvard Medical',
      experience_years: 14,
      consultation_fee: 120.00,
      email: 'sarah.jenkins@hospital.org',
      phone: '+1 (555) 234-5678',
      available_days: 'Monday,Wednesday,Friday',
      available_from: '09:00:00',
      available_to: '16:00:00',
      rating: 4.9,
      bio: 'Senior Interventional Cardiologist specializing in preventive heart health and coronary artery management.',
      image_url: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=400'
    },
    {
      id: 2,
      user_id: 2,
      name: 'Dr. Robert Chen',
      specialty: 'Neurology',
      qualification: 'MD, PhD - Johns Hopkins',
      experience_years: 11,
      consultation_fee: 135.00,
      email: 'robert.chen@hospital.org',
      phone: '+1 (555) 345-6789',
      available_days: 'Tuesday,Thursday,Saturday',
      available_from: '10:00:00',
      available_to: '17:00:00',
      rating: 4.8,
      bio: 'Specialist in migraine management, neuromuscular disorders, and advanced diagnostic neurology.',
      image_url: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=400'
    },
    {
      id: 3,
      user_id: null,
      name: 'Dr. Emily Martinez',
      specialty: 'Pediatrics',
      qualification: 'FAAP - Columbia University',
      experience_years: 9,
      consultation_fee: 85.00,
      email: 'emily.martinez@hospital.org',
      phone: '+1 (555) 456-7890',
      available_days: 'Monday,Tuesday,Wednesday,Thursday,Friday',
      available_from: '08:30:00',
      available_to: '15:30:00',
      rating: 4.9,
      bio: 'Compassionate pediatrician dedicated to child wellness, vaccinations, and adolescent healthcare.',
      image_url: 'https://images.unsplash.com/photo-1594824813571-638f02638523?auto=format&fit=crop&q=80&w=400'
    },
    {
      id: 4,
      user_id: null,
      name: 'Dr. Marcus Vance',
      specialty: 'Orthopedics',
      qualification: 'MS (Ortho), Stanford Medical',
      experience_years: 16,
      consultation_fee: 110.00,
      email: 'marcus.vance@hospital.org',
      phone: '+1 (555) 567-8901',
      available_days: 'Monday,Tuesday,Thursday',
      available_from: '09:00:00',
      available_to: '16:30:00',
      rating: 4.7,
      bio: 'Orthopedic and sports injury surgeon focusing on joint restoration and minimally invasive techniques.',
      image_url: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=400'
    },
    {
      id: 5,
      user_id: null,
      name: 'Dr. Priya Sharma',
      specialty: 'Dermatology',
      qualification: 'MD, DNB (Derm) - AIIMS',
      experience_years: 8,
      consultation_fee: 90.00,
      email: 'priya.sharma@hospital.org',
      phone: '+1 (555) 678-9012',
      available_days: 'Wednesday,Thursday,Friday,Saturday',
      available_from: '10:30:00',
      available_to: '18:00:00',
      rating: 4.9,
      bio: 'Clinical and aesthetic dermatologist addressing acne, eczema, hair loss, and modern laser skincare.',
      image_url: 'https://images.unsplash.com/photo-1559839734-66a392e3839d?auto=format&fit=crop&q=80&w=400'
    },
    {
      id: 6,
      user_id: null,
      name: 'Dr. David Miller',
      specialty: 'General Medicine',
      qualification: 'MD - Yale School of Medicine',
      experience_years: 12,
      consultation_fee: 75.00,
      email: 'david.miller@hospital.org',
      phone: '+1 (555) 789-0123',
      available_days: 'Monday,Tuesday,Wednesday,Thursday,Friday',
      available_from: '08:00:00',
      available_to: '17:00:00',
      rating: 4.8,
      bio: 'Primary care physician handling chronic disease control, routine checkups, and diagnostic screenings.',
      image_url: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=400'
    }
  ],
  appointments: [
    {
      id: 1,
      booking_reference: 'DOC-20261125-9A4E',
      doctor_id: 1,
      patient_id: 3,
      patient_name: 'Jane Doe',
      patient_email: 'patient@example.com',
      patient_phone: '+1 (555) 891-2345',
      patient_age: 29,
      patient_gender: 'Female',
      appointment_date: '2026-11-26',
      appointment_time: '10:00:00',
      symptoms: 'Mild heart palpitations after running and shortness of breath.',
      status: 'Confirmed',
      doctor_notes: 'Patient advised to bring recent ECG if available and avoid caffeine 12 hours prior to visit.',
      prescription: 'Tab Metoprolol 25mg once daily if resting pulse > 100bpm.',
      created_at: new Date().toISOString()
    }
  ],
  messages: [
    {
      id: 1,
      appointment_id: 1,
      sender_id: 3,
      sender_role: 'patient',
      sender_name: 'Jane Doe',
      message: 'Hello Dr. Jenkins, I booked this appointment because of sudden palpitations. Should I fast before coming in?',
      created_at: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: 2,
      appointment_id: 1,
      sender_id: 1,
      sender_role: 'doctor',
      sender_name: 'Dr. Sarah Jenkins',
      message: 'Hello Jane! Fasting is not required for the initial ECG, but please avoid energy drinks or coffee on the morning of your visit. See you on Thursday!',
      created_at: new Date(Date.now() - 1800000).toISOString()
    }
  ]
};

async function initPool() {
  const host = process.env.DB_HOST || 'localhost';
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const port = Number(process.env.DB_PORT) || 3306;
  const database = process.env.DB_NAME || 'doctor_appointment_db';

  try {
    const tempConn = await mysql.createConnection({
      host,
      user,
      password,
      port,
      connectTimeout: 1500
    });

    await tempConn.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await tempConn.end();

    pool = mysql.createPool({
      host,
      user,
      password,
      database,
      port,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0
    });

    const schemaFile = path.join(__dirname, '..', 'database', 'schema.sql');
    if (fs.existsSync(schemaFile)) {
      const sqlContent = fs.readFileSync(schemaFile, 'utf8');
      const conn = await pool.getConnection();
      try {
        const statements = sqlContent
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0 && !s.startsWith('--'));

        for (const stmt of statements) {
          try {
            await conn.query(stmt);
          } catch (e) {
            // Ignore if statement already ran or duplicate key
          }
        }
      } finally {
        conn.release();
      }
    }

    isConnected = true;
    console.log(` MySQL Pool Connected successfully to database: "${database}" at ${host}:${port}`);
    return true;
  } catch (err) {
    isConnected = false;
    console.warn(`\n[Database Warning] Could not connect to MySQL server at ${host}:${port} (${err.code || err.message}).`);
    console.warn(`[Database Notice] Application is running in Fallback In-Memory Mode.`);
    console.warn(`[Database Notice] To enable persistent MySQL storage, start your MySQL server and configure .env.\n`);
    return false;
  }
}

// Unified query wrapper supporting both MySQL and In-Memory fallback
async function query(sql, params = []) {
  if (isConnected && pool) {
    try {
      const [rows, fields] = await pool.query(sql, params);
      return rows;
    } catch (err) {
      console.error('MySQL Query Execution Error:', err.message);
      throw err;
    }
  }

  // Fallback simulator
  const normalizedSql = sql.trim().toUpperCase();

  if (normalizedSql.startsWith('SELECT') && normalizedSql.includes('FROM USERS')) {
    if (params.length > 0 && typeof params[0] === 'string') {
      return inMemoryStore.users.filter(u => u.email === params[0]);
    }
    return [...inMemoryStore.users];
  }

  if (normalizedSql.startsWith('SELECT') && normalizedSql.includes('FROM DOCTORS')) {
    return [...inMemoryStore.doctors];
  }

  if (normalizedSql.startsWith('SELECT') && normalizedSql.includes('FROM APPOINTMENTS')) {
    return [...inMemoryStore.appointments];
  }

  if (normalizedSql.startsWith('SELECT') && normalizedSql.includes('FROM APPOINTMENT_MESSAGES')) {
    if (params.length > 0) {
      return inMemoryStore.messages.filter(m => m.appointment_id === Number(params[0]));
    }
    return [...inMemoryStore.messages];
  }

  return [];
}

module.exports = {
  initPool,
  getPool: () => pool,
  getIsConnected: () => isConnected,
  inMemoryStore,
  query
};
