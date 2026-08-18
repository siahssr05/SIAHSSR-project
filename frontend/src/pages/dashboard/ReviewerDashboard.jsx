import { useEffect, useState } from "react";
import client from "../../api/client";
import StatusBadge from "../../components/StatusBadge";

export default function ReviewerDashboard() {
  const [papers, setPapers] = useState([]);
  const [comments, setComments] = useState({});

  useEffect(() => {
    client.get("/papers/assigned").then(({ data }) => setPapers(data)).catch(() => {});
  }, []);

  async function updateStatus(id, status) {
    await client.patch(`/papers/${id}/review`, { status, review_comments: comments[id] || "" });
    setPapers((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));
  }

  return (
    <div className="container py-5">
      <h1 className="brand-font mb-4">Papers Assigned to Me</h1>
      {papers.length === 0 && <p className="text-muted">No papers assigned yet.</p>}
      {papers.map((p) => (
        <div className="card-siahssr p-4 mb-3" key={p.id}>
          <div className="d-flex justify-content-between">
            <h5 className="fw-bold">{p.title}</h5>
            <StatusBadge status={p.status} />
          </div>
          <p className="small text-muted">{p.journal_name}</p>
          <p style={{ textAlign: "justify" }}>{p.abstract}</p>
          <a href={`${client.defaults.baseURL}/papers/${p.id}/download`} className="btn btn-sm btn-outline-navy mb-3" target="_blank" rel="noreferrer">
            Download Paper (.docx)
          </a>
          <textarea
            className="form-control mb-2"
            placeholder="Review comments…"
            defaultValue={p.review_comments || ""}
            onChange={(e) => setComments({ ...comments, [p.id]: e.target.value })}
          />
          <div className="d-flex gap-2">
            <button className="btn btn-sm btn-navy" onClick={() => updateStatus(p.id, "accepted")}>Accept</button>
            <button className="btn btn-sm btn-outline-navy" onClick={() => updateStatus(p.id, "under_review")}>Mark Under Review</button>
            <button className="btn btn-sm btn-outline-danger" onClick={() => updateStatus(p.id, "rejected")}>Reject</button>
          </div>
        </div>
      ))}
    </div>
  );
}
