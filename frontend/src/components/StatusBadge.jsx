const LABELS = {
  submitted: "Submitted",
  under_review: "Under Review",
  accepted: "Accepted",
  rejected: "Rejected",
  published: "Published",
};

export default function StatusBadge({ status }) {
  return (
    <span className={`badge badge-status-${status}`}>{LABELS[status] || status}</span>
  );
}
