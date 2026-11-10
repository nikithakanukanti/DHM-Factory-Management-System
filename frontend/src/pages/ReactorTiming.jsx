import { useEffect, useMemo, useState } from "react";
import api from "../api";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function durationText(start, end, fallback) {
  if (fallback) return fallback;
  if (!start || !end) return "-";
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  if ([sh, sm, eh, em].some(n => Number.isNaN(n))) return "-";
  let mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins < 0) mins += 24 * 60;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export default function ReactorTiming() {
  const currentUser = (() => { try { return JSON.parse(localStorage.getItem("dhmUser") || sessionStorage.getItem("dhmUser") || "{}"); } catch { return {}; } })();
  const isClient = currentUser?.role === "CLIENT";
  const [timings, setTimings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    date: today(),
    startTime: "",
    endTime: "",
    responsibleUser: "",
    notes: "",
    relatedTransactionType: "",
    relatedTransactionId: "",
    shift: "SHIFT_A",
    batchNo: "",
    operatorName: ""
  });

  async function load() {
    try {
      setLoading(true);
      setError("");
      const res = await api.get("/api/reactor-timings");
      setTimings(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setError(e?.response?.data?.error || e?.response?.data || "Failed to load reactor timing records.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function resetForm() {
    setEditingId(null);
    setForm({ date: today(), startTime: "", endTime: "", responsibleUser: "", notes: "", relatedTransactionType: "", relatedTransactionId: "", shift: "SHIFT_A", batchNo: "", operatorName: "" });
  }

  function editRow(t) {
    setEditingId(t.id);
    setForm({
      date: t.date || today(),
      startTime: t.startTime || t.reactor1Time || "",
      endTime: t.endTime || t.reactor2Time || "",
      responsibleUser: t.responsibleUser || t.operatorName || "",
      notes: t.remarks || "",
      relatedTransactionType: t.relatedTransactionType || "",
      relatedTransactionId: t.relatedTransactionId ?? "",
      shift: t.shift || "SHIFT_A",
      batchNo: t.batchNo || "",
      operatorName: t.operatorName || t.responsibleUser || ""
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function onChange(e) {
    const { name, value } = e.target;
    setForm(prev => {
      const next = { ...prev, [name]: value };
      if (name === "responsibleUser" && !prev.operatorName) next.operatorName = value;
      return next;
    });
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!form.date) { setError("Date is required."); return; }
    try {
      setSaving(true);
      const payload = {
        date: form.date,
        startTime: form.startTime || null,
        endTime: form.endTime || null,
        reactor1Time: form.startTime || null,
        reactor2Time: form.endTime || null,
        responsibleUser: form.responsibleUser || form.operatorName || null,
        operatorName: form.operatorName || form.responsibleUser || null,
        remarks: form.notes || null,
        relatedTransactionType: form.relatedTransactionType || null,
        relatedTransactionId: form.relatedTransactionId ? Number(form.relatedTransactionId) : null,
        shift: form.shift || null,
        batchNo: form.batchNo || null
      };
      if (editingId) {
        await api.put(`/api/reactor-timings/${editingId}`, payload);
        setSuccess("Reactor timing record updated.");
      } else {
        await api.post("/api/reactor-timings", payload);
        setSuccess("Reactor timing record created.");
      }
      resetForm();
      await load();
    } catch (e2) {
      setError(e2?.response?.data?.error || e2?.response?.data || "Failed to save reactor timing record.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    if (!window.confirm("Delete this reactor timing record?")) return;
    setError(""); setSuccess("");
    try {
      await api.delete(`/api/reactor-timings/${id}`);
      setSuccess("Reactor timing record deleted.");
      await load();
    } catch (e) {
      setError(e?.response?.data?.error || e?.response?.data || "Failed to delete reactor timing record.");
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return timings.filter(t => {
      if (dateFilter && t.date !== dateFilter) return false;
      if (!q) return true;
      return [t.id, t.date, t.startTime, t.endTime, t.reactor1Time, t.reactor2Time, t.responsibleUser, t.operatorName, t.remarks, t.batchNo, t.shift, t.relatedTransactionType, t.relatedTransactionId, t.createdBy]
        .some(v => String(v ?? "").toLowerCase().includes(q));
    });
  }, [timings, search, dateFilter]);

  return (
    <div className="page-container" style={{ paddingBottom: 30 }}>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>Reactor Timing</h1>
          <p className="page-subtitle" style={{ margin: "4px 0 0", color: "#64748b" }}>
            Maintain authorised operational reactor records with start/end times, auto-calculated duration, responsible user, notes, and related transaction linkage.
          </p>
        </div>
        <button onClick={load} disabled={loading} className="secondary-button" style={{ padding: "8px 12px" }}>{loading ? "Refreshing..." : "Refresh"}</button>
      </div>

      {error && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", padding: "10px 12px", borderRadius: 8, marginBottom: 12 }}>{String(error)}</div>}
      {success && <div style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", color: "#065f46", padding: "10px 12px", borderRadius: 8, marginBottom: 12 }}>{success}</div>}

      <div className="card" style={{ padding: 16, border: "1px solid #e2e8f0", borderRadius: 10, background: "#fff", marginBottom: 16 }}>
        <h3 style={{ margin: "0 0 12px", fontSize: 16 }}>{editingId ? `Edit Reactor Record #${editingId}` : "Add Reactor Timing Record"}</h3>
        <form onSubmit={submit}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
            <div><label style={{ fontSize: 12, fontWeight: 600 }}>Date *</label><input type="date" name="date" value={form.date} onChange={onChange} required style={{ width: "100%", padding: 8, border: "1px solid #cbd5e1", borderRadius: 6 }} /></div>
            <div><label style={{ fontSize: 12, fontWeight: 600 }}>Start Time</label><input type="time" name="startTime" value={form.startTime} onChange={onChange} style={{ width: "100%", padding: 8, border: "1px solid #cbd5e1", borderRadius: 6 }} /></div>
            <div><label style={{ fontSize: 12, fontWeight: 600 }}>End Time</label><input type="time" name="endTime" value={form.endTime} onChange={onChange} style={{ width: "100%", padding: 8, border: "1px solid #cbd5e1", borderRadius: 6 }} /></div>
            <div><label style={{ fontSize: 12, fontWeight: 600 }}>Auto Duration</label><div style={{ padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: 6, background: "#f8fafc", fontWeight: 700 }}>{durationText(form.startTime, form.endTime)}</div></div>
            <div><label style={{ fontSize: 12, fontWeight: 600 }}>Responsible User</label><input name="responsibleUser" value={form.responsibleUser} onChange={onChange} placeholder="Operator / supervisor name" style={{ width: "100%", padding: 8, border: "1px solid #cbd5e1", borderRadius: 6 }} /></div>
            <div><label style={{ fontSize: 12, fontWeight: 600 }}>Shift</label><input name="shift" value={form.shift} onChange={onChange} placeholder="SHIFT_A / DAY / NIGHT" style={{ width: "100%", padding: 8, border: "1px solid #cbd5e1", borderRadius: 6 }} /></div>
            <div><label style={{ fontSize: 12, fontWeight: 600 }}>Batch No</label><input name="batchNo" value={form.batchNo} onChange={onChange} style={{ width: "100%", padding: 8, border: "1px solid #cbd5e1", borderRadius: 6 }} /></div>
            <div><label style={{ fontSize: 12, fontWeight: 600 }}>Related Transaction Type</label><select name="relatedTransactionType" value={form.relatedTransactionType} onChange={onChange} style={{ width: "100%", padding: 8, border: "1px solid #cbd5e1", borderRadius: 6 }}><option value="">None</option><option value="SALE">SALE</option><option value="PURCHASE">PURCHASE</option><option value="VEHICLE">VEHICLE</option></select></div>
            <div><label style={{ fontSize: 12, fontWeight: 600 }}>Related Transaction ID</label><input type="number" name="relatedTransactionId" value={form.relatedTransactionId} onChange={onChange} placeholder="Optional" style={{ width: "100%", padding: 8, border: "1px solid #cbd5e1", borderRadius: 6 }} /></div>
            <div style={{ gridColumn: "1 / -1" }}><label style={{ fontSize: 12, fontWeight: 600 }}>Notes</label><input name="notes" value={form.notes} onChange={onChange} placeholder="Operational notes" style={{ width: "100%", padding: 8, border: "1px solid #cbd5e1", borderRadius: 6 }} /></div>
          </div>
          <div style={{ marginTop: 12, display: "flex", gap: 8, justifyContent: "flex-end" }}>
            {editingId && <button type="button" className="secondary-button" onClick={resetForm}>Cancel</button>}
            <button type="submit" disabled={saving || isClient} className="primary-button">{isClient ? "Read-only Access" : (saving ? "Saving..." : (editingId ? "Update Record" : "Save Record"))}</button>
          </div>
        </form>
      </div>

      <div className="card" style={{ padding: 16, border: "1px solid #e2e8f0", borderRadius: 10, background: "#fff" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Reactor Timing Records ({filtered.length})</h3>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} style={{ padding: 8, border: "1px solid #cbd5e1", borderRadius: 6 }} />
            <input placeholder="Search date/user/batch/notes..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ padding: 8, border: "1px solid #cbd5e1", borderRadius: 6, minWidth: 220 }} />
            {dateFilter && <button className="secondary-button" onClick={() => setDateFilter("")}>Clear Date</button>}
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                <th style={{ padding: 10, textAlign: "left" }}>Record ID</th>
                <th style={{ padding: 10, textAlign: "left" }}>Date</th>
                <th style={{ padding: 10, textAlign: "left" }}>Start</th>
                <th style={{ padding: 10, textAlign: "left" }}>End</th>
                <th style={{ padding: 10, textAlign: "left" }}>Duration</th>
                <th style={{ padding: 10, textAlign: "left" }}>Responsible User</th>
                <th style={{ padding: 10, textAlign: "left" }}>Related</th>
                <th style={{ padding: 10, textAlign: "left" }}>Notes</th>
                <th style={{ padding: 10, textAlign: "left" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="9" style={{ padding: 18, textAlign: "center", color: "#64748b" }}>{loading ? "Loading..." : "No reactor timing records found."}</td></tr>
              ) : filtered.map(t => (
                <tr key={t.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: 10 }}>#{t.id}</td>
                  <td style={{ padding: 10 }}>{t.date}</td>
                  <td style={{ padding: 10 }}>{t.startTime || t.reactor1Time || "-"}</td>
                  <td style={{ padding: 10 }}>{t.endTime || t.reactor2Time || "-"}</td>
                  <td style={{ padding: 10, fontWeight: 700 }}>{durationText(t.startTime || t.reactor1Time, t.endTime || t.reactor2Time, t.durationText)}</td>
                  <td style={{ padding: 10 }}>{t.responsibleUser || t.operatorName || t.createdBy || "-"}<div style={{ fontSize: 11, color: "#64748b" }}>{t.shift || ""} {t.batchNo ? `| Batch ${t.batchNo}` : ""}</div></td>
                  <td style={{ padding: 10 }}>{t.relatedTransactionType ? `${t.relatedTransactionType}${t.relatedTransactionId ? ` #${t.relatedTransactionId}` : ""}` : "-"}</td>
                  <td style={{ padding: 10 }}>{t.remarks || "-"}</td>
                  <td style={{ padding: 10 }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      {!isClient && <button onClick={() => editRow(t)} style={{ padding: "4px 8px", border: "1px solid #cbd5e1", borderRadius: 6, background: "#fff", cursor: "pointer" }}>Edit</button>}
                      {!isClient && <button onClick={() => remove(t.id)} style={{ padding: "4px 8px", border: "1px solid #fecaca", borderRadius: 6, background: "#fef2f2", color: "#b91c1c", cursor: "pointer" }}>Delete</button>}
                    </div>
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