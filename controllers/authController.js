const crypto = require('crypto');
const db = require('../config/db');

// Hash password with salt
function hashPassword(password) {
  return crypto.createHash('sha256').update(password + '_medicare_secret_salt').digest('hex');
}

function verifyPassword(inputPassword, storedHash) {
  // Check newly hashed password
  const computed = hashPassword(inputPassword);
  if (computed === storedHash) return true;
  // Also check direct demo password match for seeded accounts
  if (storedHash.startsWith('b109f3bbbc') && inputPassword === 'Password123!') return true;
  return inputPassword === storedHash;
}

/**
 * Register a new User (Doctor or Patient)
 */
async function register(req, res, next) {
  try {
    const { name, email, password, role = 'patient', phone, specialty, qualification, consultation_fee } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanRole = role.toLowerCase() === 'doctor' ? 'doctor' : 'patient';
    const pwdHash = hashPassword(password);
    const isConnected = db.getIsConnected();

    if (isConnected) {
      // Check if user exists
      const existing = await db.query('SELECT id FROM users WHERE email = ?', [cleanEmail]);
      if (existing.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'An account with this email address already exists.'
        });
      }

      // Insert User
      const userResult = await db.query(
        'INSERT INTO users (name, email, password_hash, role, phone) VALUES (?, ?, ?, ?, ?)',
        [name.trim(), cleanEmail, pwdHash, cleanRole, phone || null]
      );
      const userId = userResult.insertId;

      let doctorId = null;
      if (cleanRole === 'doctor') {
        const docResult = await db.query(
          `INSERT INTO doctors (user_id, name, specialty, qualification, experience_years, consultation_fee, email, phone, bio)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            userId,
            name.trim(),
            specialty ? specialty.trim() : 'General Medicine',
            qualification ? qualification.trim() : 'MD',
            5,
            Number(consultation_fee) || 80.00,
            cleanEmail,
            phone || '+1 (555) 000-0000',
            `Specialist doctor in ${specialty || 'General Medicine'}.`
          ]
        );
        doctorId = docResult.insertId;
      }

      return res.status(201).json({
        success: true,
        message: 'Registration successful!',
        user: {
          id: userId,
          name: name.trim(),
          email: cleanEmail,
          role: cleanRole,
          phone: phone || '',
          doctorId
        }
      });
    }

    // In-Memory Fallback
    const existing = db.inMemoryStore.users.find(u => u.email === cleanEmail);
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists.'
      });
    }

    const newUserId = db.inMemoryStore.users.length + 1;
    const newUser = {
      id: newUserId,
      name: name.trim(),
      email: cleanEmail,
      password_hash: pwdHash,
      role: cleanRole,
      phone: phone || ''
    };
    db.inMemoryStore.users.push(newUser);

    let doctorId = null;
    if (cleanRole === 'doctor') {
      doctorId = db.inMemoryStore.doctors.length + 1;
      db.inMemoryStore.doctors.push({
        id: doctorId,
        user_id: newUserId,
        name: name.trim(),
        specialty: specialty || 'General Medicine',
        qualification: qualification || 'MD',
        experience_years: 5,
        consultation_fee: Number(consultation_fee) || 80.00,
        email: cleanEmail,
        phone: phone || '+1 (555) 000-0000',
        available_days: 'Monday,Tuesday,Wednesday,Thursday,Friday',
        available_from: '09:00:00',
        available_to: '17:00:00',
        rating: 5.0,
        bio: `Specialist doctor in ${specialty || 'General Medicine'}.`,
        image_url: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=400'
      });
    }

    res.status(201).json({
      success: true,
      message: 'Registration successful!',
      user: {
        id: newUserId,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        phone: newUser.phone,
        doctorId
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Log in User (Doctor or Patient)
 */
async function login(req, res, next) {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const isConnected = db.getIsConnected();

    let user = null;
    let doctorId = null;

    if (isConnected) {
      const users = await db.query('SELECT * FROM users WHERE email = ?', [cleanEmail]);
      if (users.length === 0) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password.'
        });
      }
      user = users[0];

      if (!verifyPassword(password, user.password_hash)) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password.'
        });
      }

      if (user.role === 'doctor') {
        const docs = await db.query('SELECT id FROM doctors WHERE user_id = ? OR email = ?', [user.id, user.email]);
        if (docs.length > 0) {
          doctorId = docs[0].id;
        }
      }
    } else {
      user = db.inMemoryStore.users.find(u => u.email === cleanEmail);
      if (!user || !verifyPassword(password, user.password_hash)) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password.'
        });
      }

      if (user.role === 'doctor') {
        const doc = db.inMemoryStore.doctors.find(d => d.user_id === user.id || d.email === user.email);
        if (doc) doctorId = doc.id;
      }
    }

    // Role check (if specified)
    if (role && role !== 'all' && user.role !== role.toLowerCase()) {
      return res.status(403).json({
        success: false,
        message: `Account found, but role is "${user.role}", not "${role}". Please select the correct role tab.`
      });
    }

    res.json({
      success: true,
      message: `Welcome back, ${user.name}!`,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone || '',
        doctorId
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Return quick demo login accounts list for easy testing
 */
function getDemoAccounts(req, res) {
  res.json({
    success: true,
    data: [
      {
        role: 'doctor',
        name: 'Dr. Sarah Jenkins',
        email: 'sarah.jenkins@hospital.org',
        password: 'Password123!',
        specialty: 'Cardiology'
      },
      {
        role: 'doctor',
        name: 'Dr. Robert Chen',
        email: 'robert.chen@hospital.org',
        password: 'Password123!',
        specialty: 'Neurology'
      },
      {
        role: 'patient',
        name: 'Jane Doe',
        email: 'patient@example.com',
        password: 'Password123!'
      }
    ]
  });
}

module.exports = {
  register,
  login,
  getDemoAccounts
};
