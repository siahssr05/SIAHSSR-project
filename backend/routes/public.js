const express = require("express");
const path = require("path");
const fs = require("fs");
const pool = require("../config/db");

const router = express.Router();

// Site settings (hero text, contact info, navbar logo) — read-only for everyone
router.get("/settings", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT setting_key, setting_value FROM site_settings");
    const settings = {};
    rows.forEach((r) => (settings[r.setting_key] = r.setting_value));
    res.json(settings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load site settings" });
  }
});

// About page objectives
router.get("/objectives", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM objectives ORDER BY sort_order, id");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load objectives" });
  }
});

// About page content (core values / objectives / mission)
router.get("/about-items", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM about_items ORDER BY section, sort_order, id");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load about page content" });
  }
});

// Public institute documents — list
router.get("/documents", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, title, category, original_filename, uploaded_at FROM documents ORDER BY uploaded_at DESC"
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load documents" });
  }
});

// Public institute documents — download
router.get("/documents/:id/download", async (req, res) => {
  try {
    const [[doc]] = await pool.query("SELECT * FROM documents WHERE id = ?", [req.params.id]);
    if (!doc) return res.status(404).json({ error: "Document not found" });
    const absPath = path.join(__dirname, "..", doc.file_path.replace(/^\/+/, ""));
    if (!fs.existsSync(absPath)) return res.status(404).json({ error: "File not found on server" });
    res.download(absPath, doc.original_filename);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to download document" });
  }
});

// Home page announcements
router.get("/announcements", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM announcements ORDER BY created_at DESC LIMIT 5");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load announcements" });
  }
});

// Live homepage stats
router.get("/stats", async (req, res) => {
  try {
    const [[{ total_published }]] = await pool.query(
      "SELECT COUNT(*) AS total_published FROM papers WHERE status='published'"
    );
    const [[{ total_journals }]] = await pool.query("SELECT COUNT(*) AS total_journals FROM journals");
    const [[{ total_reviewers }]] = await pool.query(
      "SELECT COUNT(*) AS total_reviewers FROM users WHERE role='reviewer'"
    );
    const [latestPapers] = await pool.query(
      `SELECT p.id, p.title, p.published_at, u.name AS author_name, j.short_name
       FROM papers p JOIN users u ON p.author_id = u.id JOIN journals j ON p.journal_id = j.id
       WHERE p.status = 'published' ORDER BY p.published_at DESC LIMIT 4`
    );
    res.json({ total_published, total_journals, total_reviewers, latestPapers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load homepage stats" });
  }
});

module.exports = router;
