const express = require("express");
const pool = require("../config/db");
const { requireAuth, requireRole } = require("../middleware/auth");
const { uploadLogo, uploadDocument } = require("../utils/upload");

const router = express.Router();

// All routes below require an authenticated admin
router.use(requireAuth, requireRole("admin"));

// ---------- DASHBOARD STATS ----------
router.get("/stats", async (req, res) => {
  try {
    const [[{ total_papers }]] = await pool.query("SELECT COUNT(*) AS total_papers FROM papers");
    const [[{ total_published }]] = await pool.query(
      "SELECT COUNT(*) AS total_published FROM papers WHERE status='published'"
    );
    const [[{ total_users }]] = await pool.query("SELECT COUNT(*) AS total_users FROM users");
    const [statusBreakdown] = await pool.query("SELECT status, COUNT(*) AS count FROM papers GROUP BY status");
    const [byJournal] = await pool.query(
      `SELECT j.name, COUNT(p.id) AS paper_count FROM journals j LEFT JOIN papers p ON j.id = p.journal_id GROUP BY j.id`
    );
    res.json({ total_papers, total_published, total_users, statusBreakdown, byJournal });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load stats" });
  }
});

// ---------- USERS ----------
router.get("/users", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, name, email, role, affiliation, is_verified, created_at FROM users ORDER BY created_at DESC"
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load users" });
  }
});

router.patch("/users/:id/role", async (req, res) => {
  try {
    const { role } = req.body;
    if (!["author", "reviewer", "admin"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }
    await pool.query("UPDATE users SET role = ? WHERE id = ?", [role, req.params.id]);
    res.json({ message: "Role updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update role" });
  }
});

router.patch("/users/:id/verify", async (req, res) => {
  try {
    const { is_verified } = req.body;
    await pool.query("UPDATE users SET is_verified = ? WHERE id = ?", [is_verified ? 1 : 0, req.params.id]);
    res.json({ message: "Verification status updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update verification status" });
  }
});

router.delete("/users/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM users WHERE id = ?", [req.params.id]);
    res.json({ message: "User deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

// ---------- ALL PAPERS (admin view, any status) ----------
router.get("/papers", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.*, u.name AS author_name, j.name AS journal_name
       FROM papers p JOIN users u ON p.author_id = u.id JOIN journals j ON p.journal_id = j.id
       ORDER BY p.submitted_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load papers" });
  }
});

router.patch("/papers/:id/assign-reviewer", async (req, res) => {
  try {
    const { reviewer_id } = req.body;
    await pool.query("UPDATE papers SET reviewer_id = ?, status='under_review' WHERE id = ?", [
      reviewer_id,
      req.params.id,
    ]);
    res.json({ message: "Reviewer assigned" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to assign reviewer" });
  }
});

router.patch("/papers/:id/publish", async (req, res) => {
  try {
    const { volume, issue, doi } = req.body;
    await pool.query(
      "UPDATE papers SET status='published', published_at=NOW(), volume=?, issue=?, doi=? WHERE id=?",
      [volume || null, issue || null, doi || null, req.params.id]
    );
    res.json({ message: "Paper published" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to publish paper" });
  }
});

router.delete("/papers/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM papers WHERE id = ?", [req.params.id]);
    res.json({ message: "Paper deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete paper" });
  }
});

// ---------- SITE SETTINGS (home hero text, contact info, etc.) ----------
router.get("/settings", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM site_settings");
    const settings = {};
    rows.forEach((r) => (settings[r.setting_key] = r.setting_value));
    res.json(settings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load settings" });
  }
});

router.put("/settings", async (req, res) => {
  try {
    const entries = Object.entries(req.body); // { hero_title: "...", contact_phone_1: "...", ... }
    for (const [key, value] of entries) {
      await pool.query(
        `INSERT INTO site_settings (setting_key, setting_value, updated_by) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE setting_value = ?, updated_by = ?`,
        [key, value, req.user.id, value, req.user.id]
      );
    }
    res.json({ message: "Settings updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update settings" });
  }
});

// ---------- SITE LOGO (navbar logo) ----------
router.post("/settings/logo", uploadLogo.single("logo"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No logo file received" });
    const relativePath = `/uploads/logos/${req.file.filename}`;
    await pool.query(
      `INSERT INTO site_settings (setting_key, setting_value, updated_by) VALUES ('site_logo', ?, ?)
       ON DUPLICATE KEY UPDATE setting_value = ?, updated_by = ?`,
      [relativePath, req.user.id, relativePath, req.user.id]
    );
    res.json({ message: "Site logo updated", logo_path: relativePath });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to upload site logo" });
  }
});

// ---------- ABOUT PAGE CONTENT (core values / objectives / mission) ----------
router.get("/about-items", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM about_items ORDER BY section, sort_order, id");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load about page content" });
  }
});

router.post("/about-items", async (req, res) => {
  try {
    const { section, text, sort_order } = req.body;
    if (!["core_value", "objective", "mission"].includes(section)) {
      return res.status(400).json({ error: "Invalid section" });
    }
    if (!text) return res.status(400).json({ error: "Text is required" });
    const [result] = await pool.query(
      "INSERT INTO about_items (section, text, sort_order) VALUES (?, ?, ?)",
      [section, text, sort_order || 0]
    );
    res.status(201).json({ message: "Added", id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add item" });
  }
});

router.put("/about-items/:id", async (req, res) => {
  try {
    const { text, sort_order } = req.body;
    await pool.query("UPDATE about_items SET text=?, sort_order=? WHERE id=?", [
      text,
      sort_order || 0,
      req.params.id,
    ]);
    res.json({ message: "Updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update item" });
  }
});

router.delete("/about-items/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM about_items WHERE id = ?", [req.params.id]);
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete item" });
  }
});

// ---------- INSTITUTE DOCUMENTS (upload/list/delete — stored files tracked in the DB) ----------
router.get("/documents", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM documents ORDER BY uploaded_at DESC");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load documents" });
  }
});

router.post("/documents", uploadDocument.single("file"), async (req, res) => {
  try {
    const { title, category } = req.body;
    if (!title || !req.file) return res.status(400).json({ error: "Title and file are required" });
    const relativePath = `/uploads/documents/${req.file.filename}`;
    const [result] = await pool.query(
      "INSERT INTO documents (title, category, file_path, original_filename, uploaded_by) VALUES (?, ?, ?, ?, ?)",
      [title, category || "general", relativePath, req.file.originalname, req.user.id]
    );
    res.status(201).json({ message: "Document uploaded", id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to upload document" });
  }
});

router.delete("/documents/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM documents WHERE id = ?", [req.params.id]);
    res.json({ message: "Document deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete document" });
  }
});

// ---------- ANNOUNCEMENTS (Home page) ----------
router.get("/announcements", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM announcements ORDER BY created_at DESC");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load announcements" });
  }
});

router.post("/announcements", async (req, res) => {
  try {
    const { title, content } = req.body;
    if (!title) return res.status(400).json({ error: "Title is required" });
    const [result] = await pool.query("INSERT INTO announcements (title, content) VALUES (?, ?)", [
      title,
      content || null,
    ]);
    res.status(201).json({ message: "Announcement added", id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add announcement" });
  }
});

router.delete("/announcements/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM announcements WHERE id = ?", [req.params.id]);
    res.json({ message: "Announcement deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete announcement" });
  }
});

module.exports = router;
