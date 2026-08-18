-- Run this anytime to create the admin account, or reset it back to the
-- default credentials if the password was changed and forgotten.
-- Safe to re-run — it updates the existing row instead of duplicating it.
--
-- Default login after running this:
--   Email:    siahssr05@gmail.com
--   Password: siahssr05
--
-- To use a different password instead, generate a new hash first:
--   node -e "require('bcryptjs').hash('yourNewPassword', 10).then(console.log)"
-- and paste it in place of the hash below.

USE siahssr_db;

INSERT INTO users (name, email, password, role, is_verified)
VALUES ('Admin', 'siahssr05@gmail.com', '$2a$10$ZiRdj6nFyCP/lbF7iNKqCeTU3B1TbOlcPBshO1XD2831w4HumTOoa', 'admin', 1)
ON DUPLICATE KEY UPDATE password = VALUES(password), role = 'admin', is_verified = 1;
