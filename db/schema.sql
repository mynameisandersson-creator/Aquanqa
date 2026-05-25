CREATE TABLE IF NOT EXISTS employees (
  id SERIAL PRIMARY KEY,
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
  captured_face_url TEXT,
  captured_video_url TEXT,
  comparison_score NUMERIC(5,2),
  biometric_match BOOLEAN,
  created_at TIMESTAMP DEFAULT NOW()
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
  re.captured_face_url,
  re.captured_video_url
FROM attendance_records ar
JOIN employees e ON e.id = ar.employee_id
LEFT JOIN recognition_evidence re ON re.attendance_id = ar.id;
