const mysql = require("mysql2/promise");
require("dotenv").config();

// Works fine with an empty DB_PASSWORD for local dev.
// For production, set a real password in .env and never commit it.
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "siahssr_db",
  charset: "utf8mb4",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

pool
  .getConnection()
  .then((conn) => {
    console.log("MySQL connected");
    conn.release();
  })
  .catch((err) => {
    console.error("MySQL connection failed:", err.message);
  });

module.exports = pool;
