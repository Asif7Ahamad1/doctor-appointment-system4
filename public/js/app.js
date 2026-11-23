/**
 * MediCare - Client Application Logic
 * Supports Patient & Doctor Authentication, Real-Time Consultation Replies & MySQL Sync
 */

document.addEventListener('DOMContentLoaded', () => {
  // =========================================================================
  // State
  // =========================================================================
  const state = {
    currentUser: null, // { id, name, email, role: 'doctor'|'patient', doctorId, phone }
    doctors: [],
    specialties: [],
    selectedDoctor: null,
    selectedSlot: null,
    activeTab: 'doctors-view',
    activeSpecialty: 'All',
    searchQuery: '',
    doctorFilterStatus: 'All',
    doctorSearchQuery: '',
    activeChatAppointment: null
  };

  // Restore saved session from localStorage
  try {
    const saved = localStorage.getItem('medicare_user');
    if (saved) {
      state.currentUser = JSON.parse(saved);
    }
  } catch (e) {}

  // =========================================================================
  // DOM Elements
  // =========================================================================
  const navButtons = document.querySelectorAll('.nav-btn');
  const viewPanels = document.querySelectorAll('.view-panel');
  const dbStatusBadge = document.getElementById('db-status-badge');
  const dbStatusText = document.getElementById('db-status-text');
  const authNavContainer = document.getElementById('auth-nav-container');

  // Auth Modal Elements
  const authModalOverlay = document.getElementById('auth-modal-overlay');
  const btnOpenAuth = document.getElementById('btn-open-auth');
  const btnCloseAuth = document.getElementById('btn-close-auth');
  const authModalTitle = document.getElementById('auth-modal-title');
  const authForm = document.getElementById('auth-form');
  const btnToggleLogin = document.getElementById('btn-toggle-login');
  const btnToggleRegister = document.getElementById('btn-toggle-register');
  const authExtraFields = document.getElementById('auth-extra-fields');
  const doctorSpecGroup = document.getElementById('doctor-spec-group');
  const btnAuthSubmit = document.getElementById('btn-auth-submit');
  const btnQuickDoctor = document.getElementById('btn-quick-doctor');
  const btnQuickPatient = document.getElementById('btn-quick-patient');

  // Doctor Directory Elements
  const doctorsGrid = document.getElementById('doctors-grid');
  const specialtyFilter = document.getElementById('specialty-filter');
  const specialtyPillsContainer = document.getElementById('specialty-pills-container');
  const doctorSearchInput = document.getElementById('doctor-search');
  const btnResetFilters = document.getElementById('btn-reset-filters');
  const btnRefreshDoctors = document.getElementById('btn-refresh-doctors');
  const doctorsCountLabel = document.getElementById('doctors-count-label');

  // Booking Modal Elements
  const bookingModalOverlay = document.getElementById('booking-modal-overlay');
  const btnCloseBooking = document.getElementById('btn-close-booking');
  const btnCancelBookingModal = document.getElementById('btn-cancel-booking-modal');
  const appointmentBookingForm = document.getElementById('appointment-booking-form');
  const modalDocAvatar = document.getElementById('modal-doc-avatar');
  const modalDocName = document.getElementById('modal-doc-name');
  const modalDocSpec = document.getElementById('modal-doc-spec');
  const bookingDoctorIdInput = document.getElementById('booking-doctor-id');
  const bookingDateInput = document.getElementById('booking-date');
  const bookingTimeInput = document.getElementById('booking-time');
  const bookingSlotsContainer = document.getElementById('booking-slots-container');
  const btnSubmitBooking = document.getElementById('btn-submit-booking');

  // Success Modal Elements
  const successModalOverlay = document.getElementById('success-modal-overlay');
  const successReferenceCode = document.getElementById('success-reference-code');
  const successAppointmentDetails = document.getElementById('success-appointment-details');
  const btnCopyRef = document.getElementById('btn-copy-ref');
  const btnCloseSuccess = document.getElementById('btn-close-success');
  const btnTrackSuccess = document.getElementById('btn-track-success');

  // Patient Track Elements
  const trackForm = document.getElementById('track-form');
  const trackSearchInput = document.getElementById('track-search-input');
  const trackResultsContainer = document.getElementById('track-results-container');
  const patientLoggedHint = document.getElementById('patient-logged-hint');
  const loggedPatientEmailDisplay = document.getElementById('logged-patient-email-display');
  const btnLoadMyBookings = document.getElementById('btn-load-my-bookings');

  // Doctor Dashboard Elements
  const btnRefreshDoctorDash = document.getElementById('btn-refresh-doctor-dash');
  const doctorSearchInputElem = document.getElementById('doctor-search-input');
  const doctorStatusFilterElem = document.getElementById('doctor-status-filter');
  const doctorTableBody = document.getElementById('doctor-table-body');
  const statDoctors = document.getElementById('stat-doctors');
  const statTotalAppts = document.getElementById('stat-total-appts');
  const statPending = document.getElementById('stat-pending');
  const statConfirmed = document.getElementById('stat-confirmed');
  const statCompleted = document.getElementById('stat-completed');

  // Chat / Messages Modal Elements
  const chatModalOverlay = document.getElementById('chat-modal-overlay');
  const btnCloseChat = document.getElementById('btn-close-chat');
  const chatModalTitle = document.getElementById('chat-modal-title');
  const chatModalSubtitle = document.getElementById('chat-modal-subtitle');
  const chatApptSummary = document.getElementById('chat-appt-summary');
  const chatClinicalBox = document.getElementById('chat-clinical-box');
  const chatMessagesContainer = document.getElementById('chat-messages-container');
  const chatReplyForm = document.getElementById('chat-reply-form');
  const chatReplyText = document.getElementById('chat-reply-text');
  const btnSendReply = document.getElementById('btn-send-reply');

  // Prescription Modal Elements
  const prescriptionModalOverlay = document.getElementById('prescription-modal-overlay');
  const btnCloseRx = document.getElementById('btn-close-rx');
  const btnCancelRx = document.getElementById('btn-cancel-rx');
  const prescriptionForm = document.getElementById('prescription-form');
  const rxApptId = document.getElementById('rx-appt-id');
  const rxStatus = document.getElementById('rx-status');
  const rxNotes = document.getElementById('rx-notes');
  const rxPrescription = document.getElementById('rx-prescription');

  // =========================================================================
  // Initialize Application
  // =========================================================================
  async function init() {
    renderAuthUI();
    setupNavigation();
    setupEventListeners();
    setupDateConstraints();
    
    await checkDatabaseHealth();
    await fetchSpecialties();
    await fetchDoctors();
    fetchAdminStats();

    // Auto-adjust view if doctor is logged in
    if (state.currentUser && state.currentUser.role === 'doctor') {
      switchTab('doctor-dashboard-view');
    }
  }

  // Live Database Health
  async function checkDatabaseHealth() {
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = await res.json();
        if (data.mysqlConnected) {
          dbStatusBadge.className = 'badge-status connected';
          dbStatusText.textContent = 'MySQL Live';
          dbStatusBadge.title = 'Connected to MySQL Database';
        } else {
          dbStatusBadge.className = 'badge-status fallback';
          dbStatusText.textContent = 'Demo Mode (MySQL Offline)';
          dbStatusBadge.title = 'In-Memory Demo Mode. Start MySQL service to enable persistent storage.';
        }
      }
    } catch (e) {
      dbStatusBadge.className = 'badge-status fallback';
      dbStatusText.textContent = 'Offline';
    }
  }

  // =========================================================================
  // User Authentication & Session Management
  // =========================================================================
  let isRegisterMode = false;

  function renderAuthUI() {
    if (state.currentUser) {
      const isDoc = state.currentUser.role === 'doctor';
      authNavContainer.innerHTML = `
        <div class="user-session-badge">
          <span>${isDoc ? '🩺' : '👤'} ${escapeHTML(state.currentUser.name)}</span>
          <span class="role-tag ${state.currentUser.role}">${state.currentUser.role}</span>
          <button class="btn btn-secondary btn-sm" id="btn-logout" style="padding: 0.2rem 0.6rem; font-size: 0.75rem; margin-left: 0.25rem;">
            Logout
          </button>
        </div>
      `;
      document.getElementById('btn-logout').addEventListener('click', logout);

      // Show patient logged-in hint in Track view
      if (!isDoc) {
        patientLoggedHint.style.display = 'block';
        loggedPatientEmailDisplay.textContent = state.currentUser.email;
      } else {
        patientLoggedHint.style.display = 'none';
      }
    } else {
      authNavContainer.innerHTML = `<button class="btn btn-primary btn-sm" id="btn-open-auth">🔑 Sign In</button>`;
      document.getElementById('btn-open-auth').addEventListener('click', openAuthModal);
      patientLoggedHint.style.display = 'none';
    }
  }

  function openAuthModal() {
    authModalOverlay.classList.add('active');
  }

  function closeAuthModal() {
    authModalOverlay.classList.remove('active');
    authForm.reset();
  }

  function logout() {
    state.currentUser = null;
    localStorage.removeItem('medicare_user');
    renderAuthUI();
    Toast.info('You have logged out.');
    switchTab('doctors-view');
  }

  // Toggle Login / Register mode
  btnToggleLogin.addEventListener('click', () => {
    isRegisterMode = false;
    btnToggleLogin.classList.add('active');
    btnToggleRegister.classList.remove('active');
    authModalTitle.textContent = 'Sign In to MediCare';
    authExtraFields.style.display = 'none';
    btnAuthSubmit.textContent = 'Sign In';
  });

  btnToggleRegister.addEventListener('click', () => {
    isRegisterMode = true;
    btnToggleRegister.classList.add('active');
    btnToggleLogin.classList.remove('active');
    authModalTitle.textContent = 'Create an Account';
    authExtraFields.style.display = 'block';
    btnAuthSubmit.textContent = 'Register Account';
  });

  // Watch role radio button
  document.querySelectorAll('input[name="auth_role"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      if (e.target.value === 'doctor' && isRegisterMode) {
        doctorSpecGroup.style.display = 'block';
      } else {
        doctorSpecGroup.style.display = 'none';
      }
    });
  });

  // Auth Form Submit
  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const role = document.querySelector('input[name="auth_role"]:checked').value;
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;

    btnAuthSubmit.disabled = true;
    btnAuthSubmit.textContent = 'Processing...';

    try {
      if (isRegisterMode) {
        // Register
        const payload = {
          name: document.getElementById('auth-name').value.trim(),
          email,
          password,
          role,
          phone: document.getElementById('auth-phone').value.trim(),
          specialty: document.getElementById('auth-specialty').value.trim()
        };

        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const json = await res.json();

        if (res.ok && json.success) {
          state.currentUser = json.user;
          localStorage.setItem('medicare_user', JSON.stringify(json.user));
          renderAuthUI();
          closeAuthModal();
          Toast.success(`Welcome to MediCare, ${json.user.name}!`);
          if (json.user.role === 'doctor') {
            switchTab('doctor-dashboard-view');
          }
        } else {
          Toast.error(json.message || 'Registration failed.');
        }
      } else {
        // Login
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, role })
        });
        const json = await res.json();

        if (res.ok && json.success) {
          state.currentUser = json.user;
          localStorage.setItem('medicare_user', JSON.stringify(json.user));
          renderAuthUI();
          closeAuthModal();
          Toast.success(json.message || `Welcome back, ${json.user.name}!`);
          if (json.user.role === 'doctor') {
            switchTab('doctor-dashboard-view');
          } else {
            switchTab('track-view');
            trackSearchInput.value = json.user.email;
            trackForm.dispatchEvent(new Event('submit'));
          }
        } else {
          Toast.error(json.message || 'Login failed.');
        }
      }
    } catch (err) {
      Toast.error('Network error during authentication.');
    } finally {
      btnAuthSubmit.disabled = false;
      btnAuthSubmit.textContent = isRegisterMode ? 'Register Account' : 'Sign In';
    }
  });

  // Quick Demo Logins
  btnQuickDoctor.addEventListener('click', async () => {
    document.querySelector('input[name="auth_role"][value="doctor"]').checked = true;
    document.getElementById('auth-email').value = 'sarah.jenkins@hospital.org';
    document.getElementById('auth-password').value = 'Password123!';
    authForm.dispatchEvent(new Event('submit'));
  });

  btnQuickPatient.addEventListener('click', async () => {
    document.querySelector('input[name="auth_role"][value="patient"]').checked = true;
    document.getElementById('auth-email').value = 'patient@example.com';
    document.getElementById('auth-password').value = 'Password123!';
    authForm.dispatchEvent(new Event('submit'));
  });

  btnCloseAuth.addEventListener('click', closeAuthModal);

  // =========================================================================
  // Navigation & View Panels
  // =========================================================================
  function setupNavigation() {
    navButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-tab');
        switchTab(target);
      });
    });

    document.getElementById('brand-home-link').addEventListener('click', (e) => {
      e.preventDefault();
      switchTab('doctors-view');
    });
  }

  function switchTab(tabId) {
    state.activeTab = tabId;

    navButtons.forEach(btn => {
      if (btn.getAttribute('data-tab') === tabId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    viewPanels.forEach(panel => {
      if (panel.id === tabId) {
        panel.style.display = 'block';
        panel.classList.add('active');
      } else {
        panel.style.display = 'none';
        panel.classList.remove('active');
      }
    });

    if (tabId === 'doctor-dashboard-view') {
      fetchAdminStats();
      fetchDoctorAppointments();
    }
  }

  // =========================================================================
  // Doctors Directory
  // =========================================================================
  async function fetchSpecialties() {
    try {
      const res = await fetch('/api/doctors/meta/specialties');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        state.specialties = json.data;
        renderSpecialtiesUI();
      }
    } catch (err) {}
  }

  function renderSpecialtiesUI() {
    specialtyFilter.innerHTML = '<option value="All">All Specialties</option>';
    specialtyPillsContainer.innerHTML = '<button class="pill-btn active" data-specialty="All">All Specialties</button>';

    state.specialties.forEach(spec => {
      const opt = document.createElement('option');
      opt.value = spec;
      opt.textContent = spec;
      specialtyFilter.appendChild(opt);

      const pill = document.createElement('button');
      pill.className = 'pill-btn';
      pill.setAttribute('data-specialty', spec);
      pill.textContent = spec;
      pill.addEventListener('click', () => selectSpecialty(spec));
      specialtyPillsContainer.appendChild(pill);
    });
  }

  function selectSpecialty(spec) {
    state.activeSpecialty = spec;
    specialtyFilter.value = spec;

    document.querySelectorAll('.pill-btn').forEach(btn => {
      if (btn.getAttribute('data-specialty') === spec) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    fetchDoctors();
  }

  async function fetchDoctors() {
    try {
      doctorsGrid.innerHTML = `
        <div style="text-align: center; grid-column: 1 / -1; padding: 3rem;">
          <p style="color: var(--text-muted);">Finding available doctors...</p>
        </div>
      `;

      let url = '/api/doctors?';
      if (state.activeSpecialty && state.activeSpecialty !== 'All') {
        url += `specialty=${encodeURIComponent(state.activeSpecialty)}&`;
      }
      if (state.searchQuery) {
        url += `search=${encodeURIComponent(state.searchQuery)}&`;
      }

      const res = await fetch(url);
      const json = await res.json();

      if (json.success) {
        state.doctors = json.data;
        renderDoctorsGrid(state.doctors);
        doctorsCountLabel.textContent = `Showing ${state.doctors.length} verified doctor${state.doctors.length === 1 ? '' : 's'}`;
      }
    } catch (err) {
      Toast.error('Network error loading doctors.');
    }
  }

  function renderDoctorsGrid(doctors) {
    if (!doctors || doctors.length === 0) {
      doctorsGrid.innerHTML = `
        <div style="text-align: center; grid-column: 1 / -1; padding: 4rem 1rem; background: white; border-radius: 12px; border: 1px dashed var(--border-color);">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">👨‍⚕️</div>
          <h3 style="font-size: 1.2rem; color: var(--text-primary); margin-bottom: 0.3rem;">No doctors found</h3>
          <p style="color: var(--text-muted); font-size: 0.9rem;">Try searching another keyword or specialty.</p>
        </div>
      `;
      return;
    }

    doctorsGrid.innerHTML = doctors.map(doc => {
      const days = (doc.available_days || 'Mon - Fri').split(',').join(' • ');
      const avatar = doc.image_url || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=400';
      const rating = doc.rating ? Number(doc.rating).toFixed(1) : '4.8';

      return `
        <div class="doctor-card">
          <div class="doctor-card-header">
            <img class="doctor-avatar" src="${avatar}" alt="${doc.name}" onerror="this.src='https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=400'">
            <div class="doctor-meta">
              <h3 class="doctor-name">${escapeHTML(doc.name)}</h3>
              <span class="doctor-specialty">${escapeHTML(doc.specialty)}</span>
              <div class="doctor-qual">${escapeHTML(doc.qualification)}</div>
            </div>
          </div>
          <div class="doctor-card-body">
            <p class="doctor-bio">${escapeHTML(doc.bio || 'Experienced medical practitioner committed to quality care.')}</p>
            <div class="doctor-details-list">
              <div class="detail-item">
                <strong>Experience</strong>
                <span>${doc.experience_years} Years</span>
              </div>
              <div class="detail-item">
                <strong>Rating</strong>
                <span>⭐ ${rating} / 5</span>
              </div>
              <div class="detail-item" style="grid-column: 1 / -1;">
                <strong>Days Available</strong>
                <span>${escapeHTML(days)}</span>
              </div>
            </div>
          </div>
          <div class="doctor-card-footer">
            <div class="fee-tag">
              $${Number(doc.consultation_fee).toFixed(0)} <small>/ visit</small>
            </div>
            <button class="btn btn-primary btn-sm btn-book-doctor" data-doctor-id="${doc.id}">
              📅 Book Appointment
            </button>
          </div>
        </div>
      `;
    }).join('');

    document.querySelectorAll('.btn-book-doctor').forEach(btn => {
      btn.addEventListener('click', () => {
        const docId = Number(btn.getAttribute('data-doctor-id'));
        const doctor = state.doctors.find(d => d.id === docId);
        if (doctor) openBookingModal(doctor);
      });
    });
  }

  // =========================================================================
  // Booking Modal
  // =========================================================================
  function setupDateConstraints() {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    bookingDateInput.min = today.toISOString().split('T')[0];
    bookingDateInput.value = tomorrow.toISOString().split('T')[0];
  }

  async function openBookingModal(doctor) {
    state.selectedDoctor = doctor;
    state.selectedSlot = null;

    modalDocAvatar.src = doctor.image_url || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=400';
    modalDocName.textContent = doctor.name;
    modalDocSpec.textContent = `${doctor.specialty} • Fee: $${Number(doctor.consultation_fee).toFixed(2)}`;
    bookingDoctorIdInput.value = doctor.id;
    bookingTimeInput.value = '';

    // If a patient is logged in, auto-fill their contact details
    if (state.currentUser && state.currentUser.role === 'patient') {
      document.getElementById('booking-patient-name').value = state.currentUser.name || '';
      document.getElementById('booking-patient-email').value = state.currentUser.email || '';
      document.getElementById('booking-patient-phone').value = state.currentUser.phone || '';
    }

    await loadSlotsForDate(doctor.id, bookingDateInput.value);
    bookingModalOverlay.classList.add('active');
  }

  function closeBookingModal() {
    bookingModalOverlay.classList.remove('active');
    appointmentBookingForm.reset();
    state.selectedSlot = null;
    setupDateConstraints();
  }

  async function loadSlotsForDate(doctorId, dateStr) {
    if (!doctorId || !dateStr) return;

    bookingSlotsContainer.innerHTML = `<span style="font-size: 0.8rem; color: var(--text-muted); grid-column: 1 / -1;">Loading available slots...</span>`;

    try {
      const res = await fetch(`/api/doctors/${doctorId}?date=${dateStr}`);
      const json = await res.json();

      if (json.success && Array.isArray(json.slots)) {
        if (json.slots.length === 0) {
          bookingSlotsContainer.innerHTML = `<span style="font-size: 0.8rem; color: var(--danger); grid-column: 1 / -1;">No slots available.</span>`;
          return;
        }

        bookingSlotsContainer.innerHTML = '';
        json.slots.forEach(slot => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'time-slot-btn';
          btn.textContent = slot.time;
          btn.disabled = !slot.isAvailable;

          if (slot.isAvailable) {
            btn.addEventListener('click', () => {
              document.querySelectorAll('.time-slot-btn').forEach(b => b.classList.remove('selected'));
              btn.classList.add('selected');
              state.selectedSlot = slot.time;
              bookingTimeInput.value = slot.time;
            });
          }

          bookingSlotsContainer.appendChild(btn);
        });
      }
    } catch (err) {
      bookingSlotsContainer.innerHTML = `<span style="font-size: 0.8rem; color: var(--danger); grid-column: 1 / -1;">Failed to load time slots.</span>`;
    }
  }

  appointmentBookingForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!bookingTimeInput.value) {
      Toast.warning('Please select an available time slot.');
      return;
    }

    const payload = {
      doctor_id: Number(bookingDoctorIdInput.value),
      patient_id: state.currentUser ? state.currentUser.id : null,
      patient_name: document.getElementById('booking-patient-name').value.trim(),
      patient_email: document.getElementById('booking-patient-email').value.trim(),
      patient_phone: document.getElementById('booking-patient-phone').value.trim(),
      patient_age: Number(document.getElementById('booking-patient-age').value),
      patient_gender: document.getElementById('booking-patient-gender').value,
      appointment_date: bookingDateInput.value,
      appointment_time: bookingTimeInput.value,
      symptoms: document.getElementById('booking-symptoms').value.trim()
    };

    btnSubmitBooking.disabled = true;
    btnSubmitBooking.textContent = 'Booking...';

    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();

      if (res.ok && json.success) {
        closeBookingModal();
        showBookingSuccess(json.data);
        Toast.success('Appointment booked successfully!');
      } else {
        const errorMsg = json.errors ? json.errors.join(' ') : (json.message || 'Could not schedule appointment.');
        Toast.error(errorMsg);
      }
    } catch (err) {
      Toast.error('Network error while booking appointment.');
    } finally {
      btnSubmitBooking.disabled = false;
      btnSubmitBooking.textContent = 'Confirm Booking';
    }
  });

  function showBookingSuccess(appointmentData) {
    successReferenceCode.textContent = appointmentData.booking_reference;

    successAppointmentDetails.innerHTML = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
        <div><strong>Doctor:</strong> ${escapeHTML(appointmentData.doctor_name || state.selectedDoctor?.name || '')}</div>
        <div><strong>Specialty:</strong> ${escapeHTML(appointmentData.doctor_specialty || state.selectedDoctor?.specialty || '')}</div>
        <div><strong>Patient:</strong> ${escapeHTML(appointmentData.patient_name)}</div>
        <div><strong>Date:</strong> ${appointmentData.appointment_date}</div>
        <div><strong>Time:</strong> ${appointmentData.appointment_time.slice(0, 5)}</div>
        <div><strong>Fee:</strong> $${Number(appointmentData.consultation_fee || state.selectedDoctor?.consultation_fee || 0).toFixed(2)}</div>
      </div>
    `;

    successModalOverlay.classList.add('active');
  }

  btnCopyRef.addEventListener('click', () => {
    const ref = successReferenceCode.textContent.trim();
    navigator.clipboard.writeText(ref).then(() => Toast.success('Reference code copied!'));
  });

  btnCloseSuccess.addEventListener('click', () => successModalOverlay.classList.remove('active'));

  btnTrackSuccess.addEventListener('click', () => {
    const ref = successReferenceCode.textContent.trim();
    successModalOverlay.classList.remove('active');
    switchTab('track-view');
    trackSearchInput.value = ref;
    trackForm.dispatchEvent(new Event('submit'));
  });

  // =========================================================================
  // Patient View: Track Appointments & Replies
  // =========================================================================
  btnLoadMyBookings.addEventListener('click', () => {
    if (state.currentUser) {
      trackSearchInput.value = state.currentUser.email;
      trackForm.dispatchEvent(new Event('submit'));
    }
  });

  trackForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const query = trackSearchInput.value.trim();
    if (!query) return;

    trackResultsContainer.innerHTML = `<div style="text-align: center; padding: 2rem;"><p style="color: var(--text-muted);">Searching appointments...</p></div>`;

    try {
      const res = await fetch(`/api/appointments/lookup/${encodeURIComponent(query)}`);
      const json = await res.json();

      if (res.ok && json.success && Array.isArray(json.data)) {
        renderPatientAppointments(json.data);
      } else {
        trackResultsContainer.innerHTML = `
          <div style="background: white; padding: 2.5rem; border-radius: 12px; text-align: center; border: 1px dashed var(--border-color);">
            <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🔍</div>
            <h3 style="font-size: 1.2rem; color: var(--text-primary); margin-bottom: 0.25rem;">No Appointments Found</h3>
            <p style="color: var(--text-muted); font-size: 0.9rem;">${escapeHTML(json.message || 'No appointment found with that reference or email.')}</p>
          </div>
        `;
      }
    } catch (err) {
      Toast.error('Network error looking up appointments.');
    }
  });

  function renderPatientAppointments(appointments) {
    trackResultsContainer.innerHTML = appointments.map(appt => {
      const isCancelled = appt.status === 'Cancelled';
      const isCompleted = appt.status === 'Completed';

      return `
        <div class="appointment-ticket" data-appt-id="${appt.id}">
          <div class="ticket-header">
            <div>
              <span class="ticket-ref">${escapeHTML(appt.booking_reference)}</span>
              <span style="font-size: 0.8rem; color: var(--text-muted); margin-left: 0.5rem;">
                Date: ${appt.appointment_date} at ${appt.appointment_time.slice(0, 5)}
              </span>
            </div>
            <span class="status-pill status-${appt.status}">${appt.status}</span>
          </div>

          <div class="ticket-body">
            <div>
              <div style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700;">Doctor & Specialty</div>
              <strong style="color: var(--text-primary);">${escapeHTML(appt.doctor_name)}</strong>
              <div style="font-size: 0.85rem; color: var(--text-secondary);">${escapeHTML(appt.doctor_specialty)}</div>
            </div>
            <div>
              <div style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700;">Patient</div>
              <strong style="color: var(--text-primary);">${escapeHTML(appt.patient_name)}</strong>
              <div style="font-size: 0.85rem; color: var(--text-secondary);">${escapeHTML(appt.patient_email)}</div>
            </div>
            <div style="grid-column: 1 / -1;">
              <div style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700;">Reason for Consultation</div>
              <p style="font-size: 0.88rem; color: var(--text-secondary); margin: 0;">${escapeHTML(appt.symptoms || 'None specified')}</p>
            </div>
          </div>

          ${appt.doctor_notes || appt.prescription ? `
            <div class="doctor-notes-box">
              <strong>🩺 Doctor's Clinical Advice & Prescription:</strong>
              ${appt.doctor_notes ? `<p style="margin: 0.2rem 0;"><strong>Advice:</strong> ${escapeHTML(appt.doctor_notes)}</p>` : ''}
              ${appt.prescription ? `<p style="margin: 0.2rem 0; color: #15803d;"><strong>Prescription:</strong> ${escapeHTML(appt.prescription)}</p>` : ''}
            </div>
          ` : ''}

          <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1rem; padding-top: 0.75rem; border-top: 1px solid var(--border-color);">
            <button class="btn btn-primary btn-sm btn-open-chat" data-id="${appt.id}" data-ref="${appt.booking_reference}" data-doc="${appt.doctor_name}" data-patient="${appt.patient_name}">
              💬 Conversation & Messages
            </button>
            ${!isCancelled && !isCompleted ? `
              <button class="btn btn-danger btn-sm btn-cancel-appt" data-id="${appt.id}">
                Cancel Visit
              </button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

    // Attach chat & cancel listeners
    document.querySelectorAll('.btn-open-chat').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = Number(btn.getAttribute('data-id'));
        const ref = btn.getAttribute('data-ref');
        const docName = btn.getAttribute('data-doc');
        const patientName = btn.getAttribute('data-patient');
        const appt = appointments.find(a => a.id === id);
        openChatModal(appt || { id, booking_reference: ref, doctor_name: docName, patient_name: patientName });
      });
    });

    document.querySelectorAll('.btn-cancel-appt').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        if (confirm('Are you sure you want to cancel this appointment?')) {
          try {
            const res = await fetch(`/api/appointments/${id}`, { method: 'DELETE' });
            const json = await res.json();
            if (json.success) {
              Toast.success('Appointment cancelled.');
              trackForm.dispatchEvent(new Event('submit'));
            } else {
              Toast.error(json.message || 'Failed to cancel.');
            }
          } catch (e) {
            Toast.error('Network error cancelling appointment.');
          }
        }
      });
    });
  }

  // =========================================================================
  // Doctor Dashboard
  // =========================================================================
  async function fetchAdminStats() {
    try {
      const res = await fetch('/api/stats');
      const json = await res.json();
      if (json.success && json.data) {
        statDoctors.textContent = json.data.totalDoctors || 0;
        statTotalAppts.textContent = json.data.totalAppointments || 0;
        statPending.textContent = json.data.pendingAppointments || 0;
        statConfirmed.textContent = json.data.confirmedAppointments || 0;
        statCompleted.textContent = json.data.completedAppointments || 0;
      }
    } catch (e) {}
  }

  async function fetchDoctorAppointments() {
    doctorTableBody.innerHTML = `
      <tr><td colspan="7" style="text-align: center; padding: 2rem; color: var(--text-muted);">Loading appointments...</td></tr>
    `;

    try {
      let url = '/api/appointments?';
      // If doctor is logged in, filter appointments by doctorId
      if (state.currentUser && state.currentUser.role === 'doctor' && state.currentUser.doctorId) {
        url += `doctor_id=${state.currentUser.doctorId}&`;
      }
      if (state.doctorFilterStatus && state.doctorFilterStatus !== 'All') {
        url += `status=${encodeURIComponent(state.doctorFilterStatus)}&`;
      }
      if (state.doctorSearchQuery) {
        url += `search=${encodeURIComponent(state.doctorSearchQuery)}&`;
      }

      const res = await fetch(url);
      const json = await res.json();

      if (json.success && Array.isArray(json.data)) {
        renderDoctorTable(json.data);
      }
    } catch (err) {
      Toast.error('Error loading doctor appointments.');
    }
  }

  function renderDoctorTable(appointments) {
    if (appointments.length === 0) {
      doctorTableBody.innerHTML = `
        <tr><td colspan="7" style="text-align: center; padding: 3rem; color: var(--text-muted);">No appointments found.</td></tr>
      `;
      return;
    }

    doctorTableBody.innerHTML = appointments.map(appt => {
      return `
        <tr>
          <td><code style="font-weight: 700; color: var(--primary);">${escapeHTML(appt.booking_reference)}</code></td>
          <td>
            <strong>${escapeHTML(appt.patient_name)}</strong>
            <div style="font-size: 0.8rem; color: var(--text-muted);">${escapeHTML(appt.patient_email)} • ${escapeHTML(appt.patient_phone)}</div>
            <div style="font-size: 0.8rem; color: var(--text-muted);">${appt.patient_gender}, ${appt.patient_age}y</div>
          </td>
          <td>
            <strong>${escapeHTML(appt.doctor_name)}</strong>
            <div style="font-size: 0.8rem; color: var(--text-muted);">${escapeHTML(appt.doctor_specialty)}</div>
          </td>
          <td>
            <strong>${appt.appointment_date}</strong>
            <div style="font-size: 0.8rem; color: var(--text-muted);">⏰ ${appt.appointment_time.slice(0, 5)}</div>
          </td>
          <td style="max-width: 170px; font-size: 0.85rem; color: var(--text-secondary);">
            ${escapeHTML(appt.symptoms || '—')}
          </td>
          <td><span class="status-pill status-${appt.status}">${appt.status}</span></td>
          <td>
            <div style="display: flex; gap: 0.35rem; flex-wrap: wrap;">
              <button class="btn btn-primary btn-sm btn-doc-chat" data-id="${appt.id}" title="Reply to Patient">
                💬 Reply
              </button>
              <button class="btn btn-secondary btn-sm btn-doc-rx" data-id="${appt.id}" title="Prescribe & Notes">
                💊 Rx & Notes
              </button>
              ${appt.status !== 'Confirmed' && appt.status !== 'Completed' && appt.status !== 'Cancelled' ? `
                <button class="btn btn-success btn-sm btn-update-status" data-id="${appt.id}" data-status="Confirmed">✓ Confirm</button>
              ` : ''}
              ${appt.status === 'Confirmed' ? `
                <button class="btn btn-primary btn-sm btn-update-status" data-id="${appt.id}" data-status="Completed">★ Complete</button>
              ` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Attach chat listener
    document.querySelectorAll('.btn-doc-chat').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = Number(btn.getAttribute('data-id'));
        const appt = appointments.find(a => a.id === id);
        if (appt) openChatModal(appt);
      });
    });

    // Attach Rx modal listener
    document.querySelectorAll('.btn-doc-rx').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = Number(btn.getAttribute('data-id'));
        const appt = appointments.find(a => a.id === id);
        if (appt) openPrescriptionModal(appt);
      });
    });

    // Attach status quick buttons
    document.querySelectorAll('.btn-update-status').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const status = btn.getAttribute('data-status');
        try {
          const res = await fetch(`/api/appointments/${id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
          });
          const json = await res.json();
          if (json.success) {
            Toast.success(`Status updated to ${status}.`);
            fetchAdminStats();
            fetchDoctorAppointments();
          }
        } catch (e) {
          Toast.error('Network error updating status.');
        }
      });
    });
  }

  // =========================================================================
  // Consultation Messages Thread (Doctor <-> Patient)
  // =========================================================================
  async function openChatModal(appointment) {
    state.activeChatAppointment = appointment;
    chatModalTitle.textContent = `Consultation with ${appointment.doctor_name}`;
    chatModalSubtitle.textContent = `Booking Ref: ${appointment.booking_reference} • Patient: ${appointment.patient_name}`;

    chatApptSummary.innerHTML = `
      <div><strong>Date:</strong> ${appointment.appointment_date} at ${appointment.appointment_time?.slice(0, 5) || ''} | <strong>Status:</strong> <span class="status-pill status-${appointment.status}">${appointment.status}</span></div>
      <div><strong>Symptoms:</strong> ${escapeHTML(appointment.symptoms || 'General consultation')}</div>
    `;

    if (appointment.doctor_notes || appointment.prescription) {
      chatClinicalBox.innerHTML = `
        <div class="doctor-notes-box">
          <strong>🩺 Doctor's Instructions & Rx:</strong>
          ${appointment.doctor_notes ? `<div><strong>Advice:</strong> ${escapeHTML(appointment.doctor_notes)}</div>` : ''}
          ${appointment.prescription ? `<div style="color: #15803d;"><strong>Prescription:</strong> ${escapeHTML(appointment.prescription)}</div>` : ''}
        </div>
      `;
    } else {
      chatClinicalBox.innerHTML = '';
    }

    await loadMessages(appointment.id);
    chatModalOverlay.classList.add('active');
  }

  async function loadMessages(appointmentId) {
    chatMessagesContainer.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 1rem;">Loading conversation history...</div>`;

    try {
      const res = await fetch(`/api/appointments/${appointmentId}/messages`);
      const json = await res.json();

      if (json.success && Array.isArray(json.data)) {
        renderMessages(json.data);
      }
    } catch (e) {
      chatMessagesContainer.innerHTML = `<div style="text-align: center; color: var(--danger); padding: 1rem;">Failed to load messages.</div>`;
    }
  }

  function renderMessages(messages) {
    if (messages.length === 0) {
      chatMessagesContainer.innerHTML = `
        <div style="text-align: center; color: var(--text-muted); padding: 2rem;">
          💬 No messages yet. Send a message to start the consultation conversation!
        </div>
      `;
      return;
    }

    chatMessagesContainer.innerHTML = messages.map(msg => {
      const isDoctor = msg.sender_role === 'doctor';
      const timeStr = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      return `
        <div class="chat-bubble ${isDoctor ? 'doctor' : 'patient'}">
          <div class="chat-sender-info">
            <span>${isDoctor ? '🩺' : '👤'} ${escapeHTML(msg.sender_name)}</span>
            <span class="chat-timestamp">${timeStr}</span>
          </div>
          <div style="word-break: break-word;">${escapeHTML(msg.message)}</div>
        </div>
      `;
    }).join('');

    // Auto-scroll to bottom
    chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
  }

  // Send Reply
  chatReplyForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = chatReplyText.value.trim();
    if (!text || !state.activeChatAppointment) return;

    // Determine sender identity
    let senderRole = 'patient';
    let senderName = state.activeChatAppointment.patient_name;
    let senderId = null;

    if (state.currentUser) {
      senderRole = state.currentUser.role;
      senderName = state.currentUser.name;
      senderId = state.currentUser.id;
    }

    btnSendReply.disabled = true;

    try {
      const res = await fetch(`/api/appointments/${state.activeChatAppointment.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_id: senderId,
          sender_role: senderRole,
          sender_name: senderName,
          message: text
        })
      });

      const json = await res.json();
      if (res.ok && json.success) {
        chatReplyText.value = '';
        await loadMessages(state.activeChatAppointment.id);
        Toast.success('Reply posted!');
      } else {
        Toast.error(json.message || 'Failed to send reply.');
      }
    } catch (err) {
      Toast.error('Network error posting reply.');
    } finally {
      btnSendReply.disabled = false;
    }
  });

  btnCloseChat.addEventListener('click', () => {
    chatModalOverlay.classList.remove('active');
    state.activeChatAppointment = null;
  });

  // =========================================================================
  // Doctor Prescription & Clinical Notes Modal
  // =========================================================================
  function openPrescriptionModal(appointment) {
    rxApptId.value = appointment.id;
    rxStatus.value = appointment.status === 'Pending' ? 'Confirmed' : appointment.status;
    rxNotes.value = appointment.doctor_notes || '';
    rxPrescription.value = appointment.prescription || '';
    prescriptionModalOverlay.classList.add('active');
  }

  prescriptionForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = rxApptId.value;
    const payload = {
      status: rxStatus.value,
      doctor_notes: rxNotes.value.trim(),
      prescription: rxPrescription.value.trim()
    };

    try {
      const res = await fetch(`/api/appointments/${id}/notes`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();

      if (res.ok && json.success) {
        Toast.success('Clinical advice & prescription saved to database!');
        prescriptionModalOverlay.classList.remove('active');
        fetchDoctorAppointments();
      } else {
        Toast.error(json.message || 'Failed to save notes.');
      }
    } catch (e) {
      Toast.error('Network error saving prescription.');
    }
  });

  btnCloseRx.addEventListener('click', () => prescriptionModalOverlay.classList.remove('active'));
  btnCancelRx.addEventListener('click', () => prescriptionModalOverlay.classList.remove('active'));

  // =========================================================================
  // Filter & Event Listeners
  // =========================================================================
  function setupEventListeners() {
    let searchTimeout;
    doctorSearchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        state.searchQuery = e.target.value.trim();
        fetchDoctors();
      }, 300);
    });

    specialtyFilter.addEventListener('change', (e) => selectSpecialty(e.target.value));

    btnResetFilters.addEventListener('click', () => {
      doctorSearchInput.value = '';
      state.searchQuery = '';
      selectSpecialty('All');
    });

    btnRefreshDoctors.addEventListener('click', () => {
      fetchDoctors();
      checkDatabaseHealth();
      Toast.info('Doctors list refreshed.');
    });

    btnCloseBooking.addEventListener('click', closeBookingModal);
    btnCancelBookingModal.addEventListener('click', closeBookingModal);

    bookingDateInput.addEventListener('change', () => {
      if (state.selectedDoctor) {
        loadSlotsForDate(state.selectedDoctor.id, bookingDateInput.value);
      }
    });

    // Doctor dashboard status filter
    doctorStatusFilterElem.addEventListener('change', (e) => {
      state.doctorFilterStatus = e.target.value;
      fetchDoctorAppointments();
    });

    let docSearchTimeout;
    doctorSearchInputElem.addEventListener('input', (e) => {
      clearTimeout(docSearchTimeout);
      docSearchTimeout = setTimeout(() => {
        state.doctorSearchQuery = e.target.value.trim();
        fetchDoctorAppointments();
      }, 300);
    });

    btnRefreshDoctorDash.addEventListener('click', () => {
      fetchAdminStats();
      fetchDoctorAppointments();
      Toast.info('Doctor dashboard refreshed.');
    });

    // Close modals when clicking outside
    [authModalOverlay, bookingModalOverlay, successModalOverlay, chatModalOverlay, prescriptionModalOverlay].forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.classList.remove('active');
      });
    });
  }

  function escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  init();
});
