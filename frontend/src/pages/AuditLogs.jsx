import { useEffect, useMemo, useState } from "react";
import api from "../api";

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("ALL");

  async function load() {
    try {
      setLoading(true);
      setError("");
      const res = await api.get("/api/audit-logs");
      setLogs(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setError(e?.response?.data?.error || e?.response?.data || "Failed to load audit logs.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const modules = useMemo(() => {
    const s = new Set(logs.map(l => l.module).filter(Boolean));
    return ["ALL", ...Array.from(s).sort()];
  }, [logs]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return logs.filter(l => {
      if (moduleFilter !== "ALL" && l.module !== moduleFilter) return false;
      if (!q) return true;
      return [l.username, l.action, l.module, l.details, l.oldValue, l.newValue, l.recordId]
        .some(v => String(v ?? "").toLowerCase().includes(q));
    });
  }, [logs, search, moduleFilter]);

  return (
    <div className="page-container" style={{ paddingBottom: 30 }}>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>Security Audit Logs</h1>
          <p className="page-subtitle" style={{ margin: "4px 0 0", color: "#64748b" }}>
            Immutable admin-only activity trail for create/update/delete/login and system actions (backend-enforced).
          </p>
        </div>
        <button onClick={load} disabled={loading} className="secondary-button" style={{ padding: "8px 12px" }}>{loading ? "Refreshing..." : "Refresh"}</button>
      </div>

      {error && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", padding: "10px 12px", borderRadius: 8, marginBottom: 12 }}>{String(error)}</div>}

      <div className="card" style={{ padding: 16, border: "1px solid #e2e8f0", borderRadius: 10, background: "#fff" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ fontSize: 13, color: "#64748b" }}>Showing {filtered.length} of {logs.length} records</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input placeholder="Search user/action/details..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ padding: 8, border: "1px solid #cbd5e1", borderRadius: 6, minWidth: 220 }} />
            <select value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)} style={{ padding: 8, border: "1px solid #cbd5e1", borderRadius: 6 }}>
              {modules.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                <th style={{ padding: 10, textAlign: "left" }}>Timestamp</th>
                <th style={{ padding: 10, textAlign: "left" }}>User</th>
                <th style={{ padding: 10, textAlign: "left" }}>Action</th>
                <th style={{ padding: 10, textAlign: "left" }}>Module</th>
                <th style={{ padding: 10, textAlign: "left" }}>Record ID</th>
                <th style={{ padding: 10, textAlign: "left" }}>Details / Changes</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="6" style={{ padding: 18, textAlign: "center", color: "#64748b" }}>{loading ? "Loading..." : "No audit logs found."}</td></tr>
              ) : filtered.map(log => (
                <tr key={log.id} style={{ borderBottom: "1px solid #f1f5f9", verticalAlign: "top" }}>
                  <td style={{ padding: 10, whiteSpace: "nowrap" }}>{log.timestamp ? String(log.timestamp).replace("T", " ") : "-"}</td>
                  <td style={{ padding: 10 }}>{log.username || "-"}</td>
                  <td style={{ padding: 10 }}><span style={{ fontWeight: 700 }}>{log.action || "-"}</span></td>
                  <td style={{ padding: 10 }}>{log.module || "-"}</td>
                  <td style={{ padding: 10 }}>{log.recordId ?? "-"}</td>
                  <td style={{ padding: 10 }}>
                    <div>{log.details || "-"}</div>
                    {(log.oldValue || log.newValue) && (
                      <div style={{ marginTop: 6, fontSize: 12, color: "#475569", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 6, padding: 8 }}>
                        {log.oldValue && <div><strong>Previous:</strong> {String(log.oldValue)}</div>}
                        {log.newValue && <div><strong>Updated:</strong> {String(log.newValue)}</div>}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
