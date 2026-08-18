-- SIAHSSR Database Schema
-- Run this file first to create the database and all tables

CREATE DATABASE IF NOT EXISTS siahssr_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE siahssr_db;

-- ========== USERS ==========
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('author','reviewer','admin') NOT NULL DEFAULT 'author',
  affiliation VARCHAR(255) DEFAULT NULL,
  photo_path VARCHAR(255) DEFAULT NULL,
  is_verified TINYINT(1) NOT NULL DEFAULT 0,
  verification_token VARCHAR(255) DEFAULT NULL,
  reset_token VARCHAR(255) DEFAULT NULL,
  reset_token_expires DATETIME DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ========== JOURNALS ==========
CREATE TABLE IF NOT EXISTS journals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  short_name VARCHAR(50) NOT NULL,
  issn VARCHAR(20) DEFAULT NULL,
  description TEXT,
  logo_path VARCHAR(255) DEFAULT NULL,
  current_volume VARCHAR(20) DEFAULT NULL,
  current_issue VARCHAR(20) DEFAULT NULL,
  cfp_text TEXT,
  cfp_deadline DATE DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ========== PAPERS ==========
CREATE TABLE IF NOT EXISTS papers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  abstract TEXT NOT NULL,
  keywords VARCHAR(500) DEFAULT NULL,
  author_id INT NOT NULL,
  journal_id INT NOT NULL,
  volume VARCHAR(20) DEFAULT NULL,
  issue VARCHAR(20) DEFAULT NULL,
  status ENUM('submitted','under_review','accepted','rejected','published') NOT NULL DEFAULT 'submitted',
  file_path VARCHAR(255) DEFAULT NULL,
  original_filename VARCHAR(255) DEFAULT NULL,
  receipt_path VARCHAR(255) DEFAULT NULL,
  reviewer_id INT DEFAULT NULL,
  review_comments TEXT,
  doi VARCHAR(150) DEFAULT NULL,
  submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  published_at DATETIME DEFAULT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (journal_id) REFERENCES journals(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ========== EDITORIAL BOARD ==========
CREATE TABLE IF NOT EXISTS editorial_board (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  designation VARCHAR(255) DEFAULT NULL,
  affiliation VARCHAR(255) DEFAULT NULL,
  photo_path VARCHAR(255) DEFAULT NULL,
  bio TEXT,
  expertise VARCHAR(255) DEFAULT NULL,
  journal_id INT DEFAULT NULL,
  sort_order INT DEFAULT 0,
  FOREIGN KEY (journal_id) REFERENCES journals(id) ON DELETE SET NULL
);

-- ========== ABOUT PAGE CONTENT (core values / objectives / mission — all bulleted lists) ==========
CREATE TABLE IF NOT EXISTS about_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  section ENUM('core_value','objective','mission') NOT NULL,
  text TEXT NOT NULL,
  sort_order INT DEFAULT 0
);

-- ========== DOCUMENTS (institute brochures, policy docs, etc. — uploaded & stored via DB) ==========
CREATE TABLE IF NOT EXISTS documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(100) DEFAULT 'general',
  file_path VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  uploaded_by INT DEFAULT NULL,
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ========== FAQ ==========
CREATE TABLE IF NOT EXISTS faqs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  question VARCHAR(500) NOT NULL,
  answer TEXT NOT NULL,
  category VARCHAR(100) DEFAULT 'general',
  sort_order INT DEFAULT 0
);

-- ========== ANNOUNCEMENTS (Home page) ==========
CREATE TABLE IF NOT EXISTS announcements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ========== SITE SETTINGS (editable homepage/about/contact text) ==========
CREATE TABLE IF NOT EXISTS site_settings (
  setting_key VARCHAR(100) PRIMARY KEY,
  setting_value TEXT,
  updated_by INT DEFAULT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Default settings
INSERT INTO site_settings (setting_key, setting_value) VALUES
 ('site_logo', '/uploads/logos/site-logo.png'),
 ('hero_title', 'Sai Institute of Arts, Humanities and Social Science Research'),
 ('hero_subtitle', 'Research, Innovation and Social Transformation'),
 ('tagline', 'Research, Innovation and Social Transformation'),
 ('vision_text', 'To become a globally recognised centre of excellence in arts, humanities, and social science research by fostering innovation, academic excellence, ethical values, and sustainable societal development through interdisciplinary research, education, and collaboration.'),
 ('contact_phone_1', '+91 96902 82239'),
 ('contact_phone_2', '+91 63830 63291'),
 ('contact_email', 'siahssr05@gmail.com'),
 ('contact_website', 'https://siahssr.co.in/'),
 ('contact_address', 'No. 26/1, Thabalkaar Anumatha Gounder Street, Reddiyur Post, Jolarpettai')
ON DUPLICATE KEY UPDATE setting_key=setting_key;

-- Default About page content (from the institute's official Objectives / Mission / Vision document)
INSERT INTO about_items (section, text, sort_order) VALUES
 ('core_value', 'Academic Excellence', 1),
 ('core_value', 'Integrity and Ethics', 2),
 ('core_value', 'Innovation and Creativity', 3),
 ('core_value', 'Inclusiveness and Diversity', 4),
 ('core_value', 'Collaboration', 5),
 ('core_value', 'Professionalism', 6),
 ('core_value', 'Social Responsibility', 7),
 ('core_value', 'Sustainability', 8),
 ('core_value', 'Lifelong Learning', 9),
 ('core_value', 'Service to Humanity', 10),

 ('objective', 'To promote quality research, innovation, and academic excellence in the fields of Arts, Humanities, Social Sciences, and allied disciplines.', 1),
 ('objective', 'To collaborate with Central Government, State Government, Local Self-Government Institutions, Public Sector Organizations, Universities, Research Institutions, NGOs, and International Organizations for research, training, policy development, and community outreach.', 2),
 ('objective', 'To undertake government-funded research projects, surveys, impact assessments, socio-economic studies, policy evaluations, and consultancy assignments.', 3),
 ('objective', 'To organize international and national conferences, seminars, workshops, faculty development programmes, certificate courses, and training programmes.', 4),
 ('objective', 'To publish peer-reviewed journals, edited books, conference proceedings, policy papers, newsletters, and research reports.', 5),
 ('objective', 'To promote interdisciplinary and multidisciplinary research addressing national and global developmental challenges.', 6),
 ('objective', 'To provide research guidance, capacity-building programmes, internships, and skill-development initiatives for students, scholars, teachers, government officials, and professionals.', 7),
 ('objective', 'To establish academic partnerships and Memoranda of Understanding (MoUs) with universities, government departments, industries, and civil society organizations.', 8),
 ('objective', 'To promote evidence-based policymaking through research findings and recommendations for sustainable development.', 9),
 ('objective', 'To encourage innovation, entrepreneurship, digital transformation, and technology-enabled research for societal development.', 10),
 ('objective', 'To facilitate national and international research collaborations, exchange programmes, and knowledge-sharing initiatives.', 11),
 ('objective', 'To uphold the highest standards of academic integrity, ethical research practices, inclusiveness, gender equality, and social justice.', 12),
 ('objective', 'To contribute towards the achievement of the United Nations Sustainable Development Goals (SDGs) through impactful research, education, and community engagement.', 13),
 ('objective', 'To establish centres of excellence, research laboratories, knowledge resource centres, and digital repositories for advancing research and innovation.', 14),
 ('objective', 'To recognize and support outstanding researchers through fellowships, awards, memberships, and research grants.', 15),
 ('objective', 'To collaborate with Government Departments including the Ministries of the Government of India, Government of Tamil Nadu, Municipal Corporations, Panchayati Raj Institutions, District Administration, Public Health Departments, Educational Institutions, and other statutory bodies for research, policy formulation, monitoring and evaluation, capacity building, and implementation of developmental programmes.', 16),

 ('mission', 'To promote high-quality and ethical research in Arts, Humanities, and Social Sciences.', 1),
 ('mission', 'To encourage interdisciplinary and collaborative research addressing contemporary societal challenges.', 2),
 ('mission', 'To organise international conferences, seminars, workshops, faculty development programmes, and training programmes.', 3),
 ('mission', 'To publish peer-reviewed journals, edited books, conference proceedings, and research monographs.', 4),
 ('mission', 'To strengthen collaboration among researchers, universities, industries, government organisations, and policymakers.', 5),
 ('mission', 'To support young researchers through mentoring, skill development, and research guidance.', 6),
 ('mission', 'To promote innovation, inclusiveness, sustainability, and social responsibility in research and education.', 7),
 ('mission', 'To contribute to evidence-based policymaking and community development through impactful research.', 8)
ON DUPLICATE KEY UPDATE section=section;

-- Default documents (the institute's official Objectives/Mission/Vision document, stored and DB-tracked)
INSERT INTO documents (title, category, file_path, original_filename) VALUES
 ('Objectives, Mission & Vision', 'institute', '/uploads/documents/siahssr-objectives-mission-vision.pdf', 'Sai_Institute_of_Arts_Objectives_Mission_Vision.pdf')
ON DUPLICATE KEY UPDATE title=title;

-- Default admin account. Re-running this file always resets this account back
-- to these credentials, so it can't be accidentally locked out or lost.
-- Change the password after first login by generating a new hash:
--   node -e "require('bcryptjs').hash('yourNewPassword', 10).then(console.log)"
-- and updating this INSERT (or just UPDATE the users table directly).
INSERT INTO users (name, email, password, role, is_verified)
VALUES ('Admin', 'siahssr05@gmail.com', '$2a$10$ZiRdj6nFyCP/lbF7iNKqCeTU3B1TbOlcPBshO1XD2831w4HumTOoa', 'admin', 1)
ON DUPLICATE KEY UPDATE password = VALUES(password), role = 'admin', is_verified = 1;

-- Default journals
INSERT INTO journals (name, short_name, issn, description, current_volume, current_issue, cfp_text, cfp_deadline) VALUES
 ('International Journal of Development and Social Sciences Research', 'IJDSSR', NULL,
  'A peer-reviewed journal publishing original research across development studies and the social sciences.',
  '1', '1', 'Submissions open for the upcoming issue. We welcome original research, reviews, and case studies.', NULL),
 ('Journal of Multidisciplinary Research Horizon', 'JMRH', NULL,
  'A multidisciplinary journal covering arts, humanities, and social science research from a cross-disciplinary lens.',
  '1', '1 (Inaugural)', 'Call for Papers — Inaugural Issue. We invite submissions from researchers across all disciplines.', NULL)
ON DUPLICATE KEY UPDATE name=name;
