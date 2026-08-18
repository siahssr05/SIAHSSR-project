import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import client from "../../api/client";
import StatusBadge from "../../components/StatusBadge";

export default function AuthorDashboard() {
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client.get("/papers/mine").then(({ data }) => setPapers(data)).finally(() => setLoading(false));
  }, []);

  return (
    <div className="container py-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="brand-font mb-0">My Submissions</h1>
        <Link to="/submit-paper" className="btn btn-navy">Submit New Paper</Link>
      </div>

      {loading && <p>Loading…</p>}
      {!loading && papers.length === 0 && <p className="text-muted">You haven't submitted any papers yet.</p>}

      <div className="table-responsive">
        <table className="table align-middle">
          <thead>
            <tr>
              <th>Title</th>
              <th>Journal</th>
              <th>Status</th>
              <th>Submitted</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {papers.map((p) => (
              <tr key={p.id}>
                <td className="fw-semibold">{p.title}</td>
                <td>{p.short_name}</td>
                <td><StatusBadge status={p.status} /></td>
                <td className="small text-muted">{new Date(p.submitted_at).toLocaleDateString()}</td>
                <td>
                  {p.receipt_path && (
                    <a href={`${client.defaults.baseURL}/papers/${p.id}/receipt`} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-navy">
                      Receipt
                    </a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
