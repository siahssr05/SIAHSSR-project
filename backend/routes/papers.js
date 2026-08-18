const express = require("express");
const path = require("path");
const fs = require("fs");
const pool = require("../config/db");
const { requireAuth, requireRole } = require("../middleware/auth");
const { uploadPaper } = require("../utils/upload");
const { generateSubmissionReceipt } = require("../utils/pdfGenerator");

const router = express.Router();

// ---------- SUBMIT A PAPER (author) ----------
router.post(
  "/",
  requireAuth,
  requireRole("author"),
  uploadPaper.single("file"),
  async (req, res) => {
    try {
      const { title, abstract, keywords, journal_id } = req.body;
      if (!title || !abstract || !journal_id || !req.file) {
        return res.status(400).json({ error: "Title, abstract, journal and Word (.docx) file are required" });
      }

      const relativeFilePath = `/uploads/papers/${req.file.filename}`;

      const [result] = await pool.query(
        `INSERT INTO papers (title, abstract, keywords, author_id, journal_id, file_path, original_filename, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'submitted')`,
        [title, abstract, keywords || null, req.user.id, journal_id, relativeFilePath, req.file.originalname]
      );

      const paperId = result.insertId;

      // Build the submission receipt PDF (journal logo + name header, page numbers on every page)
      const [[journal]] = await pool.query("SELECT * FROM journals WHERE id = ?", [journal_id]);
      const [[paperRow]] = await pool.query("SELECT * FROM papers WHERE id = ?", [paperId]);

      const receiptDir = path.join(__dirname, "..", "uploads", "receipts");
      if (!fs.existsSync(receiptDir)) fs.mkdirSync(receiptDir, { recursive: true });
      const receiptFilename = `receipt-${paperId}.pdf`;
      const receiptAbsPath = path.join(receiptDir, receiptFilename);

      await generateSubmissionReceipt({
        paper: paperRow,
        author: { name: req.user.name, email: req.user.email, affiliation: req.body.affiliation || "" },
        journal,
        outputPath: receiptAbsPath,
      });

      const receiptRelPath = `/uploads/receipts/${receiptFilename}`;
      await pool.query("UPDATE papers SET receipt_path = ? WHERE id = ?", [receiptRelPath, paperId]);

      res.status(201).json({
        message: "Paper submitted successfully",
        paperId,
        receiptUrl: `/papers/${paperId}/receipt`,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message || "Failed to submit paper" });
    }
  }
);

// ---------- PUBLIC: PUBLISHED PAPERS ARCHIVE ----------
router.get("/", async (req, res) => {
  try {
    const { journal_id, search } = req.query;
    let sql = `
      SELECT p.id, p.title, p.abstract, p.keywords, p.volume, p.issue, p.doi, p.published_at,
             u.name AS author_name, j.name AS journal_name, j.short_name
      FROM papers p
      JOIN users u ON p.author_id = u.id
      JOIN journals j ON p.journal_id = j.id
      WHERE p.status = 'published'
    `;
    const params = [];
    if (journal_id) {
      sql += " AND j.id = ?";
      params.push(journal_id);
    }
    if (search) {
      sql += " AND (p.title LIKE ? OR p.keywords LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }
    sql += " ORDER BY p.published_at DESC";

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load papers" });
  }
});

// ---------- AUTHOR: MY SUBMISSIONS ----------
router.get("/mine", requireAuth, requireRole("author"), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.*, j.name AS journal_name, j.short_name
       FROM papers p JOIN journals j ON p.journal_id = j.id
       WHERE p.author_id = ? ORDER BY p.submitted_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load your submissions" });
  }
});

// ---------- REVIEWER: ASSIGNED PAPERS ----------
router.get("/assigned", requireAuth, requireRole("reviewer"), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.*, j.name AS journal_name
       FROM papers p JOIN journals j ON p.journal_id = j.id
       WHERE p.reviewer_id = ? ORDER BY p.submitted_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load assigned papers" });
  }
});

// ---------- GET SINGLE PAPER (public if published, else owner/reviewer/admin only) ----------
router.get("/:id", async (req, res) => {
  try {
    const [[paper]] = await pool.query(
      `SELECT p.*, u.name AS author_name, u.email AS author_email, j.name AS journal_name, j.short_name
       FROM papers p JOIN users u ON p.author_id = u.id JOIN journals j ON p.journal_id = j.id
       WHERE p.id = ?`,
      [req.params.id]
    );
    if (!paper) return res.status(404).json({ error: "Paper not found" });
    if (paper.status !== "published") {
      return res.status(403).json({ error: "This paper is not yet public" });
    }
    res.json(paper);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load paper" });
  }
});

// ---------- DOWNLOAD PAPER FILE (access-controlled) ----------
router.get("/:id/download", requireAuth, async (req, res) => {
  try {
    const [[paper]] = await pool.query("SELECT * FROM papers WHERE id = ?", [req.params.id]);
    if (!paper) return res.status(404).json({ error: "Paper not found" });

    const isOwner = paper.author_id === req.user.id;
    const isReviewer = paper.reviewer_id === req.user.id;
    const isAdmin = req.user.role === "admin";
    const isPublic = paper.status === "published";

    if (!isPublic && !isOwner && !isReviewer && !isAdmin) {
      return res.status(403).json({ error: "You don't have access to this file" });
    }

    const absPath = path.join(__dirname, "..", paper.file_path.replace(/^\/+/, ""));
    if (!fs.existsSync(absPath)) return res.status(404).json({ error: "File not found on server" });

    res.download(absPath, paper.original_filename || "paper.docx");
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to download file" });
  }
});

// ---------- DOWNLOAD SUBMISSION RECEIPT (owner/admin) ----------
router.get("/:id/receipt", requireAuth, async (req, res) => {
  try {
    const [[paper]] = await pool.query("SELECT * FROM papers WHERE id = ?", [req.params.id]);
    if (!paper) return res.status(404).json({ error: "Paper not found" });

    const isOwner = paper.author_id === req.user.id;
    if (!isOwner && req.user.role !== "admin") {
      return res.status(403).json({ error: "You don't have access to this receipt" });
    }
    if (!paper.receipt_path) return res.status(404).json({ error: "Receipt not generated yet" });

    const absPath = path.join(__dirname, "..", paper.receipt_path.replace(/^\/+/, ""));
    if (!fs.existsSync(absPath)) return res.status(404).json({ error: "Receipt file not found" });

    res.download(absPath, `submission-receipt-${paper.id}.pdf`);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to download receipt" });
  }
});

// ---------- REVIEWER/ADMIN: UPDATE STATUS + COMMENTS ----------
router.patch("/:id/review", requireAuth, requireRole("reviewer", "admin"), async (req, res) => {
  try {
    const { status, review_comments } = req.body;
    const allowed = ["under_review", "accepted", "rejected"];
    if (!allowed.includes(status)) return res.status(400).json({ error: "Invalid status" });

    await pool.query("UPDATE papers SET status = ?, review_comments = ? WHERE id = ?", [
      status,
      review_comments || null,
      req.params.id,
    ]);
    res.json({ message: "Review updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update review" });
  }
});

module.exports = router;
