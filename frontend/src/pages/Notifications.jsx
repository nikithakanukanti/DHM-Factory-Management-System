import { useEffect, useMemo, useState } from "react";
import api from "../api";

export default function Notifications() {
  const currentUser = (() => { try { return JSON.parse(localStorage.getItem("dhmUser") || sessionStorage.getItem("dhmUser") || "{}"); } catch { return {}; } })();
  const isClient = currentUser?.role === "CLIENT";
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("ALL");

  async function load() {
    try {
      setLoading(true);
      setError("");
      const res = await api.get("/api/notifications");
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setError(e?.response?.data?.error || e?.response?.data || "Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (filter === "UNREAD") return items.filter(n => !n.read);
    if (filter === "READ") return items.filter(n => n.read);
    return items;
  }, [items, filter]);

  async function markRead(id) {
    try {
      await api.put(`/api/notifications/${id}/read`);
      await load();
    } catch (e) {
      setError(e?.response?.data?.error || e?.response?.data || "Failed to update notification.");
    }
  }

  async function markAllRead() {
    try {
      await api.put("/api/notifications/read-all");
      await load();
    } catch (e) {
      setError(e?.response?.data?.error || e?.response?.data || "Failed to mark all as read.");
    }
  }

  function badgeStyle(type) {
    const t = String(type || "INFO").toUpperCase();
    if (t === "WARNING" || t === "ALERT") return { bg: "#fff7ed", border: "#fed7aa", color: "#9a3412" };
    if (t === "SUCCESS") return { bg: "#ecfdf5", border: "#a7f3d0", color: "#065f46" };
    return { bg: "#eff6ff", border: "#bfdbfe", color: "#1d4ed8" };
  }

  return (
    <div className="page-container" style={{ paddingBottom: 30 }}>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>Notification Centre</h1>
          <p className="page-subtitle" style={{ margin: "4px 0 0", color: "#64748b" }}>
            Live system alerts for payments, inventory, vehicle activity, and operational updates.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ padding: 8, border: "1px solid #cbd5e1", borderRadius: 6 }}>
            <option value="ALL">All</option>
            <option value="UNREAD">Unread</option>
            <option value="READ">Read</option>
          </select>
          {!isClient && <button onClick={markAllRead} className="secondary-button" style={{ padding: "8px 12px" }}>Mark All Read</button>}
          <button onClick={load} disabled={loading} className="secondary-button" style={{ padding: "8px 12px" }}>{loading ? "Refreshing..." : "Refresh"}</button>
        </div>
      </div>

      {error && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", padding: "10px 12px", borderRadius: 8, marginBottom: 12 }}>{String(error)}</div>}

      <div className="card" style={{ padding: 12, border: "1px solid #e2e8f0", borderRadius: 10, background: "#fff" }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 20, color: "#64748b", textAlign: "center" }}>{loading ? "Loading notifications..." : "No notifications found."}</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {filtered.map(n => {
              const b = badgeStyle(n.type);
              return (
                <div key={n.id} style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 12, background: n.read ? "#fff" : "#f8fafc" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "flex-start" }}>
                    <div style={{ minWidth: 240, flex: 1 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 4 }}>
                        <strong style={{ color: "#0f172a" }}>{n.title || "Notification"}</strong>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: b.bg, border: `1px solid ${b.border}`, color: b.color }}>{n.type || "INFO"}</span>
                        {n.module && <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: "#f1f5f9", border: "1px solid #e2e8f0", color: "#334155" }}>{n.module}</span>}
                        {!n.read && <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: "#dbeafe", color: "#1d4ed8", fontWeight: 700 }}>UNREAD</span>}
                      </div>
                      <div style={{ fontSize: 13, color: "#334155", marginBottom: 4 }}>{n.message}</div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>{n.createdAt ? String(n.createdAt).replace("T", " ") : ""}</div>
                    </div>
                    {!n.read && !isClient && (
                      <button onClick={() => markRead(n.id)} className="secondary-button" style={{ padding: "6px 10px" }}>Mark Read</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
