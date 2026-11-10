import { useEffect, useState } from "react";
import api from "../api";

const KNOWN_FIELDS = [
  { key: "factory_name", label: "Factory Name" },
  { key: "factory_address", label: "Factory Address" },
  { key: "factory_latitude", label: "Factory Latitude" },
  { key: "factory_longitude", label: "Factory Longitude" },
  { key: "factory_geofence_meters", label: "Geofence Radius (meters)" },
  { key: "default_tax_rate", label: "Default Tax Rate (%)" },
  { key: "invoice_prefix", label: "Invoice Prefix" }
];

export default function Settings() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load() {
    try {
      setLoading(true);
      setError("");
      const res = await api.get("/api/settings");
      setSettings(res.data && typeof res.data === "object" ? res.data : {});
    } catch (e) {
      setError(e?.response?.data?.error || e?.response?.data || "Failed to load settings.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function onChange(key, value) {
    setSettings(prev => ({ ...prev, [key]: value }));
  }

  async function save(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      setSaving(true);
      await api.put("/api/settings", settings);
      setSuccess("Settings saved successfully.");
      await load();
    } catch (e2) {
      setError(e2?.response?.data?.error || e2?.response?.data || "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-container" style={{ paddingBottom: 30 }}>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>Factory & Geofence Settings</h1>
          <p className="page-subtitle" style={{ margin: "4px 0 0", color: "#64748b" }}>
            Admin-managed configuration stored in MySQL. Backend authorization restricts this module to administrators.
          </p>
        </div>
        <button onClick={load} disabled={loading} className="secondary-button" style={{ padding: "8px 12px" }}>{loading ? "Refreshing..." : "Refresh"}</button>
      </div>

      {error && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", padding: "10px 12px", borderRadius: 8, marginBottom: 12 }}>{String(error)}</div>}
      {success && <div style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", color: "#065f46", padding: "10px 12px", borderRadius: 8, marginBottom: 12 }}>{success}</div>}

      <div className="card" style={{ padding: 16, border: "1px solid #e2e8f0", borderRadius: 10, background: "#fff" }}>
        <form onSubmit={save}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
            {KNOWN_FIELDS.map(f => (
              <div key={f.key} style={f.key === "factory_address" ? { gridColumn: "1 / -1" } : undefined}>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>{f.label}</label>
                {f.key === "factory_address" ? (
                  <textarea value={settings[f.key] ?? ""} onChange={(e) => onChange(f.key, e.target.value)} rows={3} style={{ width: "100%", padding: 8, border: "1px solid #cbd5e1", borderRadius: 6 }} />
                ) : (
                  <input value={settings[f.key] ?? ""} onChange={(e) => onChange(f.key, e.target.value)} style={{ width: "100%", padding: 8, border: "1px solid #cbd5e1", borderRadius: 6 }} />
                )}
              </div>
            ))}
          </div>

          <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid #e2e8f0" }}>
            <h4 style={{ margin: "0 0 8px", fontSize: 14 }}>All Stored Settings</h4>
            <div style={{ display: "grid", gap: 8 }}>
              {Object.keys(settings).sort().map(key => (
                <div key={key} style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 8, alignItems: "center" }}>
                  <code style={{ fontSize: 12, color: "#334155" }}>{key}</code>
                  <input value={settings[key] ?? ""} onChange={(e) => onChange(key, e.target.value)} style={{ width: "100%", padding: 8, border: "1px solid #cbd5e1", borderRadius: 6 }} />
                </div>
              ))}
              {Object.keys(settings).length === 0 && <div style={{ color: "#64748b", fontSize: 13 }}>No settings loaded.</div>}
            </div>
          </div>

          <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end" }}>
            <button type="submit" disabled={saving} className="primary-button">{saving ? "Saving..." : "Save Settings"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
