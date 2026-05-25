CREATE TABLE IF NOT EXISTS app_users (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(60) UNIQUE NOT NULL,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(140) UNIQUE,
  password_hash TEXT NOT NULL,
  role ENUM('admin', 'employee') NOT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS employees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT,
  employee_code VARCHAR(30) UNIQUE NOT NULL,
  full_name VARCHAR(120) NOT NULL,
  area VARCHAR(40) NOT NULL,
  id_photo_url TEXT NOT NULL,
  face_template_hash TEXT,
  fingerprint_template_hash TEXT,
  active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_employee_user FOREIGN KEY (user_id) REFERENCES app_users(id)
);

CREATE TABLE IF NOT EXISTS attendance_records (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  check_type VARCHAR(20) NOT NULL DEFAULT 'entry',
  punctuality_status VARCHAR(20) NOT NULL,
  confidence DECIMAL(5,2) NOT NULL,
  method VARCHAR(20) NOT NULL,
  scan_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  terminal_name VARCHAR(50) DEFAULT 'AQUANQA-MOBILE-01',
  CONSTRAINT fk_attendance_employee FOREIGN KEY (employee_id) REFERENCES employees(id)
);

CREATE TABLE IF NOT EXISTS recognition_evidence (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  attendance_id BIGINT NOT NULL,
  reference_id_photo_url TEXT,
  captured_face_url TEXT,
  captured_video_url TEXT,
  comparison_score DECIMAL(5,2),
  biometric_match TINYINT(1),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_evidence_attendance FOREIGN KEY (attendance_id) REFERENCES attendance_records(id)
);

CREATE TABLE IF NOT EXISTS biometric_enrollments (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  enrollment_type ENUM('face', 'fingerprint') NOT NULL,
  template_hash TEXT,
  source_photo_url TEXT,
  enrolled_by BIGINT,
  enrolled_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  active TINYINT(1) NOT NULL DEFAULT 1,
  CONSTRAINT fk_enroll_employee FOREIGN KEY (employee_id) REFERENCES employees(id),
  CONSTRAINT fk_enroll_user FOREIGN KEY (enrolled_by) REFERENCES app_users(id)
);

CREATE OR REPLACE VIEW attendance_report AS
SELECT
  ar.id,
  ar.scan_time,
  e.employee_code,
  e.full_name,
  e.area,
  ar.punctuality_status,
  ar.method,
  ar.confidence,
  re.reference_id_photo_url,
  re.captured_face_url,
  re.captured_video_url,
  re.biometric_match
FROM attendance_records ar
JOIN employees e ON e.id = ar.employee_id
LEFT JOIN recognition_evidence re ON re.attendance_id = ar.id;
