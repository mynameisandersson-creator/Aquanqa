CREATE TABLE IF NOT EXISTS app_users (
  id BIGSERIAL PRIMARY KEY,
  username VARCHAR(60) UNIQUE NOT NULL,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(140) UNIQUE,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'employee')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employees (
  id SERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES app_users(id),
  employee_code VARCHAR(30) UNIQUE NOT NULL,
  full_name VARCHAR(120) NOT NULL,
  area VARCHAR(40) NOT NULL,
  id_photo_url TEXT NOT NULL,
  face_template_hash TEXT,
  fingerprint_template_hash TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS attendance_records (
  id BIGSERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id),
  check_type VARCHAR(20) NOT NULL DEFAULT 'entry',
  punctuality_status VARCHAR(20) NOT NULL,
  confidence NUMERIC(5,2) NOT NULL,
  method VARCHAR(20) NOT NULL,
  scan_time TIMESTAMP NOT NULL DEFAULT NOW(),
  terminal_name VARCHAR(50) DEFAULT 'AQUANQA-MOBILE-01'
);

CREATE TABLE IF NOT EXISTS recognition_evidence (
  id BIGSERIAL PRIMARY KEY,
  attendance_id BIGINT NOT NULL REFERENCES attendance_records(id),
  reference_id_photo_url TEXT,
  captured_face_url TEXT,
  captured_video_url TEXT,
  comparison_score NUMERIC(5,2),
  biometric_match BOOLEAN,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS biometric_enrollments (
  id BIGSERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id),
  enrollment_type VARCHAR(20) NOT NULL CHECK (enrollment_type IN ('face', 'fingerprint')),
  template_hash TEXT,
  source_photo_url TEXT,
  enrolled_by BIGINT REFERENCES app_users(id),
  enrolled_at TIMESTAMP NOT NULL DEFAULT NOW(),
  active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE VIEW IF NOT EXISTS attendance_report AS
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
