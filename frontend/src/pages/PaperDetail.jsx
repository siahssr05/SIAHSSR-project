import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import client from "../api/client";
import { useAuth } from "../api/AuthContext";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function PaperDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [paper, setPaper] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    client
      .get(`/papers/${id}`)
      .then(({ data }) => setPaper(data))
      .catch((err) => setError(err.response?.data?.error || "Failed to load paper"));
  }, [id]);

  if (error) return <div className="container py-5 text-danger">{error}</div>;
  if (!paper) return <div className="container py-5">Loading…</div>;

  // Download relies on the httpOnly auth cookie set at login (sent automatically by the browser)
  const downloadUrl = `${API_BASE}/api/papers/${id}/download`;

  return (
    <div className="container py-5" style={{ maxWidth: 780 }}>
      {/* Letterhead-style header: journal name at top of the paper view */}
      <div className="border-bottom border-3 pb-3 mb-4" style={{ borderColor: "#C99B3D" }}>
        <span className="badge bg-navy mb-2">{paper.short_name}</span>
        <h4 className="brand-font mb-0">{paper.journal_name}</h4>
      </div>

      <h1 className="mb-3" style={{ fontSize: "1.6rem" }}>{paper.title}</h1>
      <p className="text-muted mb-3">
        {paper.author_name} · Vol. {paper.volume}, Issue {paper.issue}
        {paper.doi && <> · DOI: {paper.doi}</>}
      </p>

      <h6 className="fw-bold">Abstract</h6>
      <p style={{ textAlign: "justify" }}>{paper.abstract}</p>

      {paper.keywords && (
        <>
          <h6 className="fw-bold">Keywords</h6>
          <p>{paper.keywords}</p>
        </>
      )}

      <p className="small text-muted">Published: {paper.published_at ? new Date(paper.published_at).toLocaleDateString() : "—"}</p>

      {user ? (
        <a href={downloadUrl} className="btn btn-navy mt-2">
          <i className="bi bi-download me-1" /> Download Paper (.docx)
        </a>
      ) : (
        <p className="small text-muted">Log in to download the full PDF.</p>
      )}
    </div>
  );
}
