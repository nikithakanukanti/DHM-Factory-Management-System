import { useEffect, useState, useMemo } from "react";
import api from "../api";

function getTodayDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function ReactorTiming() {
  const [timings, setTimings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");

  const [formData, setFormData] = useState({
    date: getTodayDate(),
    reactor1Time: "",
    reactor2Time: ""
  });

  useEffect(() => {
    fetchTimings();
  }, []);

  async function fetchTimings() {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/api/reactor-timings");

      if (Array.isArray(response.data)) {
        setTimings(response.data);
      } else {
        setTimings([]);
        setError("Unable to load reactor timing records.");
      }
    } catch (err) {
      console.error("Reactor API Error:", err);
      setTimings([]);
      if (err.response?.status === 403) {
        setError("You do not have permission to view reactor timings.");
      } else {
        setError("Unable to connect to backend server.");
      }
    } finally {
      setLoading(false);
    }
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((previous) => ({
      ...previous,
      [name]: value
    }));
  }

  function openAddForm() {
    setEditingId(null);
    setFormData({
      date: getTodayDate(),
      reactor1Time: "",
      reactor2Time: ""
    });
    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function openEditForm(timing) {
    setEditingId(timing.id);
    setFormData({
      date: timing.date,
      reactor1Time: timing.reactor1Time || "",
      reactor2Time: timing.reactor2Time || ""
    });
    setError("");
    setSuccess("");
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!formData.date) {
      setError("Please select a date.");
      return;
    }

    try {
      setSaving(true);
      const data = {
        date: formData.date,
        reactor1Time: formData.reactor1Time || null,
        reactor2Time: formData.reactor2Time || null
      };

      if (editingId) {
        await api.put(`/api/reactor-timings/${editingId}`, data);
        setSuccess("Reactor timing updated successfully.");
      } else {
        await api.post("/api/reactor-timings", data);
        setSuccess("Reactor timing saved successfully.");
      }

      setShowForm(false);
      setEditingId(null);
      await fetchTimings();
    } catch (err) {
      console.error("Reactor save error:", err);
      if (err.response?.status === 403) {
        setError("Supervisor cannot edit previous-day records.");
      } else {
        setError("Unable to save reactor timing.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function deleteTiming(id) {
    if (!window.confirm("Are you sure you want to delete this reactor timing record?")) {
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      await api.delete(`/api/reactor-timings/${id}`);
      setSuccess("Reactor timing record deleted successfully.");
      await fetchTimings();
    } catch (err) {
      console.error("Delete reactor timing error:", err);
      if (err.response?.status === 403) {
        setError("Supervisor cannot delete previous-day records.");
      } else {
        setError("Unable to delete reactor timing.");
      }
    } finally {
      setLoading(false);
    }
  }

  const filteredTimings = useMemo(() => {
    const query = search.toLowerCase().trim();
    if (!query) return timings;

    return timings.filter((t) =>
      String(t.date || "").toLowerCase().includes(query) ||
      String(t.reactor1Time || "").toLowerCase().includes(query) ||
      String(t.reactor2Time || "").toLowerCase().includes(query)
    );
  }, [timings, search]);

  return (
    <div className="vehicle-page">

      {/* PAGE HEADER */}
      <div className="page-header">
        <div>
          <h1>REACTOR TIMING</h1>
          <p>Pyrolysis Reactor 1 & Reactor 2 Batch Timings</p>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            type="button"
            className="secondary-button"
            onClick={fetchTimings}
            disabled={loading || saving}
          >
            {loading ? "Loading..." : "Refresh"}
          </button>

          {!showForm && (
            <button
              type="button"
              className="primary-button"
              onClick={openAddForm}
            >
              + Log Batch Timing
            </button>
          )}
        </div>
      </div>

      {/* SUCCESS BANNER */}
      {success && (
        <div className="success-message" style={{ marginBottom: "20px" }}>
          ✓ {success}
        </div>
      )}

      {/* ERROR BANNER */}
      {error && (
        <div className="error-message" style={{ marginBottom: "20px" }}>
          ⚠ {error}
        </div>
      )}

      {/* FORM CARD (when adding or editing) */}
      {showForm && (
        <div className="card" style={{ marginBottom: "25px" }}>
          <div className="section-header">
            <div>
              <h2>{editingId ? "Edit Reactor Timing" : "New Batch Operating Timing"}</h2>
              <p>Log start/operating times for Reactor 1 and Reactor 2</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="form-grid">
            {/* DATE */}
            <div className="form-group">
              <label>Date *</label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                required
              />
            </div>

            {/* REACTOR 1 */}
            <div className="form-group">
              <label>Reactor 1 Time</label>
              <input
                type="time"
                name="reactor1Time"
                value={formData.reactor1Time}
                onChange={handleChange}
              />
            </div>

            {/* REACTOR 2 */}
            <div className="form-group">
              <label>Reactor 2 Time</label>
              <input
                type="time"
                name="reactor2Time"
                value={formData.reactor2Time}
                onChange={handleChange}
              />
            </div>

            {/* BUTTONS */}
            <div style={{ gridColumn: "1 / -1", display: "flex", gap: "10px", marginTop: "10px" }}>
              <button
                type="submit"
                className="primary-button"
                disabled={saving}
              >
                {saving ? "Saving..." : editingId ? "Update Timing" : "Save Timing"}
              </button>

              <button
                type="button"
                className="secondary-button"
                onClick={() => { setShowForm(false); setEditingId(null); }}
                disabled={saving}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TIMING RECORDS TABLE */}
      <div className="card">
        <div className="section-header" style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h2>Reactor Operating Logs ({filteredTimings.length})</h2>
            <p>Daily operational timing logs</p>
          </div>

          <div style={{ minWidth: "260px" }}>
            <input
              type="text"
              placeholder="Search by date or time..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
            />
          </div>
        </div>

        <div className="table-container" style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Reactor 1 Operating Time</th>
                <th>Reactor 2 Operating Time</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTimings.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: "center", padding: "30px", color: "#64748b" }}>
                    No reactor timing logs found.
                  </td>
                </tr>
              ) : (
                filteredTimings.map((t) => (
                  <tr key={t.id}>
                    <td><strong>{t.date}</strong></td>
                    <td>{t.reactor1Time || "-"}</td>
                    <td>{t.reactor2Time || "-"}</td>
                    <td>
                      <span style={{
                        display: "inline-block",
                        padding: "3px 8px",
                        borderRadius: "6px",
                        fontSize: "11px",
                        fontWeight: "600",
                        background: "#dcfce7",
                        color: "#15803d"
                      }}>
                        Logged
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button
                          type="button"
                          onClick={() => openEditForm(t)}
                          style={{ padding: "4px 8px", fontSize: "11px", background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: "5px", cursor: "pointer" }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteTiming(t.id)}
                          style={{ padding: "4px 8px", fontSize: "11px", background: "#fee2e2", border: "1px solid #fca5a5", color: "#b91c1c", borderRadius: "5px", cursor: "pointer" }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
}

export default ReactorTiming;
