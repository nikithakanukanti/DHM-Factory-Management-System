import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import api from "../api";

function getTodayDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

const commodities = [
    "Local Waste Rubber Tyre",
    "Imported Waste Rubber Tyre",
    "Metal Steel Scrap",
    "Carbon Black Powder",
    "Fuel Oil"
];

function VehicleRegister() {
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [lastSavedType, setLastSavedType] = useState(null);

    const [search, setSearch] = useState("");
    const [editingId, setEditingId] = useState(null);

    const [form, setForm] = useState({
        date: getTodayDate(),
        vehicleNo: "",
        grossWeight: "",
        tareWeight: "",
        local: false,
        imported: false,
        commodity: "",
        remarks: "",
        registerType: "SALES"
    });

    useEffect(() => {
        loadVehicles();
    }, []);

    // =========================
    // LOAD VEHICLES
    // =========================
    async function loadVehicles() {
        try {
            setLoading(true);
            setError("");

            const response = await api.get("/api/vehicles");

            if (Array.isArray(response.data)) {
                setVehicles(response.data);
            } else {
                setVehicles([]);
                setError("Unable to load vehicle records.");
            }
        } catch (err) {
            console.error("Vehicle loading error:", err);
            setVehicles([]);
            if (err.response?.status === 403) {
                setError("You do not have permission to view vehicles.");
            } else {
                setError("Unable to connect to the backend server.");
            }
        } finally {
            setLoading(false);
        }
    }

    // =========================
    // HANDLE INPUT
    // =========================
    function handleChange(e) {
        const { name, value, type, checked } = e.target;
        setForm((previous) => ({
            ...previous,
            [name]: type === "checkbox" ? checked : value
        }));
    }

    function handleLocalChange(e) {
        const checked = e.target.checked;
        setForm((previous) => ({
            ...previous,
            local: checked,
            imported: checked ? false : previous.imported
        }));
    }

    function handleImportedChange(e) {
        const checked = e.target.checked;
        setForm((previous) => ({
            ...previous,
            imported: checked,
            local: checked ? false : previous.local
        }));
    }

    function getNetWeight() {
        const gross = Number(form.grossWeight) || 0;
        const tare = Number(form.tareWeight) || 0;
        return Math.max(gross - tare, 0);
    }

    function resetForm() {
        setForm({
            date: getTodayDate(),
            vehicleNo: "",
            grossWeight: "",
            tareWeight: "",
            local: false,
            imported: false,
            commodity: "",
            remarks: "",
            registerType: "SALES"
        });
        setEditingId(null);
    }

    // =========================
    // SAVE / UPDATE VEHICLE
    // =========================
    async function handleSubmit(event) {
        event.preventDefault();
        setError("");
        setSuccess("");
        setLastSavedType(null);

        if (!form.date) {
            setError("Please select a date.");
            return;
        }

        if (!form.vehicleNo.trim()) {
            setError("Please enter vehicle number.");
            return;
        }

        const gross = Number(form.grossWeight);
        const tare = Number(form.tareWeight);

        if (!gross || gross <= 0) {
            setError("Please enter a valid gross weight.");
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

        if (!form.registerType) {
            setError("Please select Sales Register or Purchase Register.");
            return;
        }

        const vehiclePayload = {
            date: form.date,
            vehicleNo: form.vehicleNo.trim().toUpperCase(),
            grossWeight: gross,
            tareWeight: tare,
            local: Boolean(form.local),
            imported: Boolean(form.imported),
            commodity: form.commodity,
            remarks: form.remarks.trim(),
            registerType: form.registerType
        };

        try {
            setSaving(true);

            if (editingId) {
                await api.put(`/api/vehicles/${editingId}`, vehiclePayload);
                setSuccess(`Vehicle ${vehiclePayload.vehicleNo} updated and synchronized with ${form.registerType === "SALES" ? "Sales" : "Purchase"} Register.`);
            } else {
                await api.post("/api/vehicles", vehiclePayload);
                setSuccess(`Vehicle ${vehiclePayload.vehicleNo} logged successfully and synchronized with ${form.registerType === "SALES" ? "Sales" : "Purchase"} Register.`);
                setLastSavedType(form.registerType);
            }

            resetForm();
            await loadVehicles();

        } catch (err) {
            console.error("Vehicle save error:", err);
            if (err.response?.data?.message) {
                setError(err.response.data.message);
            } else if (typeof err.response?.data === "string") {
                setError(err.response.data);
            } else if (err.response?.status === 403) {
                setError("You do not have permission to modify this record.");
            } else {
                setError("Unable to save vehicle entry. Please try again.");
            }
        } finally {
            setSaving(false);
        }
    }

    // =========================
    // EDIT
    // =========================
    function startEdit(vehicle) {
        setEditingId(vehicle.id);
        setForm({
            date: vehicle.date || getTodayDate(),
            vehicleNo: vehicle.vehicleNo || "",
            grossWeight: vehicle.grossWeight ?? "",
            tareWeight: vehicle.tareWeight ?? "",
            local: Boolean(vehicle.local),
            imported: Boolean(vehicle.imported),
            commodity: vehicle.commodity || "",
            remarks: vehicle.remarks || "",
            registerType: vehicle.registerType || "SALES"
        });

        setError("");
        setSuccess("");
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    // =========================
    // DELETE
    // =========================
    async function deleteVehicle(id) {
        if (!window.confirm("Are you sure you want to delete this vehicle entry? Any synchronized Sales or Purchase record will also be removed.")) {
            return;
        }

        try {
            setLoading(true);
            setError("");
            setSuccess("");

            await api.delete(`/api/vehicles/${id}`);
            setSuccess("Vehicle and linked register records deleted successfully.");
            await loadVehicles();
        } catch (err) {
            console.error("Delete vehicle error:", err);
            if (err.response?.status === 403) {
                setError("Supervisor cannot delete previous-day records.");
            } else {
                setError("Unable to delete vehicle entry.");
            }
        } finally {
            setLoading(false);
        }
    }

    // =========================
    // FILTERED VEHICLES
    // =========================
    const filteredVehicles = useMemo(() => {
        const query = search.toLowerCase().trim();
        if (!query) return vehicles;

        return vehicles.filter(v =>
            String(v.date || "").toLowerCase().includes(query) ||
            String(v.vehicleNo || "").toLowerCase().includes(query) ||
            String(v.commodity || "").toLowerCase().includes(query) ||
            String(v.remarks || "").toLowerCase().includes(query) ||
            String(v.registerType || "").toLowerCase().includes(query)
        );
    }, [vehicles, search]);

    return (
        <div className="vehicle-page">

            {/* PAGE HEADER */}
            <div className="page-header">
                <div>
                    <h1>VEHICLE REGISTER</h1>
                    <p>Master Weighbridge Gate Log — Records auto-sync to Sales & Purchase</p>
                </div>

                <button
                    type="button"
                    className="secondary-button"
                    onClick={loadVehicles}
                    disabled={loading || saving}
                >
                    {loading ? "Loading..." : "Refresh"}
                </button>
            </div>

            {/* SUCCESS BANNER */}
            {success && (
                <div className="success-message" style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>✓ {success}</span>
                    {lastSavedType && (
                        <Link
                            to={lastSavedType === "SALES" ? "/sales-register" : "/purchase-register"}
                            style={{ color: "#15966c", fontWeight: "bold", textDecoration: "underline", marginLeft: "12px", fontSize: "13px" }}
                        >
                            View in {lastSavedType === "SALES" ? "Sales" : "Purchase"} Register →
                        </Link>
                    )}
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
                        <h2>{editingId ? "Edit Weighbridge Entry" : "New Vehicle Gate Entry"}</h2>
                        <p>Enter vehicle gross/tare weights and route to register</p>
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
                            placeholder="e.g. MH 04 AB 1234"
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
                            value={`${getNetWeight().toFixed(2)} KG`}
                            readOnly
                            style={{ background: "#f1f5f9", fontWeight: "bold", color: "#1e293b" }}
                        />
                    </div>

                    {/* REGISTER TYPE */}
                    <div className="form-group">
                        <label>Target Register *</label>
                        <select
                            name="registerType"
                            value={form.registerType}
                            onChange={handleChange}
                            required
                        >
                            <option value="SALES">Sales Register (Finished Goods Outward)</option>
                            <option value="PURCHASE">Purchase Register (Raw Material Inward)</option>
                        </select>
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

                    {/* LOCAL / IMPORTED CHECKBOXES */}
                    <div className="form-group" style={{ display: "flex", gap: "20px", alignItems: "center", marginTop: "24px" }}>
                        <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                            <input
                                type="checkbox"
                                name="local"
                                checked={form.local}
                                onChange={handleLocalChange}
                            />
                            Local
                        </label>
                        <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                            <input
                                type="checkbox"
                                name="imported"
                                checked={form.imported}
                                onChange={handleImportedChange}
                            />
                            Imported
                        </label>
                    </div>

                    {/* REMARKS */}
                    <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                        <label>Remarks</label>
                        <textarea
                            name="remarks"
                            value={form.remarks}
                            onChange={handleChange}
                            placeholder="Enter any vehicle, driver, or bill notes"
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
                            {saving ? "Saving..." : editingId ? "Update & Sync Vehicle" : "Save & Sync Vehicle"}
                        </button>

                        <button
                            type="button"
                            className="secondary-button"
                            onClick={() => { resetForm(); setError(""); setSuccess(""); }}
                            disabled={saving}
                        >
                            Clear
                        </button>
                    </div>

                </form>
            </div>

            {/* VEHICLE LOG ENTRIES TABLE */}
            <div className="card" style={{ marginTop: "25px" }}>
                <div className="section-header" style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
                    <div>
                        <h2>Weighbridge Records ({filteredVehicles.length})</h2>
                        <p>All recorded vehicle entries</p>
                    </div>

                    <div style={{ minWidth: "260px" }}>
                        <input
                            type="text"
                            placeholder="Search by vehicle no, commodity, date..."
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
                                <th>Register</th>
                                <th>Commodity</th>
                                <th>Type</th>
                                <th>Remarks</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredVehicles.length === 0 ? (
                                <tr>
                                    <td colSpan="10" style={{ textAlign: "center", padding: "30px", color: "#64748b" }}>
                                        No vehicle records found.
                                    </td>
                                </tr>
                            ) : (
                                filteredVehicles.map((v) => {
                                    const net = (v.grossWeight && v.tareWeight) ? (v.grossWeight - v.tareWeight) : 0;
                                    return (
                                        <tr key={v.id}>
                                            <td>{v.date}</td>
                                            <td><strong>{v.vehicleNo}</strong></td>
                                            <td>{Number(v.grossWeight || 0).toLocaleString()}</td>
                                            <td>{Number(v.tareWeight || 0).toLocaleString()}</td>
                                            <td><strong>{Number(net).toLocaleString()}</strong></td>
                                            <td>
                                                <span style={{
                                                    display: "inline-block",
                                                    padding: "3px 8px",
                                                    borderRadius: "6px",
                                                    fontSize: "11px",
                                                    fontWeight: "600",
                                                    background: v.registerType === "SALES" ? "#e0f2fe" : "#fef3c7",
                                                    color: v.registerType === "SALES" ? "#0369a1" : "#92400e"
                                                }}>
                                                    {v.registerType || "SALES"}
                                                </span>
                                            </td>
                                            <td>{v.commodity}</td>
                                            <td>{v.local ? "Local" : v.imported ? "Imported" : "-"}</td>
                                            <td>{v.remarks || "-"}</td>
                                            <td>
                                                <div style={{ display: "flex", gap: "6px" }}>
                                                    <button
                                                        type="button"
                                                        onClick={() => startEdit(v)}
                                                        style={{ padding: "4px 8px", fontSize: "11px", background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: "5px", cursor: "pointer" }}
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => deleteVehicle(v.id)}
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

export default VehicleRegister;
