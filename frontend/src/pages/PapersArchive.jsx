import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import client from "../api/client";

export default function PapersArchive() {
  const [papers, setPapers] = useState([]);
  const [journals, setJournals] = useState([]);
  const [search, setSearch] = useState("");
  const [journalId, setJournalId] = useState("");

  useEffect(() => {
    client.get("/journals").then(({ data }) => setJournals(data)).catch(() => {});
  }, []);

  useEffect(() => {
    const params = {};
    if (search) params.search = search;
    if (journalId) params.journal_id = journalId;
    client.get("/papers", { params }).then(({ data }) => setPapers(data)).catch(() => {});
  }, [search, journalId]);

  return (
    <div className="container py-5">
      <h1 className="brand-font mb-4">Papers Archive</h1>

      <div className="row g-3 mb-4">
        <div className="col-md-8">
          <input
            className="form-control"
            placeholder="Search by title or keyword…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="col-md-4">
          <select className="form-select" value={journalId} onChange={(e) => setJournalId(e.target.value)}>
            <option value="">All Journals</option>
            {journals.map((j) => (
              <option key={j.id} value={j.id}>{j.short_name}</option>
            ))}
          </select>
        </div>
      </div>

      {papers.length === 0 && <p className="text-muted">No published papers found.</p>}

      <div className="row g-4">
        {papers.map((p) => (
          <div className="col-md-6" key={p.id}>
            <div className="card-siahssr p-3 h-100">
              <span className="badge bg-navy mb-2 align-self-start">{p.short_name}</span>
              <h6 className="fw-bold">
                <Link className="text-decoration-none text-dark" to={`/papers/${p.id}`}>{p.title}</Link>
              </h6>
              <p className="small text-muted mb-1">{p.author_name}</p>
              <p className="small mb-0">{p.abstract?.slice(0, 140)}…</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
