const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const rateLimit = require("express-rate-limit");
const pool = require("../config/db");
const { sendMail } = require("../utils/mailer");

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Too many login attempts. Please try again later." },
});

function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, name: user.name, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
  );
}

// ---------- REGISTER ----------
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role, affiliation } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email and password are required" });
    }

    const allowedRoles = ["author", "reviewer"];
    const finalRole = allowedRoles.includes(role) ? role : "author";

    const [existing] = await pool.query("SELECT id FROM users WHERE email = ?", [email]);
    if (existing.length > 0) {
      return res.status(409).json({ error: "An account with this email already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);

    await pool.query(
      `INSERT INTO users (name, email, password, role, affiliation)
       VALUES (?, ?, ?, ?, ?)`,
      [name, email, hashed, finalRole, affiliation || null]
    );

    res.status(201).json({
      message: "Account created successfully. You can log in now.",
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong, please try again" });
  }
});

// ---------- LOGIN ----------
router.post("/login", loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
    const user = rows[0];

    const invalidMsg = { error: "Invalid email or password" };
    if (!user) return res.status(401).json(invalidMsg);

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json(invalidMsg);

    const token = signToken(user);

    res
      .cookie("token", token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 24 * 60 * 60 * 1000,
      })
      .json({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          photo_path: user.photo_path,
        },
      });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong, please try again" });
  }
});

// ---------- LOGOUT ----------
router.post("/logout", (req, res) => {
  res.clearCookie("token").json({ message: "Logged out" });
});

// ---------- FORGOT PASSWORD ----------
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    const [rows] = await pool.query("SELECT id FROM users WHERE email = ?", [email]);

    if (rows.length > 0) {
      const resetToken = crypto.randomBytes(32).toString("hex");
      const expires = new Date(Date.now() + 60 * 60 * 1000);

      await pool.query(
        "UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?",
        [resetToken, expires, rows[0].id]
      );

      const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;

      await sendMail({
        to: email,
        subject: "Reset your password",
        text: `Reset your password using this link:\n${resetUrl}`,
        html: `<a href="${resetUrl}">${resetUrl}</a>`,
      });
    }

    res.json({ message: "If that email exists, a reset link has been sent." });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

// ---------- RESET PASSWORD ----------
router.post("/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: "Missing token or new password" });
    }

    const [rows] = await pool.query(
      "SELECT id FROM users WHERE reset_token = ? AND reset_token_expires > NOW()",
      [token]
    );

    if (rows.length === 0) {
      return res.status(400).json({ error: "Invalid or expired reset link" });
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    await pool.query(
      "UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?",
      [hashed, rows[0].id]
    );

    res.json({ message: "Password updated. You can now log in." });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

module.exports = router;