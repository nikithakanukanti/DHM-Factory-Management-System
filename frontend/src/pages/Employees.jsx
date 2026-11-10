import { useEffect, useMemo, useState } from "react";
import api from "../api";

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function Employees() {
  const currentUser = (() => { try { return JSON.parse(localStorage.getItem("dhmUser") || sessionStorage.getItem("dhmUser") || "{}"); } catch { return {}; } })();
  const isClient = currentUser?.role === "CLIENT";
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [selectedDate, setSelectedDate] = useState(today());
  const [loading, setLoading] = useState(false);
  const [savingEmp, setSavingEmp] = useState(false);
  const [savingAtt, setSavingAtt] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingId, setEditingId] = useState(null);

  const [empForm, setEmpForm] = useState({
    employeeCode: "",
    name: "",
    phone: "",
    email: "",
    department: "Production",
    designation: "",
    joiningDate: today(),
    status: "ACTIVE",
    basicSalary: ""
  });

  const [attForm, setAttForm] = useState({
    date: today(),
    employeeId: "",
    employeeName: "",
    department: "",
    status: "PRESENT",
    shift: "DAY",
    remarks: ""
  });

  async function loadEmployees() {
    const res = await api.get("/api/employees");
    setEmployees(Array.isArray(res.data) ? res.data : []);
  }

  async function loadAttendance(date = selectedDate) {
    const res = await api.get(`/api/attendance?date=${encodeURIComponent(date)}`);
    setAttendance(Array.isArray(res.data) ? res.data : []);
  }

  async function loadAll(date = selectedDate) {
    try {
      setLoading(true);
      setError("");
      await Promise.all([loadEmployees(), loadAttendance(date)]);
    } catch (e) {
      setError(e?.response?.data?.error || e?.response?.data || "Failed to load employees/attendance.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(today()); }, []);

  useEffect(() => {
    loadAttendance(selectedDate).catch((e) => setError(e?.response?.data?.error || e?.response?.data || "Failed to load attendance."));
    setAttForm(f => ({ ...f, date: selectedDate }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  const attendanceSummary = useMemo(() => {
    const summary = { PRESENT: 0, ABSENT: 0, HALF_DAY: 0, ON_LEAVE: 0 };
    attendance.forEach(a => { if (summary[a.status] !== undefined) summary[a.status] += 1; });
    return summary;
  }, [attendance]);

  function onEmpChange(e) {
    const { name, value } = e.target;
    setEmpForm(prev => ({ ...prev, [name]: value }));
  }

  function onAttChange(e) {
    const { name, value } = e.target;
    setAttForm(prev => {
      const next = { ...prev, [name]: value };
      if (name === "employeeId") {
        const emp = employees.find(x => String(x.id) === String(value));
        if (emp) {
          next.employeeName = emp.name || "";
          next.department = emp.department || "";
        }
      }
      return next;
    });
  }

  function resetEmpForm() {
    setEditingId(null);
    setEmpForm({
      employeeCode: "", name: "", phone: "", email: "", department: "Production", designation: "", joiningDate: today(), status: "ACTIVE", basicSalary: ""
    });
  }

  function editEmployee(emp) {
    setEditingId(emp.id);
    setEmpForm({
      employeeCode: emp.employeeCode || "",
      name: emp.name || "",
      phone: emp.phone || "",
      email: emp.email || "",
      department: emp.department || "Production",
      designation: emp.designation || "",
      joiningDate: emp.joiningDate || today(),
      status: emp.status || "ACTIVE",
      basicSalary: emp.basicSalary ?? ""
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveEmployee(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      setSavingEmp(true);
      const payload = { ...empForm, basicSalary: empForm.basicSalary === "" ? null : Number(empForm.basicSalary) };
      if (editingId) {
        await api.put(`/api/employees/${editingId}`, payload);
        setSuccess("Employee updated successfully.");
      } else {
        await api.post("/api/employees", payload);
        setSuccess("Employee added successfully.");
      }
      resetEmpForm();
      await loadEmployees();
    } catch (e2) {
      setError(e2?.response?.data?.error || e2?.response?.data || "Failed to save employee.");
    } finally {
      setSavingEmp(false);
    }
  }

  async function deleteEmployee(id) {
    if (!window.confirm("Delete this employee record?")) return;
    setError(""); setSuccess("");
    try {
      await api.delete(`/api/employees/${id}`);
      setSuccess("Employee deleted.");
      await loadEmployees();
    } catch (e) {
      setError(e?.response?.data?.error || e?.response?.data || "Failed to delete employee.");
    }
  }

  async function saveAttendance(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      if (!attForm.employeeId) {
        setError("Please select an employee.");
        return;
      }
      setSavingAtt(true);
      const payload = {
        ...attForm,
        employeeId: Number(attForm.employeeId),
        date: attForm.date || selectedDate
      };
      await api.post("/api/attendance", payload);
      setSuccess("Attendance recorded.");
      setAttForm(f => ({ ...f, employeeId: "", employeeName: "", department: "", remarks: "", status: "PRESENT", shift: "DAY" }));
      await loadAttendance(payload.date);
      if (payload.date !== selectedDate) setSelectedDate(payload.date);
    } catch (e2) {
      setError(e2?.response?.data?.error || e2?.response?.data || "Failed to record attendance.");
    } finally {
      setSavingAtt(false);
    }
  }

  return (
    <div className="page-container" style={{ paddingBottom: 30 }}>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>Employees & Attendance</h1>
          <p className="page-subtitle" style={{ margin: "4px 0 0", color: "#64748b" }}>
            Manage employee records and track daily attendance (present/absent/half-day/on leave) with live database data.
          </p>
        </div>
        <button onClick={() => loadAll(selectedDate)} disabled={loading} className="secondary-button" style={{ padding: "8px 12px" }}>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", padding: "10px 12px", borderRadius: 8, marginBottom: 12 }}>{String(error)}</div>}
      {success && <div style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", color: "#065f46", padding: "10px 12px", borderRadius: 8, marginBottom: 12 }}>{success}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16, marginBottom: 16 }}>
        <div className="card" style={{ padding: 16, border: "1px solid #e2e8f0", borderRadius: 10, background: "#fff" }}>
          <h3 style={{ margin: "0 0 12px", fontSize: 16 }}>{editingId ? `Edit Employee #${editingId}` : "Add Employee"}</h3>
          <form onSubmit={saveEmployee}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
              <div><label style={{ fontSize: 12, fontWeight: 600 }}>Employee Code</label><input name="employeeCode" value={empForm.employeeCode} onChange={onEmpChange} placeholder="Auto if blank" style={{ width: "100%", padding: 8, border: "1px solid #cbd5e1", borderRadius: 6 }} /></div>
              <div><label style={{ fontSize: 12, fontWeight: 600 }}>Name *</label><input name="name" value={empForm.name} onChange={onEmpChange} required style={{ width: "100%", padding: 8, border: "1px solid #cbd5e1", borderRadius: 6 }} /></div>
              <div><label style={{ fontSize: 12, fontWeight: 600 }}>Department</label><input name="department" value={empForm.department} onChange={onEmpChange} style={{ width: "100%", padding: 8, border: "1px solid #cbd5e1", borderRadius: 6 }} /></div>
              <div><label style={{ fontSize: 12, fontWeight: 600 }}>Designation</label><input name="designation" value={empForm.designation} onChange={onEmpChange} style={{ width: "100%", padding: 8, border: "1px solid #cbd5e1", borderRadius: 6 }} /></div>
              <div><label style={{ fontSize: 12, fontWeight: 600 }}>Phone</label><input name="phone" value={empForm.phone} onChange={onEmpChange} style={{ width: "100%", padding: 8, border: "1px solid #cbd5e1", borderRadius: 6 }} /></div>
              <div><label style={{ fontSize: 12, fontWeight: 600 }}>Email</label><input name="email" value={empForm.email} onChange={onEmpChange} style={{ width: "100%", padding: 8, border: "1px solid #cbd5e1", borderRadius: 6 }} /></div>
              <div><label style={{ fontSize: 12, fontWeight: 600 }}>Joining Date</label><input type="date" name="joiningDate" value={empForm.joiningDate} onChange={onEmpChange} style={{ width: "100%", padding: 8, border: "1px solid #cbd5e1", borderRadius: 6 }} /></div>
              <div><label style={{ fontSize: 12, fontWeight: 600 }}>Status</label><select name="status" value={empForm.status} onChange={onEmpChange} style={{ width: "100%", padding: 8, border: "1px solid #cbd5e1", borderRadius: 6 }}><option value="ACTIVE">ACTIVE</option><option value="INACTIVE">INACTIVE</option></select></div>
              <div><label style={{ fontSize: 12, fontWeight: 600 }}>Basic Salary</label><input type="number" step="0.01" name="basicSalary" value={empForm.basicSalary} onChange={onEmpChange} style={{ width: "100%", padding: 8, border: "1px solid #cbd5e1", borderRadius: 6 }} /></div>
            </div>
            <div style={{ marginTop: 12, display: "flex", gap: 8, justifyContent: "flex-end" }}>
              {editingId && <button type="button" onClick={resetEmpForm} className="secondary-button">Cancel</button>}
              <button type="submit" disabled={savingEmp || isClient} className="primary-button">{isClient ? "Read-only Access" : (savingEmp ? "Saving..." : (editingId ? "Update Employee" : "Add Employee"))}</button>
            </div>
          </form>
        </div>

        <div className="card" style={{ padding: 16, border: "1px solid #e2e8f0", borderRadius: 10, background: "#fff" }}>
          <h3 style={{ margin: "0 0 12px", fontSize: 16 }}>Record Attendance</h3>
          <form onSubmit={saveAttendance}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
              <div><label style={{ fontSize: 12, fontWeight: 600 }}>Date *</label><input type="date" name="date" value={attForm.date} onChange={onAttChange} required style={{ width: "100%", padding: 8, border: "1px solid #cbd5e1", borderRadius: 6 }} /></div>
              <div><label style={{ fontSize: 12, fontWeight: 600 }}>Employee *</label>
                <select name="employeeId" value={attForm.employeeId} onChange={onAttChange} required style={{ width: "100%", padding: 8, border: "1px solid #cbd5e1", borderRadius: 6 }}>
                  <option value="">Select employee</option>
                  {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name} ({emp.employeeCode || emp.id})</option>)}
                </select>
              </div>
              <div><label style={{ fontSize: 12, fontWeight: 600 }}>Status *</label>
                <select name="status" value={attForm.status} onChange={onAttChange} style={{ width: "100%", padding: 8, border: "1px solid #cbd5e1", borderRadius: 6 }}>
                  <option value="PRESENT">PRESENT</option>
                  <option value="ABSENT">ABSENT</option>
                  <option value="HALF_DAY">HALF_DAY</option>
                  <option value="ON_LEAVE">ON_LEAVE</option>
                </select>
              </div>
              <div><label style={{ fontSize: 12, fontWeight: 600 }}>Shift *</label>
                <select name="shift" value={attForm.shift} onChange={onAttChange} style={{ width: "100%", padding: 8, border: "1px solid #cbd5e1", borderRadius: 6 }}>
                  <option value="DAY">DAY</option>
                  <option value="NIGHT">NIGHT</option>
                </select>
              </div>
              <div style={{ gridColumn: "1 / -1" }}><label style={{ fontSize: 12, fontWeight: 600 }}>Remarks</label><input name="remarks" value={attForm.remarks} onChange={onAttChange} style={{ width: "100%", padding: 8, border: "1px solid #cbd5e1", borderRadius: 6 }} /></div>
            </div>
            <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
              <button type="submit" disabled={savingAtt || isClient} className="primary-button">{isClient ? "Read-only Access" : (savingAtt ? "Saving..." : "Save Attendance")}</button>
            </div>
          </form>

          <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Attendance Summary ({selectedDate})</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: 12 }}>
              {Object.entries(attendanceSummary).map(([k, v]) => (
                <span key={k} style={{ padding: "4px 8px", borderRadius: 999, background: "#f1f5f9", border: "1px solid #e2e8f0" }}>{k}: <strong>{v}</strong></span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 16 }}>
        <div className="card" style={{ padding: 16, border: "1px solid #e2e8f0", borderRadius: 10, background: "#fff" }}>
          <h3 style={{ margin: "0 0 10px", fontSize: 16 }}>Employee Master ({employees.length})</h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead><tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                <th style={{ padding: 8, textAlign: "left" }}>Code</th><th style={{ padding: 8, textAlign: "left" }}>Name</th><th style={{ padding: 8, textAlign: "left" }}>Department</th><th style={{ padding: 8, textAlign: "left" }}>Designation</th><th style={{ padding: 8, textAlign: "left" }}>Status</th><th style={{ padding: 8, textAlign: "left" }}>Actions</th>
              </tr></thead>
              <tbody>
                {employees.length === 0 ? <tr><td colSpan="6" style={{ padding: 14, textAlign: "center", color: "#64748b" }}>No employees found.</td></tr> : employees.map(emp => (
                  <tr key={emp.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: 8 }}>{emp.employeeCode || emp.id}</td>
                    <td style={{ padding: 8 }}><strong>{emp.name}</strong><div style={{ fontSize: 11, color: "#64748b" }}>{emp.phone || ""} {emp.email ? `| ${emp.email}` : ""}</div></td>
                    <td style={{ padding: 8 }}>{emp.department || "-"}</td>
                    <td style={{ padding: 8 }}>{emp.designation || "-"}</td>
                    <td style={{ padding: 8 }}>{emp.status || "-"}</td>
                    <td style={{ padding: 8 }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        {!isClient && <button onClick={() => editEmployee(emp)} style={{ padding: "4px 8px", border: "1px solid #cbd5e1", borderRadius: 6, background: "#fff", cursor: "pointer" }}>Edit</button>}
                        {!isClient && <button onClick={() => deleteEmployee(emp.id)} style={{ padding: "4px 8px", border: "1px solid #fecaca", borderRadius: 6, background: "#fef2f2", color: "#b91c1c", cursor: "pointer" }}>Delete</button>}
                        {isClient && <span style={{ fontSize: 12, color: "#64748b" }}>Read-only</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card" style={{ padding: 16, border: "1px solid #e2e8f0", borderRadius: 10, background: "#fff" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", marginBottom: 10 }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>Attendance Records</h3>
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} style={{ padding: 6, border: "1px solid #cbd5e1", borderRadius: 6 }} />
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead><tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                <th style={{ padding: 8, textAlign: "left" }}>Employee</th><th style={{ padding: 8, textAlign: "left" }}>Dept</th><th style={{ padding: 8, textAlign: "left" }}>Shift</th><th style={{ padding: 8, textAlign: "left" }}>Status</th>
              </tr></thead>
              <tbody>
                {attendance.length === 0 ? <tr><td colSpan="4" style={{ padding: 14, textAlign: "center", color: "#64748b" }}>No attendance records for selected date.</td></tr> : attendance.map(a => (
                  <tr key={a.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: 8 }}><strong>{a.employeeName || `#${a.employeeId}`}</strong>{a.remarks ? <div style={{ fontSize: 11, color: "#64748b" }}>{a.remarks}</div> : null}</td>
                    <td style={{ padding: 8 }}>{a.department || "-"}</td>
                    <td style={{ padding: 8 }}>{a.shift || "-"}</td>
                    <td style={{ padding: 8 }}>{a.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
