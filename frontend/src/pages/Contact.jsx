import { useEffect, useState } from "react";
import client from "../api/client";

export default function Contact() {
  const [settings, setSettings] = useState({});

  useEffect(() => {
    client.get("/public/settings").then(({ data }) => setSettings(data)).catch(() => {});
  }, []);

  return (
    <div className="container py-5" style={{ maxWidth: 560 }}>
      <h1 className="brand-font mb-4">Contact Us</h1>
      <div className="card-siahssr p-4">
        <p><i className="bi bi-telephone me-2 text-gold" />{settings.contact_phone_1}</p>
        <p><i className="bi bi-telephone me-2 text-gold" />{settings.contact_phone_2}</p>
        <p><i className="bi bi-envelope me-2 text-gold" />{settings.contact_email}</p>
        <p><i className="bi bi-globe me-2 text-gold" /><a href={settings.contact_website} target="_blank" rel="noreferrer">{settings.contact_website}</a></p>
        <p className="mb-0"><i className="bi bi-geo-alt me-2 text-gold" />{settings.contact_address}</p>
      </div>
    </div>
  );
}
