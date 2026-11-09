import { useEffect, useMemo, useState } from "react";
import api from "../api";

const commodities = [
    "Local Waste Rubber Tyre",
    "Imported Waste Rubber Tyre",
    "Metal Steel Scrap",
    "Carbon Black Powder",
    "Fuel Oil"
];

function getTodayDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

const emptyForm = {
    date: getTodayDate(),
    vehicleNo: "",
    grossWeight: "",
    tareWeight: "",
    commodity: "",
    remarks: ""
};

function SalesRegister() {
    const [sales, setSales] = useState([]);
    const [form, setForm] = useState(emptyForm);
    const [search, setSearch] = useState("");
    const [editingId, setEditingId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    async function loadSales() {
        try {
            setLoading(true);
            setError("");

            const response = await api.get("/api/sales");

            setSales(Array.isArray(response.data) ? response.data : []);
        } catch (err) {
            console.error("Sales loading error:", err);
            setSales([]);
            if (err.response?.status === 403) {
                setError("You do not have permission to view sales records.");
            } else {
                setError("Unable to connect to backend server.");
            }
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadSales();
    }, []);

    function handleChange(event) {
        const { name, value } = event.target;
        setForm((prev) => ({
            ...prev,
            [name]: value
        }));
    }

    const gross = Number(form.grossWeight) || 0;
    const tare = Number(form.tareWeight) || 0;
    const netWeight = Math.max(gross - tare, 0);

    function clearForm() {
        setForm({
            date: getTodayDate(),
            vehicleNo: "",
            grossWeight: "",
            tareWeight: "",
            commodity: "",
            remarks: ""
        });
        setEditingId(null);
        setError("");
        setSuccess("");
    }

    async function handleSubmit(event) {
        event.preventDefault();
        setError("");
        setSuccess("");

        if (!form.date) {
            setError("Please select a date.");
            return;
        }

        if (!form.vehicleNo.trim()) {
            setError("Please enter vehicle number.");
            return;
        }

        if (gross <= 0) {
            setError("Please enter valid gross weight.");
            return;
        }

        if (tare < 0 || tare >= gross) {
            setError("Tare weight must be less than gross weight.");
            return;
        }

        if (!form.commodity) {
            setError("Please select a commodity.");
            return;
        }

        const payload = {
            date: form.date,
            vehicleNo: form.vehicleNo.trim().toUpperCase(),
            grossWeight: gross,
            tareWeight: tare,
            commodity: form.commodity,
            remarks: form.remarks.trim()
        };

        try {
            setSaving(true);

            if (editingId) {
                await api.put(`/api/sales/${editingId}`, payload);
                setSuccess("Sales entry updated successfully.");
            } else {
                await api.post("/api/sales", payload);
                setSuccess("Sales entry recorded successfully.");
            }

            clearForm();
            await loadSales();
        } catch (err) {
            console.error("Sales save error:", err);
            if (err.response?.status === 403) {
                setError("Supervisor cannot edit previous-day records.");
            } else {
                setError(err.response?.data?.message || typeof err.response?.data === "string" ? err.response.data : "Unable to save sales entry.");
            }
        } finally {
            setSaving(false);
        }
    }

    function startEdit(sale) {
        setEditingId(sale.id);
        setForm({
            date: sale.date || getTodayDate(),
            vehicleNo: sale.vehicleNo || "",
            grossWeight: sale.grossWeight ?? "",
            tareWeight: sale.tareWeight ?? "",
            commodity: sale.commodity || "",
            remarks: sale.remarks || ""
        });
        setError("");
        setSuccess("");
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    async function deleteSale(id) {
        if (!window.confirm("Are you sure you want to delete this sales entry?")) {
            return;
        }

        try {
            setLoading(true);
            setError("");
            setSuccess("");

            await api.delete(`/api/sales/${id}`);
            setSuccess("Sales entry deleted successfully.");
            await loadSales();
        } catch (err) {
            console.error("Delete sale error:", err);
            if (err.response?.status === 403) {
                setError("Supervisor cannot delete previous-day records.");
            } else {
                setError("Unable to delete sales entry.");
            }
        } finally {
            setLoading(false);
        }
    }

    const filteredSales = useMemo(() => {
        const query = search.toLowerCase().trim();
        if (!query) return sales;

        return sales.filter((s) =>
            String(s.date || "").toLowerCase().includes(query) ||
            String(s.vehicleNo || "").toLowerCase().includes(query) ||
            String(s.commodity || "").toLowerCase().includes(query) ||
            String(s.remarks || "").toLowerCase().includes(query)
        );
    }, [sales, search]);

    const totalSalesWeight = filteredSales.reduce((sum, s) => {
        const val = s.netWeight != null ? Number(s.netWeight) : (s.grossWeight && s.tareWeight ? Number(s.grossWeight) - Number(s.tareWeight) : 0);
        return sum + val;
    }, 0);

    return (
        <div className="vehicle-page">

            {/* PAGE HEADER */}
            <div className="page-header">
                <div>
                    <h1>SALES REGISTER</h1>
                    <p>Finished Goods Dispatch & Outward Weighbridge Log</p>
                </div>

                <button
                    type="button"
                    className="secondary-button"
                    onClick={loadSales}
                    disabled={loading || saving}
                >
                    {loading ? "Loading..." : "Refresh"}
                </button>
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

            {/* FORM CARD */}
            <div className="card">
                <div className="section-header">
                    <div>
                        <h2>{editingId ? "Edit Sales Entry" : "New Sales Dispatch Entry"}</h2>
                        <p>Record outgoing dispatch weights and material</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="form-grid">

                    {/* DATE */}
                    <div className="form-group">
                        <label>Date *</label>
                        <input
                            type="date"
                            name="date"
                            value={form.date}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    {/* VEHICLE NO */}
                    <div className="form-group">
                        <label>Vehicle Number *</label>
                        <input
                            type="text"
                            name="vehicleNo"
                            value={form.vehicleNo}
                            onChange={handleChange}
                            placeholder="e.g. MH 04 CD 9876"
                            required
                        />
                    </div>

                    {/* GROSS WEIGHT */}
                    <div className="form-group">
                        <label>Gross Weight (KG) *</label>
                        <input
                            type="number"
                            name="grossWeight"
                            value={form.grossWeight}
                            onChange={handleChange}
                            placeholder="Gross weight"
                            min="0"
                            step="0.01"
                            required
                        />
                    </div>

                    {/* TARE WEIGHT */}
                    <div className="form-group">
                        <label>Tare Weight (KG) *</label>
                        <input
                            type="number"
                            name="tareWeight"
                            value={form.tareWeight}
                            onChange={handleChange}
                            placeholder="Tare weight"
                            min="0"
                            step="0.01"
                            required
                        />
                    </div>

                    {/* CALCULATED NET WEIGHT */}
                    <div className="form-group">
                        <label>Net Weight (Calculated)</label>
                        <input
                            type="text"
                            value={`${netWeight.toFixed(2)} KG`}
                            readOnly
                            style={{ background: "#f1f5f9", fontWeight: "bold", color: "#1e293b" }}
                        />
                    </div>

                    {/* COMMODITY */}
                    <div className="form-group">
                        <label>Commodity *</label>
                        <select
                            name="commodity"
                            value={form.commodity}
                            onChange={handleChange}
                            required
                        >
                            <option value="">Select commodity</option>
                            {commodities.map((c) => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>

                    {/* REMARKS */}
                    <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                        <label>Remarks</label>
                        <textarea
                            name="remarks"
                            value={form.remarks}
                            onChange={handleChange}
                            placeholder="Customer name, destination, or dispatch notes"
                            rows="2"
                        />
                    </div>

                    {/* BUTTONS */}
                    <div style={{ gridColumn: "1 / -1", display: "flex", gap: "10px", flexWrap: "wrap" }}>
                        <button
                            type="submit"
                            className="primary-button"
                            disabled={saving}
                        >
                            {saving ? "Saving..." : editingId ? "Update Sales Entry" : "Save Sales Entry"}
                        </button>

                        <button
                            type="button"
                            className="secondary-button"
                            onClick={clearForm}
                            disabled={saving}
                        >
                            Clear
                        </button>
                    </div>

                </form>
            </div>

            {/* SUMMARY CARDS */}
            <div className="card" style={{ marginTop: "25px" }}>
                <div className="section-header">
                    <div>
                        <h2>Sales Summary</h2>
                        <p>Total finished goods outward metrics</p>
                    </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
                    <div style={{ padding: "20px", border: "1px solid #e5e7eb", borderRadius: "10px", background: "#f8fafc" }}>
                        <div style={{ color: "#6b7280", fontSize: "13px", marginBottom: "8px" }}>Total Outward Dispatches</div>
                        <strong style={{ fontSize: "26px", color: "#1f2937" }}>{filteredSales.length}</strong>
                    </div>

                    <div style={{ padding: "20px", border: "1px solid #e5e7eb", borderRadius: "10px", background: "#f8fafc" }}>
                        <div style={{ color: "#6b7280", fontSize: "13px", marginBottom: "8px" }}>Total Net Dispatched Weight</div>
                        <strong style={{ fontSize: "26px", color: "#1f2937" }}>
                            {totalSalesWeight.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
                            <span style={{ fontSize: "14px", fontWeight: "600" }}>KG</span>
                            <span style={{ fontSize: "13px", color: "#64748b", marginLeft: "6px" }}>
                                ({(totalSalesWeight / 1000).toFixed(2)} MT)
                            </span>
                        </strong>
                    </div>
                </div>
            </div>

            {/* SALES TABLE */}
            <div className="card" style={{ marginTop: "25px" }}>
                <div className="section-header" style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
                    <div>
                        <h2>Sales Records ({filteredSales.length})</h2>
                        <p>All finished goods dispatch entries</p>
                    </div>

                    <div style={{ minWidth: "260px" }}>
                        <input
                            type="text"
                            placeholder="Search sales..."
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
                                <th>Vehicle No</th>
                                <th>Gross (KG)</th>
                                <th>Tare (KG)</th>
                                <th>Net (KG)</th>
                                <th>Commodity</th>
                                <th>Remarks</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredSales.length === 0 ? (
                                <tr>
                                    <td colSpan="8" style={{ textAlign: "center", padding: "30px", color: "#64748b" }}>
                                        No sales records found.
                                    </td>
                                </tr>
                            ) : (
                                filteredSales.map((s) => {
                                    const net = s.netWeight != null ? s.netWeight : (s.grossWeight && s.tareWeight ? s.grossWeight - s.tareWeight : 0);
                                    return (
                                        <tr key={s.id}>
                                            <td>{s.date}</td>
                                            <td><strong>{s.vehicleNo}</strong></td>
                                            <td>{Number(s.grossWeight || 0).toLocaleString()}</td>
                                            <td>{Number(s.tareWeight || 0).toLocaleString()}</td>
                                            <td><strong style={{ color: "#0369a1" }}>{Number(net).toLocaleString()} KG</strong></td>
                                            <td>{s.commodity}</td>
                                            <td>{s.remarks || "-"}</td>
                                            <td>
                                                <div style={{ display: "flex", gap: "6px" }}>
                                                    <button
                                                        type="button"
                                                        onClick={() => startEdit(s)}
                                                        style={{ padding: "4px 8px", fontSize: "11px", background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: "5px", cursor: "pointer" }}
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => deleteSale(s.id)}
                                                        style={{ padding: "4px 8px", fontSize: "11px", background: "#fee2e2", border: "1px solid #fca5a5", color: "#b91c1c", borderRadius: "5px", cursor: "pointer" }}
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

            </div>

        </div>
    );
}

export default SalesRegister;
