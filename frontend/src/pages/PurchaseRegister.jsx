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

function getEmptyForm() {
    return {
        date: getTodayDate(),
        vehicleNo: "",
        grossWeight: "",
        tareWeight: "",
        netWeight: "",
        commodity: "",
        remarks: ""
    };
}

function PurchaseRegister() {
    const [purchases, setPurchases] = useState([]);
    const [form, setForm] = useState(getEmptyForm());
    const [search, setSearch] = useState("");
    const [editingId, setEditingId] = useState(null);

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    // =========================
    // LOAD PURCHASES
    // =========================
    async function loadPurchases() {
        try {
            setLoading(true);
            setError("");

            const response = await api.get("/api/purchases");

            if (Array.isArray(response.data)) {
                setPurchases(response.data);
            } else {
                setPurchases([]);
                setError("Unable to load purchase records.");
            }
        } catch (err) {
            console.error("Purchase loading error:", err);
            setPurchases([]);
            if (err.response?.status === 403) {
                setError("You do not have permission to view purchase records.");
            } else {
                setError("Unable to connect to the backend server.");
            }
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadPurchases();
    }, []);

    // =========================
    // HANDLE INPUT
    // =========================
    function handleChange(event) {
        const { name, value } = event.target;
        setForm((prev) => {
            const updated = { ...prev, [name]: value };
            if (name === "grossWeight" || name === "tareWeight") {
                const g = Number(name === "grossWeight" ? value : updated.grossWeight) || 0;
                const t = Number(name === "tareWeight" ? value : updated.tareWeight) || 0;
                if (g > 0 && t >= 0 && g >= t) {
                    updated.netWeight = (g - t).toFixed(2);
                }
            }
            return updated;
        });
    }

    function clearForm() {
        setForm(getEmptyForm());
        setEditingId(null);
        setError("");
        setSuccess("");
    }

    // =========================
    // SAVE / UPDATE
    // =========================
    async function handleSubmit(event) {
        event.preventDefault();
        setError("");
        setSuccess("");

        if (!form.date) {
            setError("Please select a date.");
            return;
        }

        const gross = Number(form.grossWeight) || null;
        const tare = Number(form.tareWeight) || null;
        let net = Number(form.netWeight) || null;

        if (gross && tare) {
            if (tare >= gross) {
                setError("Tare weight must be less than gross weight.");
                return;
            }
            net = gross - tare;
        } else if (!net || net <= 0) {
            setError("Please enter valid weights.");
            return;
        }

        if (!form.commodity) {
            setError("Please select a commodity.");
            return;
        }

        const payload = {
            date: form.date,
            vehicleNo: form.vehicleNo ? form.vehicleNo.trim().toUpperCase() : null,
            grossWeight: gross,
            tareWeight: tare,
            netWeight: net,
            commodity: form.commodity,
            remarks: form.remarks.trim()
        };

        try {
            setSaving(true);

            if (editingId) {
                await api.put(`/api/purchases/${editingId}`, payload);
                setSuccess("Purchase entry updated successfully.");
            } else {
                await api.post("/api/purchases", payload);
                setSuccess("Purchase entry recorded successfully.");
            }

            clearForm();
            await loadPurchases();
        } catch (err) {
            console.error("Purchase save error:", err);
            if (err.response?.status === 403) {
                setError("Supervisor cannot edit previous-day records.");
            } else {
                setError(err.response?.data?.message || typeof err.response?.data === "string" ? err.response.data : "Unable to save purchase entry.");
            }
        } finally {
            setSaving(false);
        }
    }

    // =========================
    // EDIT
    // =========================
    function startEdit(p) {
        setEditingId(p.id);
        const gross = p.grossWeight != null ? p.grossWeight : "";
        const tare = p.tareWeight != null ? p.tareWeight : "";
        const net = p.netWeight != null ? p.netWeight : (gross && tare ? gross - tare : "");

        setForm({
            date: p.date || getTodayDate(),
            vehicleNo: p.vehicleNo || "",
            grossWeight: gross,
            tareWeight: tare,
            netWeight: net,
            commodity: p.commodity || "",
            remarks: p.remarks || ""
        });

        setError("");
        setSuccess("");
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    // =========================
    // DELETE
    // =========================
    async function deletePurchase(id) {
        if (!window.confirm("Are you sure you want to delete this purchase entry?")) {
            return;
        }

        try {
            setLoading(true);
            setError("");
            setSuccess("");

            await api.delete(`/api/purchases/${id}`);
            setSuccess("Purchase entry deleted successfully.");
            await loadPurchases();
        } catch (err) {
            console.error("Delete purchase error:", err);
            if (err.response?.status === 403) {
                setError("Supervisor cannot delete previous-day records.");
            } else {
                setError("Unable to delete purchase entry.");
            }
        } finally {
            setLoading(false);
        }
    }

    // =========================
    // SEARCH FILTER
    // =========================
    const filteredPurchases = useMemo(() => {
        const query = search.toLowerCase().trim();
        if (!query) return purchases;

        return purchases.filter((p) =>
            String(p.date || "").toLowerCase().includes(query) ||
            String(p.vehicleNo || "").toLowerCase().includes(query) ||
            String(p.commodity || "").toLowerCase().includes(query) ||
            String(p.remarks || "").toLowerCase().includes(query) ||
            String(p.netWeight || "").toLowerCase().includes(query)
        );
    }, [purchases, search]);

    const totalNetWeight = filteredPurchases.reduce((sum, p) => {
        const val = p.netWeight != null ? Number(p.netWeight) : (p.grossWeight && p.tareWeight ? Number(p.grossWeight) - Number(p.tareWeight) : 0);
        return sum + val;
    }, 0);

    return (
        <div className="vehicle-page">

            {/* PAGE HEADER */}
            <div className="page-header">
                <div>
                    <h1>PURCHASE REGISTER</h1>
                    <p>Raw Material Inwards & Weighbridge Deliveries</p>
                </div>

                <button
                    type="button"
                    className="secondary-button"
                    onClick={loadPurchases}
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
                        <h2>{editingId ? "Edit Purchase Entry" : "New Inward Purchase Entry"}</h2>
                        <p>Record raw material delivery details and weights</p>
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
                        <label>Vehicle Number</label>
                        <input
                            type="text"
                            name="vehicleNo"
                            value={form.vehicleNo}
                            onChange={handleChange}
                            placeholder="e.g. MH 12 CD 5678"
                        />
                    </div>

                    {/* GROSS WEIGHT */}
                    <div className="form-group">
                        <label>Gross Weight (KG)</label>
                        <input
                            type="number"
                            name="grossWeight"
                            value={form.grossWeight}
                            onChange={handleChange}
                            placeholder="Gross weight"
                            min="0"
                            step="0.01"
                        />
                    </div>

                    {/* TARE WEIGHT */}
                    <div className="form-group">
                        <label>Tare Weight (KG)</label>
                        <input
                            type="number"
                            name="tareWeight"
                            value={form.tareWeight}
                            onChange={handleChange}
                            placeholder="Tare weight"
                            min="0"
                            step="0.01"
                        />
                    </div>

                    {/* NET WEIGHT */}
                    <div className="form-group">
                        <label>Net Weight (KG) *</label>
                        <input
                            type="number"
                            name="netWeight"
                            value={form.netWeight}
                            onChange={handleChange}
                            placeholder="Net weight"
                            min="0"
                            step="0.01"
                            required
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
                            placeholder="Supplier name, delivery memo, or notes"
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
                            {saving ? "Saving..." : editingId ? "Update Purchase" : "Save Purchase Entry"}
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
                        <h2>Purchase Summary</h2>
                        <p>Total raw material inward metrics</p>
                    </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
                    <div style={{ padding: "20px", border: "1px solid #e5e7eb", borderRadius: "10px", background: "#f8fafc" }}>
                        <div style={{ color: "#6b7280", fontSize: "13px", marginBottom: "8px" }}>Total Inward Entries</div>
                        <strong style={{ fontSize: "26px", color: "#1f2937" }}>{filteredPurchases.length}</strong>
                    </div>

                    <div style={{ padding: "20px", border: "1px solid #e5e7eb", borderRadius: "10px", background: "#f8fafc" }}>
                        <div style={{ color: "#6b7280", fontSize: "13px", marginBottom: "8px" }}>Total Net Weight</div>
                        <strong style={{ fontSize: "26px", color: "#1f2937" }}>
                            {totalNetWeight.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
                            <span style={{ fontSize: "14px", fontWeight: "600" }}>KG</span>
                            <span style={{ fontSize: "13px", color: "#64748b", marginLeft: "6px" }}>
                                ({(totalNetWeight / 1000).toFixed(2)} MT)
                            </span>
                        </strong>
                    </div>
                </div>
            </div>

            {/* PURCHASES TABLE */}
            <div className="card" style={{ marginTop: "25px" }}>
                <div className="section-header" style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
                    <div>
                        <h2>Purchase Records ({filteredPurchases.length})</h2>
                        <p>Raw material inward entries</p>
                    </div>

                    <div style={{ minWidth: "260px" }}>
                        <input
                            type="text"
                            placeholder="Search purchases..."
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
                            {filteredPurchases.length === 0 ? (
                                <tr>
                                    <td colSpan="8" style={{ textAlign: "center", padding: "30px", color: "#64748b" }}>
                                        No purchase records found.
                                    </td>
                                </tr>
                            ) : (
                                filteredPurchases.map((p) => {
                                    const net = p.netWeight != null ? p.netWeight : (p.grossWeight && p.tareWeight ? p.grossWeight - p.tareWeight : 0);
                                    return (
                                        <tr key={p.id}>
                                            <td>{p.date}</td>
                                            <td><strong>{p.vehicleNo || "-"}</strong></td>
                                            <td>{p.grossWeight != null ? Number(p.grossWeight).toLocaleString() : "-"}</td>
                                            <td>{p.tareWeight != null ? Number(p.tareWeight).toLocaleString() : "-"}</td>
                                            <td><strong style={{ color: "#0f766e" }}>{Number(net).toLocaleString()} KG</strong></td>
                                            <td>{p.commodity}</td>
                                            <td>{p.remarks || "-"}</td>
                                            <td>
                                                <div style={{ display: "flex", gap: "6px" }}>
                                                    <button
                                                        type="button"
                                                        onClick={() => startEdit(p)}
                                                        style={{ padding: "4px 8px", fontSize: "11px", background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: "5px", cursor: "pointer" }}
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => deletePurchase(p.id)}
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

export default PurchaseRegister;
