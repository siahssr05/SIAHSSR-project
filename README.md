# SIAHSSR — Sai Institute of Arts, Humanities and Social Science Research

A full-stack academic journal website: public site + author submission portal + reviewer
workflow + admin CMS, built for the IJDSSR and JMRH journals.

Tested end-to-end on this build: register → email verify → login → submit paper (Word .docx
upload) → auto-generated letterhead submission receipt (journal logo + name on every
page header, page numbers in the footer) → admin review → publish → live on the public
Papers Archive and homepage stats.

---

## Tech Stack

- **Frontend:** React 19 + Vite + React Router + Bootstrap 5
- **Backend:** Node.js + Express
- **Database:** MySQL (mysql2)
- **Auth:** JWT (httpOnly cookie + bearer token), bcrypt password hashing
- **File handling:** Multer (papers, board photos, logos), PDFKit (submission receipts)

---

## Setup

### 1. Database
```bash
mysql -u root -p < backend/database/schema.sql
```
This creates the `siahssr_db` database, all 8 tables, and seeds default journals +
site settings. Reference queries for every feature are in `backend/database/queries.sql`.

### 2. Backend
```bash
cd backend
cp .env.example .env       # edit DB_PASSWORD, JWT_SECRET before deploying
npm install
npm run dev                # http://localhost:5000
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev                # http://localhost:5173
```

### First admin account
A default admin account is created automatically the first time `schema.sql` runs:
```
Email:    siahssr05@gmail.com
Password: siahssr05
```
**Change this password before deploying anywhere public.** To set a different one,
generate a new hash and update the row:
```bash
node -e "require('bcryptjs').hash('yourNewPassword', 10).then(console.log)"
```
```sql
UPDATE users SET password = '<paste hash>' WHERE email = 'siahssr05@gmail.com';
```

If you ever lose access to the admin account, re-run `database/reset-admin.sql` —
it's safe to run anytime (updates the existing account instead of duplicating it)
and resets it back to the default credentials above.

Registration through the public site only creates `author`/`reviewer` accounts —
admin accounts are intentionally not self-service.

---

## What's included

- Public site: Home, About (objectives), Journals (with per-journal logo + CFP),
  Papers Archive (search/filter), single Paper view, Editorial Board, FAQ, Contact
- Author: register/verify/login, submit paper (Word .docx), view own submissions + statuses,
  download own submission receipt
- Reviewer: view assigned papers, submit review decision + comments
- Admin: manage users (roles/verification), manage papers (assign reviewer, publish,
  delete), manage journals (incl. logo upload), manage editorial board (incl. photo
  upload), manage FAQ, manage homepage announcements, edit site settings (hero text,
  contact info, **navbar logo**), edit About page objectives
- Every paper submission auto-generates a PDF receipt with the **journal logo + name
  header on every page** and a **"Page X of Y" + journal name footer on every page**
- Download endpoints for papers and receipts, access-controlled by role/ownership

## Security notes already handled

- Passwords hashed with bcrypt (never stored plain)
- Login never reveals whether an email exists (generic error)
- Rate limiting on the login endpoint
- JWT with expiry; httpOnly cookie option
- File-type and file-size validation on all uploads (.docx for papers, images for logos/photos)

---

## How this compares to industry-standard journal platforms

The closest real-world equivalent is **Open Journal Systems (OJS)**, the open-source
platform used by 20,000+ journals worldwide, and commercial platforms like Scholastica.

| Feature | OJS / Scholastica | This build |
|---|---|---|
| Submission workflow | Yes, highly configurable | Yes — title/abstract/keywords/Word doc |
| Peer review assignment | Yes, blind/double-blind options | Yes — reviewer assignment + status/comments |
| Role-based access (author/reviewer/editor) | Yes | Yes — author/reviewer/admin |
| DOI / Crossref integration | Automated, live registration | DOI field stored, manual entry (no live registry call) |
| Multi-journal hosting | Yes | Yes — IJDSSR + JMRH, extensible |
| Branded submission receipts with letterhead | Not a standard OJS feature | Yes — logo + name header, numbered footer on every page |
| Admin content management (logos, board, FAQ, home content) | Partial, theme-dependent | Yes — full CMS covered by this build |
| Indexing (Google Scholar, DOAJ, PubMed) | Yes, built-in | Not included — would need to be added for a production deployment |

For a final-year project or competition entry, this build covers the full core
workflow a real journal needs; the gap versus OJS is mainly in indexing integrations
and years of production hardening, not core functionality.
# siahssr
