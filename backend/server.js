require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");
const fs = require("fs");

const authRoutes = require("./routes/auth");
const papersRoutes = require("./routes/papers");
const journalsRoutes = require("./routes/journals");
const boardRoutes = require("./routes/board");
const faqRoutes = require("./routes/faq");
const adminRoutes = require("./routes/admin");
const publicRoutes = require("./routes/public");

const app = express();

// Ensure upload folders exist even on a fresh clone
["papers", "board", "logos", "receipts"].forEach((sub) => {
  const dir = path.join(__dirname, "uploads", sub);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// Static file serving for uploaded logos/photos/papers/receipts
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/papers", papersRoutes);
app.use("/api/journals", journalsRoutes);
app.use("/api/board", boardRoutes);
app.use("/api/faq", faqRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/public", publicRoutes);

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// 400/413 friendly error handler (covers multer file-size/type errors too)
app.use((err, req, res, next) => {
  console.error(err);
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ error: "File is too large" });
  }
  if (err.message && err.message.includes("Only")) {
    return res.status(400).json({ error: err.message });
  }
  res.status(500).json({ error: "Something went wrong on our end" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`SIAHSSR backend running on port ${PORT}`));
