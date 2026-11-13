import { useEffect, useState, useMemo } from "react";
import api from "../api";

function Suppliers() {
    const currentUser = (() => { try { return JSON.parse(localStorage.getItem("dhmUser") || sessionStorage.getItem("dhmUser") || "{}"); } catch { return {}; } })();
    const isClient = currentUser?.role === "CLIENT";
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const [search, setSearch] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);

    // Statement Modal state
    const [statementLoading, setStatementLoading] = useState(false);
    const [statementData, setStatementData] = useState(null);

    const [form, setForm] = useState({
        supplierCode: "",
        name: "",
        phone: "",
        email: "",
        address: "",
        gstin: "",
        status: "ACTIVE"
    });

    useEffect(() => {
        loadSuppliers();
    }, []);

    async function loadSuppliers() {
        try {
            setLoading(true);
            setError("");
            const res = await api.get("/api/suppliers");
            setSuppliers(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error("Suppliers error:", err);
            setError("Unable to load suppliers.");
        } finally {
            setLoading(false);
        }
    }

    function handleChange(e) {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    }

    function openAddModal() {
        setEditingId(null);
        setForm({
            supplierCode: "",
            name: "",
            phone: "",
            email: "",
            address: "",
            gstin: "",
            status: "ACTIVE"
        });
        setError("");
        setSuccess("");
        setShowModal(true);
    }

    function openEditModal(s) {
        setEditingId(s.id);
        setForm({
            supplierCode: s.supplierCode || "",
            name: s.name || "",
            phone: s.phone || "",
            email: s.email || "",
            address: s.address || "",
            gstin: s.gstin || "",
            status: s.status || "ACTIVE"
        });
        setError("");
        setSuccess("");
        setShowModal(true);
    }

    async function viewStatement(s) {
        try {
            setStatementLoading(true);
            const res = await api.get(`/api/suppliers/${s.id}/statement`);
            setStatementData(res.data);
        } catch (err) {
            console.error("Statement loading error:", err);
            alert("Unable to load supplier statement.");
        } finally {
            setStatementLoading(false);
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (!form.name.trim()) {
            setError("Please enter supplier name.");
            return;
        }

        try {
            setSaving(true);
            if (editingId) {
                await api.put(`/api/suppliers/${editingId}`, form);
                setSuccess(`Supplier "${form.name}" updated successfully.`);
            } else {
                await api.post("/api/suppliers", form);
                setSuccess(`Supplier "${form.name}" registered successfully.`);
            }

            setShowModal(false);
            await loadSuppliers();
        } catch (err) {
            console.error("Save supplier error:", err);
            setError("Unable to save supplier details.");
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(id, name) {
        if (!window.confirm(`Are you sure you want to delete supplier "${name}"?`)) return;

        try {
            setLoading(true);
            await api.delete(`/api/suppliers/${id}`);
            setSuccess("Supplier deleted successfully.");
            await loadSuppliers();
        } catch (err) {
            setError("Unable to delete supplier.");
        } finally {
            setLoading(false);
        }
    }

    const filtered = useMemo(() => {
        const q = search.toLowerCase().trim();
        if (!q) return suppliers;
        return suppliers.filter(s =>
            String(s.name || "").toLowerCase().includes(q) ||
            String(s.supplierCode || "").toLowerCase().includes(q) ||
            String(s.phone || "").toLowerCase().includes(q) ||
            String(s.gstin || "").toLowerCase().includes(q)
        );
    }, [suppliers, search]);

    return (
        <div className="suppliers-page" style={{ paddingBottom: "40px" }}>

            {/* HEADER */}
            <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: "24px", color: "#1e3a8a", fontWeight: "800" }}>
                        SUPPLIER MANAGEMENT
                    </h1>
                    <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "14px" }}>
                        Raw material vendors, scrap tyre suppliers, GSTIN particulars, and purchase payment ledger.
                    </p>
                </div>

                <div style={{ display: "flex", gap: "10px" }}>
                    <button type="button" onClick={loadSuppliers} disabled={loading || saving} style={{ padding: "8px 14px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "6px", cursor: "pointer", fontSize: "13px" }}>
                        {loading ? "Loading..." : "↻ Refresh"}
                    </button>
                    {!isClient && <button type="button" onClick={openAddModal} style={{ padding: "8px 18px", background: "#7e22ce", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: "700" }}>
                        + Add Supplier
                    </button>}
                </div>
            </div>

            {success && (
                <div style={{ padding: "12px 16px", background: "#ecfdf5", border: "1px solid #a7f3d0", color: "#065f46", borderRadius: "8px", marginBottom: "16px" }}>
                    ✓ {success}
                </div>
            )}
            {error && (
                <div style={{ padding: "12px 16px", background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", borderRadius: "8px", marginBottom: "16px" }}>
                    ⚠ {error}
                </div>
            )}

            {/* SUPPLIERS TABLE */}
            <div className="card" style={{ padding: "20px", background: "#fff", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: "18px", color: "#0f172a", fontWeight: "700" }}>
                            Registered Suppliers ({filtered.length})
                        </h2>
                        <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748b" }}>
                            Click "Statement" to inspect purchase receipt history and pending payments
                        </p>
                    </div>

                    <div style={{ minWidth: "260px" }}>
                        <input
                            type="text"
                            placeholder="ðŸ” Search supplier, code, phone, GSTIN..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                        />
                    </div>
                </div>

                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
                        <thead>
                            <tr style={{ background: "#f8fafc", borderBottom: "1px solid #cbd5e1", color: "#334155", fontWeight: "700" }}>
                                <th style={{ padding: "10px 14px" }}>Code</th>
                                <th style={{ padding: "10px 14px" }}>Supplier / Firm Name</th>
                                <th style={{ padding: "10px 14px" }}>Contact Phone</th>
                                <th style={{ padding: "10px 14px" }}>Email</th>
                                <th style={{ padding: "10px 14px" }}>GSTIN</th>
                                <th style={{ padding: "10px 14px" }}>Status</th>
                                <th style={{ padding: "10px 14px", textAlign: "center" }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: "center", padding: "28px", color: "#64748b" }}>
                                        {loading ? "Loading supplier directory..." : "No suppliers registered. Click '+ Add Supplier' to record a vendor."}
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((s) => (
                                    <tr key={s.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                        <td style={{ padding: "10px 14px", fontWeight: "700", color: "#7e22ce" }}>{s.supplierCode}</td>
                                        <td style={{ padding: "10px 14px", fontWeight: "600", color: "#1e293b" }}>{s.name}</td>
                                        <td style={{ padding: "10px 14px", color: "#475569" }}>{s.phone || "—"}</td>
                                        <td style={{ padding: "10px 14px", color: "#475569" }}>{s.email || "—"}</td>
                                        <td style={{ padding: "10px 14px", color: "#475569" }}>{s.gstin || "—"}</td>
                                        <td style={{ padding: "10px 14px" }}>
                                            <span style={{
                                                fontSize: "11px",
                                                padding: "3px 8px",
                                                borderRadius: "10px",
                                                fontWeight: "600",
                                                background: s.status === "ACTIVE" ? "#dcfce7" : "#f1f5f9",
                                                color: s.status === "ACTIVE" ? "#15803d" : "#64748b"
                                            }}>
                                                ● {s.status}
                                            </span>
                                        </td>
                                        <td style={{ padding: "10px 14px", textAlign: "center" }}>
                                            <div style={{ display: "inline-flex", gap: "6px" }}>
                                                <button
                                                    type="button"
                                                    onClick={() => viewStatement(s)}
                                                    title="View Purchase History & Pending Balances"
                                                    style={{ padding: "4px 8px", fontSize: "11px", background: "#faf5ff", border: "1px solid #e9d5ff", color: "#6b21a8", borderRadius: "4px", cursor: "pointer", fontWeight: "600" }}
                                                >
                                                {!isClient && <button
                                                    type="button"
                                                    onClick={() => openEditModal(s)}
                                                    style={{ padding: "4px 8px", fontSize: "11px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "4px", cursor: "pointer" }}
                                                >
                                                    Edit
                                                </button>}
                                                {!isClient && <button
                                                    type="button"
                                                    onClick={() => handleDelete(s.id, s.name)}
                                                    style={{ padding: "4px 8px", fontSize: "11px", background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", borderRadius: "4px", cursor: "pointer" }}
                                                >
                                                    Delete
                                                </button>}
                                                    ✕
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

            {/* STATEMENT & PURCHASE ORDER HISTORY MODAL */}
            {statementData && (
                <div style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: "rgba(15, 23, 42, 0.75)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 9999,
                    padding: "20px"
                }}>
                    <div style={{
                        background: "#fff",
                        borderRadius: "12px",
                        maxWidth: "850px",
                        width: "100%",
                        padding: "24px",
                        maxHeight: "85vh",
                        overflowY: "auto"
                    }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid #e2e8f0", paddingBottom: "12px", marginBottom: "16px" }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: "18px", color: "#1e3a8a", fontWeight: "800" }}>
                                    Supplier Statement: {statementData.supplier?.name}
                                </h2>
                                <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748b" }}>
                                    Code: {statementData.supplier?.supplierCode} | Phone: {statementData.supplier?.phone || "—"} | GSTIN: {statementData.supplier?.gstin || "—"}
                                </p>
                            </div>
                            <button
                                onClick={() => setStatementData(null)}
                                style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#94a3b8" }}
                            >
                                ✕
                            </button>
                        </div>

                        {/* BALANCE KPI CARDS */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginBottom: "20px" }}>
                            <div style={{ padding: "12px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                                <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase" }}>TOTAL PURCHASE EXPENSE</span>
                                <div style={{ fontSize: "18px", fontWeight: "800", color: "#7e22ce", marginTop: "2px" }}>
                                    ₹{Number(statementData.totalPurchasesAmount || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                                </div>
                                <small style={{ color: "#64748b", fontSize: "11px" }}>{statementData.totalPurchasesCount} Purchase Orders</small>
                            </div>

                            <div style={{ padding: "12px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                                <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase" }}>TOTAL PAID TO SUPPLIER</span>
                                <div style={{ fontSize: "18px", fontWeight: "800", color: "#0284c7", marginTop: "2px" }}>
                                    ₹{Number(statementData.totalPaidAmount || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                                </div>
                            </div>

                            <div style={{ padding: "12px", background: "#fef2f2", borderRadius: "8px", border: "1px solid #fecaca" }}>
                                <span style={{ fontSize: "11px", color: "#991b1b", textTransform: "uppercase", fontWeight: "700" }}>OUTSTANDING PAYABLE</span>
                                <div style={{ fontSize: "18px", fontWeight: "800", color: "#dc2626", marginTop: "2px" }}>
                                    ₹{Number(statementData.outstandingBalance || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                                </div>
                            </div>
                        </div>

                        {/* PURCHASE HISTORY TABLE */}
                        <h3 style={{ fontSize: "14px", color: "#0f172a", marginBottom: "8px" }}>Purchase Order & Inward History</h3>
                        <div style={{ overflowX: "auto", marginBottom: "16px" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", textAlign: "left" }}>
                                <thead>
                                    <tr style={{ background: "#f8fafc", borderBottom: "1px solid #cbd5e1" }}>
                                        <th style={{ padding: "6px 8px" }}>Date</th>
                                        <th style={{ padding: "6px 8px" }}>PO No</th>
                                        <th style={{ padding: "6px 8px" }}>Vehicle</th>
                                        <th style={{ padding: "6px 8px" }}>Commodity</th>
                                        <th style={{ padding: "6px 8px" }}>Net Weight</th>
                                        <th style={{ padding: "6px 8px" }}>Grand Total</th>
                                        <th style={{ padding: "6px 8px" }}>Payment</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(!statementData.purchases || statementData.purchases.length === 0) ? (
                                        <tr>
                                            <td colSpan="7" style={{ padding: "14px", textAlign: "center", color: "#64748b" }}>
                                                No purchase orders recorded for this supplier.
                                            </td>
                                        </tr>
                                    ) : (
                                        statementData.purchases.map(p => (
                                            <tr key={p.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                                <td style={{ padding: "6px 8px" }}>{p.date}</td>
                                                <td style={{ padding: "6px 8px", fontWeight: "600", color: "#7e22ce" }}>{p.purchaseOrderNo}</td>
                                                <td style={{ padding: "6px 8px" }}>{p.vehicleNo}</td>
                                                <td style={{ padding: "6px 8px" }}>{p.commodity}</td>
                                                <td style={{ padding: "6px 8px" }}>{Number(p.netWeight || 0).toLocaleString()} KG</td>
                                                <td style={{ padding: "6px 8px", fontWeight: "700" }}>₹{Number(p.grandTotal || 0).toLocaleString()}</td>
                                                <td style={{ padding: "6px 8px" }}>{p.paymentStatus}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px" }}>
                            <button
                                onClick={() => window.print()}
                                style={{ padding: "6px 16px", background: "#1e3a8a", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: "600" }}
                            >
                                ðŸ–¨ Print Statement
                            </button>
                            <button
                                onClick={() => setStatementData(null)}
                                style={{ padding: "6px 16px", background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: "6px", cursor: "pointer", fontSize: "12px" }}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ADD / EDIT SUPPLIER MODAL */}
            {showModal && (
                <div style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: "rgba(10, 25, 41, 0.75)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 9999,
                    padding: "16px"
                }}>
                    <div style={{
                        background: "white",
                        borderRadius: "12px",
                        width: "100%",
                        maxWidth: "560px",
                        padding: "24px",
                        boxShadow: "0 20px 40px rgba(0,0,0,0.3)"
                    }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                            <h3 style={{ margin: 0, color: "#1e3a8a", fontSize: "18px" }}>
                                {editingId ? "Edit Supplier Details" : "Register New Supplier"}
                            </h3>
                            <button
                                onClick={() => setShowModal(false)}
                                style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#94a3b8" }}
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                                <div>
                                    <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px", color: "#334155" }}>
                                        Supplier / Firm Name *
                                    </label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={form.name}
                                        onChange={handleChange}
                                        placeholder="Vendor or scrap merchant name"
                                        required
                                        style={{ width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "14px" }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px", color: "#334155" }}>
                                        Contact Phone
                                    </label>
                                    <input
                                        type="text"
                                        name="phone"
                                        value={form.phone}
                                        onChange={handleChange}
                                        placeholder="+91 9876543210"
                                        style={{ width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "14px" }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                                <div>
                                    <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px", color: "#334155" }}>
                                        Email Address
                                    </label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={form.email}
                                        onChange={handleChange}
                                        placeholder="vendor@company.com"
                                        style={{ width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "14px" }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px", color: "#334155" }}>
                                        GSTIN Tax Number
                                    </label>
                                    <input
                                        type="text"
                                        name="gstin"
                                        value={form.gstin}
                                        onChange={handleChange}
                                        placeholder="e.g. 27ABCDE1234F1Z5"
                                        style={{ width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "14px", textTransform: "uppercase" }}
                                    />
                                </div>
                            </div>

                            <div style={{ marginBottom: "12px" }}>
                                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px", color: "#334155" }}>
                                    Vendor Status
                                </label>
                                <select
                                    name="status"
                                    value={form.status}
                                    onChange={handleChange}
                                    style={{ width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "14px" }}
                                >
                                    <option value="ACTIVE">ACTIVE</option>
                                    <option value="INACTIVE">INACTIVE</option>
                                </select>
                            </div>

                            <div style={{ marginBottom: "16px" }}>
                                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px", color: "#334155" }}>
                                    Supplier Yard / Office Address
                                </label>
                                <textarea
                                    name="address"
                                    value={form.address}
                                    onChange={handleChange}
                                    placeholder="Warehouse, scrap yard or billing address"
                                    rows="2"
                                    style={{ width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "14px" }}
                                />
                            </div>

                            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    disabled={saving}
                                    style={{ padding: "8px 16px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer" }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving || isClient}
                                    style={{ padding: "8px 20px", borderRadius: "6px", border: "none", background: isClient ? "#94a3b8" : "#7e22ce", color: "#fff", fontWeight: "700", cursor: isClient ? "not-allowed" : "pointer" }}
                                >
                                    {isClient ? "Read-only Access" : (saving ? "Saving..." : editingId ? "Update Supplier" : "Save Supplier")}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}

export default Suppliers;
