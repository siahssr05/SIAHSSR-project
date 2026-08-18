import { useEffect, useState } from "react";
import client from "../../api/client";
import StatusBadge from "../../components/StatusBadge";

const TABS = ["Stats", "Papers", "Journals", "Board", "FAQ", "Users", "Site Content"];

export default function AdminDashboard() {
  const [tab, setTab] = useState("Stats");

  return (
    <div className="container py-5">
      <h1 className="brand-font mb-4">Admin Dashboard</h1>
      <ul className="nav nav-pills mb-4 flex-wrap gap-2">
        {TABS.map((t) => (
          <li className="nav-item" key={t}>
            <button
              className={`nav-link ${tab === t ? "active bg-navy" : ""}`}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          </li>
        ))}
      </ul>

      {tab === "Stats" && <StatsPanel />}
      {tab === "Papers" && <PapersPanel />}
      {tab === "Journals" && <JournalsPanel />}
      {tab === "Board" && <BoardPanel />}
      {tab === "FAQ" && <FaqPanel />}
      {tab === "Users" && <UsersPanel />}
      {tab === "Site Content" && <SiteContentPanel />}
    </div>
  );
}

// ---------------- STATS ----------------
function StatsPanel() {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    client.get("/admin/stats").then(({ data }) => setStats(data)).catch(() => {});
  }, []);
  if (!stats) return <p>Loading…</p>;
  return (
    <div className="row g-4">
      <div className="col-md-4"><div className="card-siahssr p-4 text-center"><h2 className="brand-font">{stats.total_papers}</h2><p className="text-muted mb-0">Total Papers</p></div></div>
      <div className="col-md-4"><div className="card-siahssr p-4 text-center"><h2 className="brand-font">{stats.total_published}</h2><p className="text-muted mb-0">Published</p></div></div>
      <div className="col-md-4"><div className="card-siahssr p-4 text-center"><h2 className="brand-font">{stats.total_users}</h2><p className="text-muted mb-0">Total Users</p></div></div>
      <div className="col-md-6">
        <div className="card-siahssr p-4">
          <h6 className="fw-bold">By Status</h6>
          {stats.statusBreakdown.map((s) => (
            <div key={s.status} className="d-flex justify-content-between border-bottom py-1">
              <StatusBadge status={s.status} /><span>{s.count}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="col-md-6">
        <div className="card-siahssr p-4">
          <h6 className="fw-bold">By Journal</h6>
          {stats.byJournal.map((j) => (
            <div key={j.name} className="d-flex justify-content-between border-bottom py-1">
              <span>{j.name}</span><span>{j.paper_count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------- PAPERS ----------------
function PapersPanel() {
  const [papers, setPapers] = useState([]);
  const [reviewers, setReviewers] = useState([]);

  function load() {
    client.get("/admin/papers").then(({ data }) => setPapers(data)).catch(() => {});
    client.get("/admin/users").then(({ data }) => setReviewers(data.filter((u) => u.role === "reviewer"))).catch(() => {});
  }
  useEffect(load, []);

  async function assignReviewer(id, reviewer_id) {
    if (!reviewer_id) return;
    await client.patch(`/admin/papers/${id}/assign-reviewer`, { reviewer_id });
    load();
  }

  async function publish(id) {
    const volume = prompt("Volume number:") || "";
    const issue = prompt("Issue number:") || "";
    const doi = prompt("DOI (optional):") || "";
    await client.patch(`/admin/papers/${id}/publish`, { volume, issue, doi });
    load();
  }

  async function remove(id) {
    if (!confirm("Delete this paper permanently?")) return;
    await client.delete(`/admin/papers/${id}`);
    load();
  }

  return (
    <div className="table-responsive">
      <table className="table align-middle">
        <thead><tr><th>Title</th><th>Author</th><th>Journal</th><th>Status</th><th>Reviewer</th><th>Actions</th></tr></thead>
        <tbody>
          {papers.map((p) => (
            <tr key={p.id}>
              <td className="fw-semibold">{p.title}</td>
              <td>{p.author_name}</td>
              <td>{p.journal_name}</td>
              <td><StatusBadge status={p.status} /></td>
              <td>
                <select className="form-select form-select-sm" defaultValue="" onChange={(e) => assignReviewer(p.id, e.target.value)}>
                  <option value="">Assign…</option>
                  {reviewers.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </td>
              <td className="d-flex gap-1">
                <a className="btn btn-sm btn-outline-navy" href={`${client.defaults.baseURL}/papers/${p.id}/download`} target="_blank" rel="noreferrer">.docx</a>
                <button className="btn btn-sm btn-navy" onClick={() => publish(p.id)}>Publish</button>
                <button className="btn btn-sm btn-outline-danger" onClick={() => remove(p.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------- JOURNALS ----------------
const FALLBACK_LOGO = { IJDSSR: "/logo-ijdssr.svg", JMRH: "/logo-jmrh.svg" };

function JournalsPanel() {
  const [journals, setJournals] = useState([]);
  const [form, setForm] = useState({ name: "", short_name: "", description: "", cfp_text: "" });

  function load() {
    client.get("/journals").then(({ data }) => setJournals(data)).catch(() => {});
  }
  useEffect(load, []);

  async function createJournal(e) {
    e.preventDefault();
    await client.post("/journals", form);
    setForm({ name: "", short_name: "", description: "", cfp_text: "" });
    load();
  }

  async function uploadLogo(id, file) {
    const fd = new FormData();
    fd.append("logo", file);
    await client.post(`/journals/${id}/logo`, fd, { headers: { "Content-Type": "multipart/form-data" } });
    load();
  }

  return (
    <div>
      <div className="card-siahssr p-4 mb-4">
        <h6 className="fw-bold mb-3">Add Journal</h6>
        <form onSubmit={createJournal} className="row g-2">
          <div className="col-md-6"><input className="form-control" placeholder="Full name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="col-md-2"><input className="form-control" placeholder="Short name" required value={form.short_name} onChange={(e) => setForm({ ...form, short_name: e.target.value })} /></div>
          <div className="col-md-4"><input className="form-control" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="col-12"><button className="btn btn-navy">Add Journal</button></div>
        </form>
      </div>

      {journals.map((j) => (
        <div className="card-siahssr p-3 mb-3 d-flex flex-row align-items-center gap-3" key={j.id}>
          <img src={j.logo_path ? `${client.defaults.baseURL.replace("/api", "")}${j.logo_path}` : (FALLBACK_LOGO[j.short_name] || "/logo-site.svg")} height="40" alt="" />
          <div className="flex-grow-1">
            <div className="fw-bold">{j.name}</div>
            <div className="small text-muted">{j.short_name} · Vol {j.current_volume}, Issue {j.current_issue}</div>
          </div>
          <label className="btn btn-sm btn-outline-navy mb-0">
            Change Logo
            <input type="file" accept="image/*" hidden onChange={(e) => uploadLogo(j.id, e.target.files[0])} />
          </label>
        </div>
      ))}
    </div>
  );
}

// ---------------- EDITORIAL BOARD ----------------
function BoardPanel() {
  const [members, setMembers] = useState([]);
  const [form, setForm] = useState({ name: "", designation: "", affiliation: "", bio: "", expertise: "" });
  const [photo, setPhoto] = useState(null);

  function load() {
    client.get("/board").then(({ data }) => setMembers(data)).catch(() => {});
  }
  useEffect(load, []);

  async function addMember(e) {
    e.preventDefault();
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    if (photo) fd.append("photo", photo);
    await client.post("/board", fd, { headers: { "Content-Type": "multipart/form-data" } });
    setForm({ name: "", designation: "", affiliation: "", bio: "", expertise: "" });
    setPhoto(null);
    load();
  }

  async function remove(id) {
    if (!confirm("Remove this board member?")) return;
    await client.delete(`/board/${id}`);
    load();
  }

  return (
    <div>
      <div className="card-siahssr p-4 mb-4">
        <h6 className="fw-bold mb-3">Add Board Member</h6>
        <form onSubmit={addMember} className="row g-2">
          <div className="col-md-4"><input className="form-control" placeholder="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="col-md-4"><input className="form-control" placeholder="Designation" value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} /></div>
          <div className="col-md-4"><input className="form-control" placeholder="Affiliation" value={form.affiliation} onChange={(e) => setForm({ ...form, affiliation: e.target.value })} /></div>
          <div className="col-md-8"><input className="form-control" placeholder="Expertise" value={form.expertise} onChange={(e) => setForm({ ...form, expertise: e.target.value })} /></div>
          <div className="col-md-4"><input type="file" accept="image/*" className="form-control" onChange={(e) => setPhoto(e.target.files[0])} /></div>
          <div className="col-12"><button className="btn btn-navy">Add Member</button></div>
        </form>
      </div>
      {members.map((m) => (
        <div className="card-siahssr p-3 mb-2 d-flex flex-row align-items-center gap-3" key={m.id}>
          <div className="flex-grow-1">
            <div className="fw-bold">{m.name}</div>
            <div className="small text-muted">{m.designation} — {m.affiliation}</div>
          </div>
          <button className="btn btn-sm btn-outline-danger" onClick={() => remove(m.id)}>Remove</button>
        </div>
      ))}
    </div>
  );
}

// ---------------- FAQ ----------------
function FaqPanel() {
  const [faqs, setFaqs] = useState([]);
  const [form, setForm] = useState({ question: "", answer: "", category: "general" });

  function load() {
    client.get("/faq").then(({ data }) => setFaqs(data)).catch(() => {});
  }
  useEffect(load, []);

  async function addFaq(e) {
    e.preventDefault();
    await client.post("/faq", form);
    setForm({ question: "", answer: "", category: "general" });
    load();
  }

  async function remove(id) {
    await client.delete(`/faq/${id}`);
    load();
  }

  return (
    <div>
      <form onSubmit={addFaq} className="card-siahssr p-4 mb-4 row g-2">
        <div className="col-md-6"><input className="form-control" placeholder="Question" required value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} /></div>
        <div className="col-md-6"><input className="form-control" placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
        <div className="col-12"><textarea className="form-control" placeholder="Answer" required value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} /></div>
        <div className="col-12"><button className="btn btn-navy">Add FAQ</button></div>
      </form>
      {faqs.map((f) => (
        <div className="card-siahssr p-3 mb-2" key={f.id}>
          <div className="d-flex justify-content-between">
            <strong>{f.question}</strong>
            <button className="btn btn-sm btn-outline-danger" onClick={() => remove(f.id)}>Delete</button>
          </div>
          <p className="small text-muted mb-0">{f.answer}</p>
        </div>
      ))}
    </div>
  );
}

// ---------------- USERS ----------------
function UsersPanel() {
  const [users, setUsers] = useState([]);
  function load() {
    client.get("/admin/users").then(({ data }) => setUsers(data)).catch(() => {});
  }
  useEffect(load, []);

  async function changeRole(id, role) {
    await client.patch(`/admin/users/${id}/role`, { role });
    load();
  }
  async function remove(id) {
    if (!confirm("Delete this user?")) return;
    await client.delete(`/admin/users/${id}`);
    load();
  }

  return (
    <div className="table-responsive">
      <table className="table align-middle">
        <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Verified</th><th></th></tr></thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.name}</td>
              <td>{u.email}</td>
              <td>
                <select className="form-select form-select-sm" value={u.role} onChange={(e) => changeRole(u.id, e.target.value)}>
                  <option value="author">Author</option>
                  <option value="reviewer">Reviewer</option>
                  <option value="admin">Admin</option>
                </select>
              </td>
              <td>{u.is_verified ? "Yes" : "No"}</td>
              <td><button className="btn btn-sm btn-outline-danger" onClick={() => remove(u.id)}>Delete</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------- SITE CONTENT (settings, logo, about-items, documents, announcements) ----------------
function SiteContentPanel() {
  const [settings, setSettings] = useState({});
  const [aboutItems, setAboutItems] = useState([]);
  const [newItem, setNewItem] = useState({ core_value: "", objective: "", mission: "" });
  const [announcements, setAnnouncements] = useState([]);
  const [newAnnouncement, setNewAnnouncement] = useState({ title: "", content: "" });
  const [documents, setDocuments] = useState([]);
  const [docForm, setDocForm] = useState({ title: "", category: "institute" });
  const [docFile, setDocFile] = useState(null);

  function load() {
    client.get("/admin/settings").then(({ data }) => setSettings(data)).catch(() => {});
    client.get("/admin/about-items").then(({ data }) => setAboutItems(data)).catch(() => {});
    client.get("/admin/announcements").then(({ data }) => setAnnouncements(data)).catch(() => {});
    client.get("/admin/documents").then(({ data }) => setDocuments(data)).catch(() => {});
  }
  useEffect(load, []);

  async function saveSettings(e) {
    e.preventDefault();
    await client.put("/admin/settings", settings);
    alert("Settings saved");
  }

  async function uploadSiteLogo(file) {
    const fd = new FormData();
    fd.append("logo", file);
    await client.post("/admin/settings/logo", fd, { headers: { "Content-Type": "multipart/form-data" } });
    load();
  }

  async function addItem(section) {
    const text = newItem[section];
    if (!text || !text.trim()) return;
    const count = aboutItems.filter((i) => i.section === section).length;
    await client.post("/admin/about-items", { section, text, sort_order: count });
    setNewItem({ ...newItem, [section]: "" });
    load();
  }
  async function removeItem(id) {
    await client.delete(`/admin/about-items/${id}`);
    load();
  }

  async function addAnnouncement(e) {
    e.preventDefault();
    if (!newAnnouncement.title.trim()) return;
    await client.post("/admin/announcements", newAnnouncement);
    setNewAnnouncement({ title: "", content: "" });
    load();
  }
  async function removeAnnouncement(id) {
    await client.delete(`/admin/announcements/${id}`);
    load();
  }

  async function uploadDocument(e) {
    e.preventDefault();
    if (!docForm.title || !docFile) return;
    const fd = new FormData();
    fd.append("title", docForm.title);
    fd.append("category", docForm.category);
    fd.append("file", docFile);
    await client.post("/admin/documents", fd, { headers: { "Content-Type": "multipart/form-data" } });
    setDocForm({ title: "", category: "institute" });
    setDocFile(null);
    load();
  }
  async function removeDocument(id) {
    await client.delete(`/admin/documents/${id}`);
    load();
  }

  function itemsFor(section) {
    return aboutItems.filter((i) => i.section === section);
  }

  const SECTION_LABELS = { core_value: "Core Values", objective: "Objectives", mission: "Mission" };

  return (
    <div className="row g-4">
      <div className="col-md-6">
        <div className="card-siahssr p-4">
          <h6 className="fw-bold mb-3">Navbar Logo</h6>
          <input type="file" accept="image/*" className="form-control" onChange={(e) => uploadSiteLogo(e.target.files[0])} />
        </div>

        <form onSubmit={saveSettings} className="card-siahssr p-4 mt-4">
          <h6 className="fw-bold mb-3">Homepage, Vision & Contact Text</h6>
          {["hero_title", "tagline", "vision_text", "contact_phone_1", "contact_phone_2", "contact_email", "contact_website", "contact_address"].map((key) => (
            <div className="mb-2" key={key}>
              <label className="form-label small text-muted">{key.replace(/_/g, " ")}</label>
              {key === "vision_text" ? (
                <textarea
                  className="form-control form-control-sm"
                  rows={3}
                  value={settings[key] || ""}
                  onChange={(e) => setSettings({ ...settings, [key]: e.target.value })}
                />
              ) : (
                <input
                  className="form-control form-control-sm"
                  value={settings[key] || ""}
                  onChange={(e) => setSettings({ ...settings, [key]: e.target.value })}
                />
              )}
            </div>
          ))}
          <button className="btn btn-navy mt-2">Save Settings</button>
        </form>

        <div className="card-siahssr p-4 mt-4">
          <h6 className="fw-bold mb-3">Institute Documents</h6>
          <form onSubmit={uploadDocument} className="mb-3">
            <input className="form-control form-control-sm mb-2" placeholder="Document title" value={docForm.title} onChange={(e) => setDocForm({ ...docForm, title: e.target.value })} />
            <input type="file" accept=".pdf,.doc,.docx" className="form-control form-control-sm mb-2" onChange={(e) => setDocFile(e.target.files[0])} />
            <button className="btn btn-sm btn-navy">Upload Document</button>
          </form>
          {documents.map((d) => (
            <div key={d.id} className="d-flex justify-content-between border-bottom py-1">
              <span className="small">{d.title}</span>
              <button className="btn btn-sm btn-outline-danger" onClick={() => removeDocument(d.id)}>×</button>
            </div>
          ))}
        </div>
      </div>

      <div className="col-md-6">
        {["core_value", "objective", "mission"].map((section) => (
          <div className="card-siahssr p-4 mb-4" key={section}>
            <h6 className="fw-bold mb-3">{SECTION_LABELS[section]}</h6>
            <div className="d-flex gap-2 mb-3">
              <input
                className="form-control"
                placeholder={`New ${SECTION_LABELS[section].toLowerCase().slice(0, -1)}…`}
                value={newItem[section]}
                onChange={(e) => setNewItem({ ...newItem, [section]: e.target.value })}
              />
              <button className="btn btn-navy" onClick={() => addItem(section)}>Add</button>
            </div>
            <div style={{ maxHeight: 180, overflowY: "auto" }}>
              {itemsFor(section).map((o) => (
                <div key={o.id} className="d-flex justify-content-between border-bottom py-1">
                  <span className="small">{o.text}</span>
                  <button className="btn btn-sm btn-outline-danger" onClick={() => removeItem(o.id)}>×</button>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="card-siahssr p-4">
          <h6 className="fw-bold mb-3">Announcements</h6>
          <form onSubmit={addAnnouncement} className="mb-3">
            <input className="form-control mb-2" placeholder="Title" value={newAnnouncement.title} onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })} />
            <textarea className="form-control mb-2" placeholder="Content" value={newAnnouncement.content} onChange={(e) => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })} />
            <button className="btn btn-navy">Add Announcement</button>
          </form>
          {announcements.map((a) => (
            <div key={a.id} className="d-flex justify-content-between border-bottom py-1">
              <span className="small fw-semibold">{a.title}</span>
              <button className="btn btn-sm btn-outline-danger" onClick={() => removeAnnouncement(a.id)}>×</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
