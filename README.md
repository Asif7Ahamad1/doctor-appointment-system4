# 🩺 MediCare - Full-Stack Doctor Appointment Booking System

A modern, full-stack Doctor Appointment Management Web Application built with **Node.js**, **Express.js**, **MySQL**, **Custom Middlewares**, **HTML5**, **CSS3**, and vanilla **JavaScript**.

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![Node.js](https://img.shields.io/badge/Node.js-v18%2B%20%7C%20v20%2B%20%7C%20v22%2B-green.svg)
![Express.js](https://img.shields.io/badge/Express.js-4.21.2-lightgrey.svg)
![MySQL](https://img.shields.io/badge/MySQL-5.7%2B%20%7C%208.0%2B-orange.svg)

---

## 🌟 Key Features

- **👨‍⚕️ Specialist Doctor Directory**:
  - Browse verified doctors across multiple specialties (Cardiology, Neurology, Pediatrics, Dermatology, Orthopedics, General Medicine, etc.).
  - Search by doctor name, specialty, or clinical qualifications with debounced real-time filtering.
  - View doctor experience, ratings, available days, and consultation fees.

- **📅 Interactive Real-Time Appointment Booking**:
  - Interactive calendar & dynamic 30-minute time-slot picker based on the doctor's working schedule.
  - **Slot Collision Prevention**: Automatic backend conflict checking prevents double bookings.
  - Generates a unique tracking reference code (`DOC-YYYYMMDD-XXXX`).

- **🔍 Appointment Tracker & Patient Portal**:
  - Look up appointments instantly using your **Booking Reference Code** or **Patient Email**.
  - Check status (`Pending`, `Confirmed`, `Completed`, `Cancelled`).
  - Self-service cancellation and printable appointment tickets.

- **⚙️ Clinic Administration & Doctor Dashboard**:
  - High-level metric counters: Total Doctors, Appointments, Pending, Confirmed, Completed.
  - Interactive management table: Confirm, Complete, or Cancel patient appointments in one click.
  - Ability to register new doctors dynamically.

- **🛡️ Custom Express Middlewares**:
  - **Request Logger**: Tracks method, URL, HTTP status code, duration (ms), and timestamp.
  - **Validation Middleware**: Sanitizes and validates dates, time slots, emails, ages, and phone numbers.
  - **Centralized Error & 404 Handler**: Clean JSON responses for API consumers.
  - **Resilient Database Layer**: Automatic reconnects and in-memory fallback for instant zero-config testing if MySQL is temporarily offline.

---

## 🏗️ Project Architecture

```
doctor-appointment-system/
├── config/
│   └── db.js                 # MySQL connection pool (mysql2/promise) & fallback engine
├── controllers/
│   ├── appointmentController.js # Booking, tracking, cancellations, and status updates
│   └── doctorController.js   # Doctor listing, slots calculation, specialty filters
├── database/
│   ├── schema.sql            # Relational database schema with initial doctor seeds
│   └── init-db.js            # Automated database and table creation script
├── middleware/
│   ├── errorHandler.js       # Centralized 404 & global error response handler
│   ├── logger.js             # Custom HTTP request logger middleware
│   └── validation.js         # Input sanitization and validation middleware
├── public/                   # Frontend client assets (served by Express)
│   ├── css/
│   │   └── styles.css        # Responsive healthcare UI theme
│   ├── js/
│   │   ├── app.js            # Frontend application logic & API integration
│   │   └── toast.js          # Lightweight alert toast notifications
│   └── index.html            # Single Page Application
├── routes/
│   ├── appointmentRoutes.js  # /api/appointments REST endpoints
│   ├── doctorRoutes.js       # /api/doctors REST endpoints
│   └── statRoutes.js         # /api/stats REST endpoints
├── .env.example              # Template for environment variables
├── .gitignore                # Git ignore rules for node_modules and .env
├── package.json              # Project dependencies & scripts
├── README.md                 # Project documentation
└── server.js                 # Express server entry point
```

---

## 🗄️ Database Schema (`schema.sql`)

The application uses two relational MySQL tables:

1. **`doctors`**: Stores doctor profile information, qualifications, consultation fees, and schedule intervals.
2. **`appointments`**: Stores patient bookings linked to `doctors.id` via foreign key with `ON DELETE CASCADE`.

To inspect or customize the database structure, view [`database/schema.sql`](database/schema.sql).

---

## 🚀 Getting Started Locally

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [MySQL Server](https://dev.mysql.com/downloads/) (or [XAMPP](https://www.apachefriends.org/) / Docker)

### 1. Clone or Open the Repository
```bash
git clone https://github.com/YOUR_USERNAME/doctor-appointment-system.git
cd doctor-appointment-system
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Environment Variables
Copy `.env.example` to create your local `.env` file:
```bash
cp .env.example .env
```

Configure your MySQL credentials in `.env`:
```env
PORT=5000
NODE_ENV=development

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=doctor_appointment_db
DB_PORT=3306
```

### 4. Initialize MySQL Database
Make sure your MySQL service is started (e.g. via XAMPP Control Panel or `mysql.server start`), then run:
```bash
npm run init-db
```
This automatically creates the `doctor_appointment_db` database, generates the tables, and seeds initial specialist doctors.

### 5. Start the Server
```bash
# Run in production mode:
npm start

# Or run with live file reloading (Node v18+):
npm run dev
```

Visit **`http://localhost:5000`** in your browser!

---

## 🌐 How to Host on GitHub & Deploy

Since this is a full-stack application (Node.js/Express backend + MySQL database + HTML/CSS/JS frontend):

### 1. Push Code to GitHub

1. Create a new repository on [GitHub](https://github.com/new) named `doctor-appointment-system`.
2. Push your project from your terminal:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: full-stack doctor appointment system"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/doctor-appointment-system.git
   git push -u origin main
   ```

### 2. Deploy Full-Stack App (Free Hosting Options)

Because GitHub Pages only hosts static files (HTML/CSS/JS without Node.js runtime or MySQL), deploy the full-stack app on one of these services:

#### Option A: Render (Recommended & Free)
1. Sign up at [render.com](https://render.com).
2. Connect a free **Render MySQL** database (or [Aiven MySQL](https://aiven.io/mysql) / [Railway](https://railway.app)).
3. Click **New +** -> **Web Service** -> Link your GitHub repository.
4. Set:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Add your environment variables in the Render Dashboard (`DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`).
6. Click **Deploy**!

#### Option B: Railway.app
1. Go to [railway.app](https://railway.app) and click **New Project**.
2. Select **Provision MySQL** (adds a cloud MySQL database in one click).
3. Add your GitHub repository as a service in the same project.
4. Link the database environment variables to your Express app service.

---

## 🔌 API Endpoints Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Server uptime & MySQL connection status |
| `GET` | `/api/doctors` | List doctors (supports `?specialty=` and `?search=`) |
| `GET` | `/api/doctors/meta/specialties` | List distinct medical specialties |
| `GET` | `/api/doctors/:id?date=YYYY-MM-DD` | Doctor details and available 30-min time slots |
| `POST` | `/api/doctors` | Register new doctor (Admin) |
| `POST` | `/api/appointments` | Book new appointment (validates slot availability) |
| `GET` | `/api/appointments` | List appointments (filter by doctor, date, status, search) |
| `GET` | `/api/appointments/lookup/:reference` | Search appointment by booking code or email |
| `PATCH`| `/api/appointments/:id/status` | Update status (`Confirmed`, `Completed`, `Cancelled`) |
| `DELETE`| `/api/appointments/:id` | Cancel appointment |
| `GET` | `/api/stats` | Summary statistics for Admin Dashboard |

---

## 📄 License
This project is open-source and available under the [MIT License](LICENSE).
