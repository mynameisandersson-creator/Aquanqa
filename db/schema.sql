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

CREATE TABLE IF NOT EXISTS photo_rules (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  rule_code VARCHAR(40) UNIQUE NOT NULL,
  rule_name VARCHAR(120) NOT NULL,
  min_face_area_pct DECIMAL(5,2) DEFAULT 18.00,
  min_brightness DECIMAL(5,2) DEFAULT 25.00,
  max_blur_score DECIMAL(8,2) DEFAULT 120.00,
  allow_accessories TINYINT(1) NOT NULL DEFAULT 0,
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
  id_photo_status ENUM('pending','approved','rejected') DEFAULT 'approved',
  face_template_hash TEXT,
  fingerprint_template_hash TEXT,
  active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_employee_user FOREIGN KEY (user_id) REFERENCES app_users(id)
);

CREATE TABLE IF NOT EXISTS biometric_enrollments (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  enrollment_type ENUM('face', 'fingerprint') NOT NULL,
  template_hash TEXT,
  source_photo_url TEXT,
  rule_id BIGINT,
  quality_score DECIMAL(5,2),
  enrolled_by BIGINT,
  enrolled_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  active TINYINT(1) NOT NULL DEFAULT 1,
  CONSTRAINT fk_enroll_employee FOREIGN KEY (employee_id) REFERENCES employees(id),
  CONSTRAINT fk_enroll_user FOREIGN KEY (enrolled_by) REFERENCES app_users(id),
  CONSTRAINT fk_enroll_rule FOREIGN KEY (rule_id) REFERENCES photo_rules(id)
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
  employee_id INT NOT NULL,
  rule_id BIGINT,
  reference_id_photo_url TEXT,
  captured_face_url TEXT,
  captured_video_url TEXT,
  comparison_score DECIMAL(5,2),
  biometric_match TINYINT(1),
  accessories_detected TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_evidence_attendance FOREIGN KEY (attendance_id) REFERENCES attendance_records(id),
  CONSTRAINT fk_evidence_employee FOREIGN KEY (employee_id) REFERENCES employees(id),
  CONSTRAINT fk_evidence_rule FOREIGN KEY (rule_id) REFERENCES photo_rules(id)
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
  re.comparison_score,
  re.biometric_match,
  re.accessories_detected
FROM attendance_records ar
JOIN employees e ON e.id = ar.employee_id
LEFT JOIN recognition_evidence re ON re.attendance_id = ar.id;

INSERT IGNORE INTO photo_rules (rule_code, rule_name, min_face_area_pct, min_brightness, max_blur_score, allow_accessories)
VALUES ('DEFAULT_NO_ACCESSORIES', 'Regla estándar sin accesorios', 18.00, 25.00, 120.00, 0);
