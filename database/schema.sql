-- ==============================================================================
-- MediCare Full-Stack System Database Schema
-- Includes Users (Doctor & Patient), Doctors, Appointments & Consultation Messages
-- ==============================================================================

CREATE DATABASE IF NOT EXISTS `doctor_appointment_db` 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE `doctor_appointment_db`;

-- ------------------------------------------------------------------------------
-- 1. Table structure for table `users` (Doctor and Patient authentication)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(120) NOT NULL UNIQUE,
    `password_hash` VARCHAR(255) NOT NULL,
    `role` ENUM('patient', 'doctor') NOT NULL DEFAULT 'patient',
    `phone` VARCHAR(30),
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------------------------
-- 2. Table structure for table `doctors`
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `doctors` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NULL,
    `name` VARCHAR(100) NOT NULL,
    `specialty` VARCHAR(100) NOT NULL,
    `qualification` VARCHAR(100) NOT NULL,
    `experience_years` INT NOT NULL,
    `consultation_fee` DECIMAL(10, 2) NOT NULL DEFAULT 50.00,
    `email` VARCHAR(120) NOT NULL UNIQUE,
    `phone` VARCHAR(20) NOT NULL,
    `available_days` VARCHAR(150) NOT NULL DEFAULT 'Monday,Tuesday,Wednesday,Thursday,Friday',
    `available_from` TIME NOT NULL DEFAULT '09:00:00',
    `available_to` TIME NOT NULL DEFAULT '17:00:00',
    `rating` DECIMAL(2, 1) DEFAULT 4.8,
    `bio` TEXT,
    `image_url` VARCHAR(255),
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_doctor_user` 
        FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) 
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------------------------
-- 3. Table structure for table `appointments`
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `appointments` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `booking_reference` VARCHAR(20) NOT NULL UNIQUE,
    `doctor_id` INT NOT NULL,
    `patient_id` INT NULL,
    `patient_name` VARCHAR(100) NOT NULL,
    `patient_email` VARCHAR(120) NOT NULL,
    `patient_phone` VARCHAR(20) NOT NULL,
    `patient_age` INT NOT NULL,
    `patient_gender` ENUM('Male', 'Female', 'Other') DEFAULT 'Male',
    `appointment_date` DATE NOT NULL,
    `appointment_time` TIME NOT NULL,
    `symptoms` TEXT,
    `status` ENUM('Pending', 'Confirmed', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Pending',
    `doctor_notes` TEXT NULL,
    `prescription` TEXT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_appointment_doctor` 
        FOREIGN KEY (`doctor_id`) REFERENCES `doctors` (`id`) 
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_appointment_patient` 
        FOREIGN KEY (`patient_id`) REFERENCES `users` (`id`) 
        ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX `idx_appt_date` (`appointment_date`),
    INDEX `idx_appt_status` (`status`),
    INDEX `idx_booking_ref` (`booking_reference`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------------------------
-- 4. Table structure for table `appointment_messages` (Doctor-Patient Replies)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `appointment_messages` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `appointment_id` INT NOT NULL,
    `sender_id` INT NULL,
    `sender_role` ENUM('doctor', 'patient') NOT NULL,
    `sender_name` VARCHAR(100) NOT NULL,
    `message` TEXT NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_msg_appointment` 
        FOREIGN KEY (`appointment_id`) REFERENCES `appointments` (`id`) 
        ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX `idx_msg_appt` (`appointment_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------------------------
-- 5. Seed default demo accounts
-- Password for all demo accounts: Password123!
-- (Pre-computed SHA-256 with salt: 9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08)
-- ------------------------------------------------------------------------------

-- Seed Doctor User 1 (Dr. Sarah Jenkins)
INSERT INTO `users` (`id`, `name`, `email`, `password_hash`, `role`, `phone`)
VALUES (1, 'Dr. Sarah Jenkins', 'sarah.jenkins@hospital.org', 'b109f3bbbc244eb82441917ed06d618b9008dd09b3befd1b5e07394c706a8bb980b1d7785e5976ec049b46df5f1326bb5b2de39c55f0189ec28f72db0a581ee6', 'doctor', '+1 (555) 234-5678')
ON DUPLICATE KEY UPDATE `email`=`email`;

-- Seed Doctor User 2 (Dr. Robert Chen)
INSERT INTO `users` (`id`, `name`, `email`, `password_hash`, `role`, `phone`)
VALUES (2, 'Dr. Robert Chen', 'robert.chen@hospital.org', 'b109f3bbbc244eb82441917ed06d618b9008dd09b3befd1b5e07394c706a8bb980b1d7785e5976ec049b46df5f1326bb5b2de39c55f0189ec28f72db0a581ee6', 'doctor', '+1 (555) 345-6789')
ON DUPLICATE KEY UPDATE `email`=`email`;

-- Seed Patient User 1 (Jane Doe)
INSERT INTO `users` (`id`, `name`, `email`, `password_hash`, `role`, `phone`)
VALUES (3, 'Jane Doe', 'patient@example.com', 'b109f3bbbc244eb82441917ed06d618b9008dd09b3befd1b5e07394c706a8bb980b1d7785e5976ec049b46df5f1326bb5b2de39c55f0189ec28f72db0a581ee6', 'patient', '+1 (555) 891-2345')
ON DUPLICATE KEY UPDATE `email`=`email`;

-- Seed Doctors linking to user accounts
INSERT INTO `doctors` (`id`, `user_id`, `name`, `specialty`, `qualification`, `experience_years`, `consultation_fee`, `email`, `phone`, `available_days`, `available_from`, `available_to`, `rating`, `bio`, `image_url`)
VALUES 
(1, 1, 'Dr. Sarah Jenkins', 'Cardiology', 'MD, FACC - Harvard Medical', 14, 120.00, 'sarah.jenkins@hospital.org', '+1 (555) 234-5678', 'Monday,Wednesday,Friday', '09:00:00', '16:00:00', 4.9, 'Senior Interventional Cardiologist specializing in preventive heart health and coronary artery management.', 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=400'),
(2, 2, 'Dr. Robert Chen', 'Neurology', 'MD, PhD - Johns Hopkins', 11, 135.00, 'robert.chen@hospital.org', '+1 (555) 345-6789', 'Tuesday,Thursday,Saturday', '10:00:00', '17:00:00', 4.8, 'Specialist in migraine management, neuromuscular disorders, and advanced diagnostic neurology.', 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=400'),
(3, NULL, 'Dr. Emily Martinez', 'Pediatrics', 'FAAP - Columbia University', 9, 85.00, 'emily.martinez@hospital.org', '+1 (555) 456-7890', 'Monday,Tuesday,Wednesday,Thursday,Friday', '08:30:00', '15:30:00', 4.9, 'Compassionate pediatrician dedicated to child wellness, vaccinations, and adolescent healthcare.', 'https://images.unsplash.com/photo-1594824813571-638f02638523?auto=format&fit=crop&q=80&w=400'),
(4, NULL, 'Dr. Marcus Vance', 'Orthopedics', 'MS (Ortho), Stanford Medical', 16, 110.00, 'marcus.vance@hospital.org', '+1 (555) 567-8901', 'Monday,Tuesday,Thursday', '09:00:00', '16:30:00', 4.7, 'Orthopedic and sports injury surgeon focusing on joint restoration and minimally invasive techniques.', 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=400'),
(5, NULL, 'Dr. Priya Sharma', 'Dermatology', 'MD, DNB (Derm) - AIIMS', 8, 90.00, 'priya.sharma@hospital.org', '+1 (555) 678-9012', 'Wednesday,Thursday,Friday,Saturday', '10:30:00', '18:00:00', 4.9, 'Clinical and aesthetic dermatologist addressing acne, eczema, hair loss, and modern laser skincare.', 'https://images.unsplash.com/photo-1559839734-66a392e3839d?auto=format&fit=crop&q=80&w=400'),
(6, NULL, 'Dr. David Miller', 'General Medicine', 'MD - Yale School of Medicine', 12, 75.00, 'david.miller@hospital.org', '+1 (555) 789-0123', 'Monday,Tuesday,Wednesday,Thursday,Friday', '08:00:00', '17:00:00', 4.8, 'Primary care physician handling chronic disease control, routine checkups, and diagnostic screenings.', 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=400')
ON DUPLICATE KEY UPDATE `email`=`email`;

-- Seed Sample Appointment
INSERT INTO `appointments` (`id`, `booking_reference`, `doctor_id`, `patient_id`, `patient_name`, `patient_email`, `patient_phone`, `patient_age`, `patient_gender`, `appointment_date`, `appointment_time`, `symptoms`, `status`, `doctor_notes`)
VALUES (1, 'DOC-20261125-9A4E', 1, 3, 'Jane Doe', 'patient@example.com', '+1 (555) 891-2345', 29, 'Female', '2026-11-26', '10:00:00', 'Mild heart palpitations after running and shortness of breath.', 'Confirmed', 'Patient advised to bring recent ECG if available and avoid caffeine 12 hours prior to visit.')
ON DUPLICATE KEY UPDATE `booking_reference`=`booking_reference`;

-- Seed Sample Messages / Consultation Thread between Doctor and Patient
INSERT INTO `appointment_messages` (`id`, `appointment_id`, `sender_id`, `sender_role`, `sender_name`, `message`)
VALUES 
(1, 1, 3, 'patient', 'Jane Doe', 'Hello Dr. Jenkins, I booked this appointment because of sudden palpitations. Should I fast before coming in?'),
(2, 1, 1, 'doctor', 'Dr. Sarah Jenkins', 'Hello Jane! Fasting is not required for the initial ECG, but please avoid energy drinks or coffee on the morning of your visit. See you on Thursday!')
ON DUPLICATE KEY UPDATE `id`=`id`;
