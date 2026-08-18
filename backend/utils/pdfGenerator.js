const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

/**
 * Generates a formatted "submission receipt" PDF for a paper.
 * Every page gets: journal logo + journal name at the top,
 * and "Page X of Y" + journal name at the bottom.
 * The submission content (title, authors, abstract, keywords, dates) is the body.
 *
 * @param {object} paper   - { title, abstract, keywords, submitted_at, volume, issue }
 * @param {object} author  - { name, email, affiliation }
 * @param {object} journal - { name, short_name, logo_path }
 * @param {string} outputPath - absolute path to write the PDF to
 */
function generateSubmissionReceipt({ paper, author, journal, outputPath }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 70, bufferPages: true });
    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    const journalName = journal?.name || "SIAHSSR Journal";
    const journalShort = journal?.short_name || "";
    const logoAbsPath = journal?.logo_path
      ? path.join(__dirname, "..", journal.logo_path.replace(/^\/+/, ""))
      : null;

    const HEADER_HEIGHT = 75;

    // Writing text this close to the page edge would normally make pdfkit think
    // the text doesn't fit and silently insert a *new* blank page to hold it.
    // Temporarily zeroing the margins while we draw the header/footer stops that.
    function withNoMargins(fn) {
      const saved = { top: doc.page.margins.top, bottom: doc.page.margins.bottom };
      doc.page.margins.top = 0;
      doc.page.margins.bottom = 0;
      fn();
      doc.page.margins.top = saved.top;
      doc.page.margins.bottom = saved.bottom;
    }

    function drawHeader() {
      withNoMargins(() => {
        const top = 18;
        if (logoAbsPath && fs.existsSync(logoAbsPath)) {
          try {
            doc.image(logoAbsPath, 70, top, { height: 34 });
          } catch (e) {
            /* ignore bad image, fall through to text-only header */
          }
        }
        doc
          .fillColor("#0B2545")
          .font("Helvetica-Bold")
          .fontSize(12)
          .text(journalName, 120, top, { width: 405, height: 32, ellipsis: true });
        if (journalShort) {
          doc
            .fillColor("#8A6D3B")
            .font("Helvetica")
            .fontSize(9)
            .text(journalShort, 120, top + 34, { width: 405, lineBreak: false });
        }
        doc
          .moveTo(70, HEADER_HEIGHT - 8)
          .lineTo(525, HEADER_HEIGHT - 8)
          .strokeColor("#0B2545")
          .lineWidth(1)
          .stroke();
        doc.fillColor("black").font("Helvetica").fontSize(11);
      });
    }

    function drawFooter(pageNumber, pageCount) {
      withNoMargins(() => {
        const bottom = doc.page.height - 45;
        doc
          .moveTo(70, bottom)
          .lineTo(525, bottom)
          .strokeColor("#cccccc")
          .lineWidth(0.5)
          .stroke();
        doc
          .fillColor("#555555")
          .font("Helvetica")
          .fontSize(9)
          .text(journalShort || journalName, 70, bottom + 8, { width: 300, lineBreak: false })
          .text(`Page ${pageNumber} of ${pageCount}`, 350, bottom + 8, {
            align: "right",
            width: 175,
            lineBreak: false,
          });
        doc.fillColor("black").font("Helvetica").fontSize(11);
      });
    }

    // Reserve top margin space for header on every page
    doc.on("pageAdded", () => {
      doc.y = HEADER_HEIGHT + 20;
    });

    drawHeader();
    doc.y = HEADER_HEIGHT + 20;

    // ---- Body content ----
    doc.font("Helvetica-Bold").fontSize(16).text("Paper Submission Acknowledgement", { align: "center" });
    doc.moveDown(1.2);

    doc.font("Helvetica-Bold").fontSize(12).text("Title");
    doc.font("Helvetica").fontSize(11).text(paper.title);
    doc.moveDown(0.8);

    doc.font("Helvetica-Bold").fontSize(12).text("Author");
    doc
      .font("Helvetica")
      .fontSize(11)
      .text(`${author.name}${author.affiliation ? " — " + author.affiliation : ""}`);
    doc.text(author.email);
    doc.moveDown(0.8);

    doc.font("Helvetica-Bold").fontSize(12).text("Abstract");
    doc.font("Helvetica").fontSize(11).text(paper.abstract, { align: "justify" });
    doc.moveDown(0.8);

    if (paper.keywords) {
      doc.font("Helvetica-Bold").fontSize(12).text("Keywords");
      doc.font("Helvetica").fontSize(11).text(paper.keywords);
      doc.moveDown(0.8);
    }

    doc.font("Helvetica-Bold").fontSize(12).text("Submission Details");
    doc
      .font("Helvetica")
      .fontSize(11)
      .text(`Journal: ${journalName}`)
      .text(`Submitted on: ${new Date(paper.submitted_at || Date.now()).toLocaleString()}`)
      .text("Status: Submitted — pending review");
    doc.moveDown(1.2);

    doc
      .font("Helvetica-Oblique")
      .fontSize(9)
      .fillColor("#666666")
      .text(
        "This document confirms receipt of your submission. It is not a confirmation of acceptance for publication."
      );

    // ---- Apply header + numbered footer to every page ----
    const range = doc.bufferedPageRange();
    const pageCount = range.count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      if (i > 0) drawHeader(); // page 0 already has header drawn above
      drawFooter(i + 1, pageCount);
    }

    doc.end();
    stream.on("finish", () => resolve(outputPath));
    stream.on("error", reject);
  });
}

module.exports = { generateSubmissionReceipt };
