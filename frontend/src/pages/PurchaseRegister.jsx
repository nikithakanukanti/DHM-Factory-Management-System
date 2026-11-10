import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
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
    purchaseOrderNo: "",
    supplierInvoiceNo: "",
    supplierId: "",
    supplierName: "",
    vehicleNo: "",
    vehicleId: "",
    grossWeight: "",
    tareWeight: "",
    commodity: "Local Waste Rubber Tyre",
    unitPrice: "18.50", // Rate per KG
    discount: "0.00",
    taxRate: "18.00",
    paidAmount: "0.00",
    paymentStatus: "PENDING",
    remarks: ""
};

function PurchaseRegister() {
    const [searchParams] = useSearchParams();
    const currentUser = (() => { try { return JSON.parse(localStorage.getItem("dhmUser") || sessionStorage.getItem("dhmUser") || "{}"); } catch { return {}; } })();
    const isClient = currentUser?.role === "CLIENT";
    const [purchases, setPurchases] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [form, setForm] = useState(emptyForm);
    const [search, setSearch] = useState("");
    const [paymentFilter, setPaymentFilter] = useState("ALL");
    const [dateFilter, setDateFilter] = useState("");
    const [editingId, setEditingId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [poModalPurchase, setPoModalPurchase] = useState(null);

    useEffect(() => {
        const vehicleId = searchParams.get("vehicleId");
        const vehicleNo = searchParams.get("vehicleNo");
        const date = searchParams.get("date");
        const supplierName = searchParams.get("partyName") || searchParams.get("supplierName");
        const commodity = searchParams.get("commodity");
        const grossWeight = searchParams.get("grossWeight");
        const tareWeight = searchParams.get("tareWeight");
        const q = searchParams.get("search");
        if (q) setSearch(q);
        if (vehicleId || vehicleNo || date || supplierName || commodity || grossWeight || tareWeight) {
            setForm(prev => ({
                ...prev,
                date: date || prev.date,
                vehicleNo: vehicleNo || prev.vehicleNo,
                supplierName: supplierName || prev.supplierName,
                commodity: commodity || prev.commodity,
                grossWeight: grossWeight || prev.grossWeight,
                tareWeight: tareWeight || prev.tareWeight,
                vehicleId: vehicleId || prev.vehicleId
            }));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function loadData() {
        try {
            setLoading(true);
            setError("");
            const [purRes, suppRes] = await Promise.allSettled([
                api.get("/api/purchases"),
                api.get("/api/suppliers")
            ]);

            if (purRes.status === "fulfilled") {
                setPurchases(Array.isArray(purRes.value.data) ? purRes.value.data : []);
            }
            if (suppRes.status === "fulfilled") {
                setSuppliers(Array.isArray(suppRes.value.data) ? suppRes.value.data : []);
            }
        } catch (err) {
            console.error("Purchase loading error:", err);
            setError("Unable to connect to backend server.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadData();
    }, []);

    function handleChange(event) {
        const { name, value } = event.target;
        setForm((prev) => {
            const updated = { ...prev, [name]: value };
            if (name === "supplierId") {
                const found = suppliers.find(s => String(s.id) === String(value));
                if (found) {
                    updated.supplierName = found.name;
                }
            }
            return updated;
        });
    }

    const gross = Number(form.grossWeight) || 0;
    const tare = Number(form.tareWeight) || 0;
    const netWeight = Math.max(gross - tare, 0);
    const unitPrice = Number(form.unitPrice) || 0;
    const discount = Number(form.discount) || 0;
    const taxRate = Number(form.taxRate) || 18;

    const subtotal = Math.max(netWeight * unitPrice - discount, 0);
    const taxAmount = (subtotal * taxRate) / 100;
    const grandTotal = subtotal + taxAmount;

    function resetForm() {
        setForm(emptyForm);
        setEditingId(null);
        setError("");
        setSuccess("");
    }

    async function handleSubmit(event) {
        event.preventDefault();
        setError("");
        setSuccess("");

        if (!form.date) {
            setError("Please select purchase date.");
            return;
        }

        if (gross <= 0) {
            setError("Gross weight must be greater than zero.");
            return;
        }

        if (tare < 0 || tare >= gross) {
            setError("Tare weight must be strictly less than Gross weight.");
            return;
        }

        if (!form.commodity) {
            setError("Please select commodity.");
            return;
        }

        const payload = {
            date: form.date,
            purchaseOrderNo: form.purchaseOrderNo?.trim() || null,
            supplierInvoiceNo: form.supplierInvoiceNo?.trim() || null,
            supplierId: form.supplierId ? Number(form.supplierId) : null,
            supplierName: form.supplierName?.trim() || null,
            vehicleNo: form.vehicleNo?.trim().toUpperCase() || "",
            vehicleId: form.vehicleId ? Number(form.vehicleId) : null,
            grossWeight: gross,
            tareWeight: tare,
            netWeight: netWeight,
            commodity: form.commodity,
            unitPrice: unitPrice,
            rate: unitPrice,
            quantity: netWeight,
            discount: discount,
            taxRate: taxRate,
            taxAmount: taxAmount,
            subtotal: subtotal,
            grandTotal: grandTotal,
            paidAmount: Number(form.paidAmount) || 0,
            paymentStatus: form.paymentStatus,
            remarks: form.remarks?.trim() || ""
        };

        try {
            setSaving(true);
            if (editingId) {
                await api.put(`/api/purchases/${editingId}`, payload);
                setSuccess(`Purchase PO "${form.purchaseOrderNo || editingId}" updated successfully.`);
            } else {
                const res = await api.post("/api/purchases", payload);
                setSuccess(`Purchase record "${res.data.purchaseOrderNo}" created successfully.`);
            }

            resetForm();
            await loadData();
        } catch (err) {
            console.error("Save purchase error:", err);
            setError(err.response?.data?.message || (typeof err.response?.data === "string" ? err.response.data : "Unable to save purchase record."));
        } finally {
            setSaving(false);
        }
    }

    function startEdit(p) {
        setEditingId(p.id);
        setForm({
            date: p.date || getTodayDate(),
            purchaseOrderNo: p.purchaseOrderNo || "",
            supplierInvoiceNo: p.supplierInvoiceNo || "",
            supplierId: p.supplierId ? String(p.supplierId) : "",
            supplierName: p.supplierName || "",
            vehicleNo: p.vehicleNo || "",
            vehicleId: p.vehicleId ? String(p.vehicleId) : "",
            grossWeight: p.grossWeight ?? "",
            tareWeight: p.tareWeight ?? "",
            commodity: p.commodity || "Local Waste Rubber Tyre",
            unitPrice: p.unitPrice ?? "18.50",
            discount: p.discount ?? "0.00",
            taxRate: p.taxRate ?? "18.00",
            paidAmount: p.paidAmount ?? "0.00",
            paymentStatus: p.paymentStatus || "PENDING",
            remarks: p.remarks || ""
        });

        setError("");
        setSuccess("");
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    async function handleDelete(id, poNo) {
        if (!window.confirm(`Delete purchase record "${poNo || id}"? This action cannot be undone.`)) {
            return;
        }

        try {
            setLoading(true);
            await api.delete(`/api/purchases/${id}`);
            setSuccess(`Purchase record deleted successfully.`);
            await loadData();
        } catch (err) {
            setError(err.response?.data || "Unable to delete purchase record.");
        } finally {
            setLoading(false);
        }
    }

    const filteredPurchases = useMemo(() => {
        const q = search.toLowerCase().trim();
        return purchases.filter(p => {
            const matchesQuery = !q ||
                String(p.purchaseOrderNo || "").toLowerCase().includes(q) ||
                String(p.supplierInvoiceNo || "").toLowerCase().includes(q) ||
                String(p.supplierName || "").toLowerCase().includes(q) ||
                String(p.vehicleNo || "").toLowerCase().includes(q) ||
                String(p.commodity || "").toLowerCase().includes(q);

            const matchesPayment = paymentFilter === "ALL" || p.paymentStatus === paymentFilter;
            const matchesDate = !dateFilter || p.date === dateFilter;

            return matchesQuery && matchesPayment && matchesDate;
        });
    }, [purchases, search, paymentFilter, dateFilter]);

    // Financial totals
    const totalTonnageKg = useMemo(() => {
        return filteredPurchases.reduce((acc, p) => acc + (Number(p.netWeight) || 0), 0);
    }, [filteredPurchases]);

    const totalGrandAmount = useMemo(() => {
        return filteredPurchases.reduce((acc, p) => acc + (Number(p.grandTotal) || 0), 0);
    }, [filteredPurchases]);

    const totalOutstanding = useMemo(() => {
        return filteredPurchases.reduce((acc, p) => {
            const g = Number(p.grandTotal) || 0;
            const pd = Number(p.paidAmount) || 0;
            return acc + Math.max(g - pd, 0);
        }, 0);
    }, [filteredPurchases]);

    return (
        <div className="purchase-page" style={{ paddingBottom: "40px" }}>

            {/* HEADER */}
            <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: "24px", color: "#1e3a8a", fontWeight: "800" }}>
                        PURCHASE INWARD REGISTER
                    </h1>
                    <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "14px" }}>
                        Raw material receipts (Local & Imported Scrap Tyres), automatic weight financial calculations & payment ledger.
                    </p>
                </div>

                <div style={{ display: "flex", gap: "10px" }}>
                    <button type="button" onClick={loadData} disabled={loading || saving} style={{ padding: "8px 14px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "6px", cursor: "pointer", fontSize: "13px" }}>
                        {loading ? "Loading..." : "â†» Refresh"}
                    </button>
                </div>
            </div>

            {/* SUMMARY STRIP */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px", marginBottom: "20px" }}>
                <div style={{ background: "#fff", padding: "14px 18px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                    <span style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>TOTAL INWARD WEIGHT</span>
                    <div style={{ fontSize: "20px", fontWeight: "800", color: "#0f172a", marginTop: "2px" }}>
                        {(totalTonnageKg / 1000).toFixed(2)} MT ({totalTonnageKg.toLocaleString()} KG)
                    </div>
                </div>

                <div style={{ background: "#fff", padding: "14px 18px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                    <span style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>TOTAL PURCHASE EXPENSE</span>
                    <div style={{ fontSize: "20px", fontWeight: "800", color: "#7e22ce", marginTop: "2px" }}>
                        â‚¹{totalGrandAmount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                    </div>
                </div>

                <div style={{ background: "#fff", padding: "14px 18px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                    <span style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>OUTSTANDING SUPPLIER BALANCE</span>
                    <div style={{ fontSize: "20px", fontWeight: "800", color: "#dc2626", marginTop: "2px" }}>
                        â‚¹{totalOutstanding.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                    </div>
                </div>
            </div>

            {/* NOTIFICATIONS */}
            {success && (
                <div style={{ padding: "12px 16px", background: "#ecfdf5", border: "1px solid #a7f3d0", color: "#065f46", borderRadius: "8px", marginBottom: "16px" }}>
                    âœ“ {success}
                </div>
            )}
            {error && (
                <div style={{ padding: "12px 16px", background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", borderRadius: "8px", marginBottom: "16px" }}>
                    âš  {error}
                </div>
            )}

            {/* PURCHASE ORDER ENTRY FORM */}
            <div className="card" style={{ padding: "20px", background: "#fff", borderRadius: "10px", border: "1px solid #e2e8f0", marginBottom: "25px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", borderBottom: "1px solid #f1f5f9", paddingBottom: "12px" }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: "18px", color: "#0f172a", fontWeight: "700" }}>
                            {editingId ? `Edit Purchase Receipt #${editingId}` : "Record Raw Material Inward (PO)"}
                        </h2>
                        <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748b" }}>
                            Weights auto-calculate Net Weight (Gross âˆ’ Tare), Subtotal, and 18% GST grand total
                        </p>
                    </div>

                    {editingId && (
                        <button
                            type="button"
                            onClick={resetForm}
                            style={{ padding: "6px 12px", background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: "6px", cursor: "pointer", fontSize: "12px" }}
                        >
                            Cancel Edit
                        </button>
                    )}
                </div>

                <form onSubmit={handleSubmit}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px", marginBottom: "16px" }}>
                        <div>
                            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px", color: "#334155" }}>
                                Inward Date *
                            </label>
                            <input
                                type="date"
                                name="date"
                                required
                                value={form.date}
                                onChange={handleChange}
                                style={{ width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "14px" }}
                            />
                        </div>

                        <div>
                            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px", color: "#334155" }}>
                                PO Serial No (Auto-generated if empty)
                            </label>
                            <input
                                type="text"
                                name="purchaseOrderNo"
                                placeholder="e.g. PO-2026-0001"
                                value={form.purchaseOrderNo}
                                onChange={handleChange}
                                style={{ width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "14px" }}
                            />
                        </div>

                        <div>
                            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px", color: "#334155" }}>
                                Supplier *
                            </label>
                            <select
                                name="supplierId"
                                value={form.supplierId}
                                onChange={handleChange}
                                style={{ width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "14px" }}
                            >
                                <option value="">-- Choose Supplier --</option>
                                {suppliers.map(s => (
                                    <option key={s.id} value={s.id}>{s.name} ({s.supplierCode || "SUPP"})</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px", color: "#334155" }}>
                                Supplier Invoice / Challan No
                            </label>
                            <input
                                type="text"
                                name="supplierInvoiceNo"
                                placeholder="Vendor challan / bill no"
                                value={form.supplierInvoiceNo}
                                onChange={handleChange}
                                style={{ width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "14px" }}
                            />
                        </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px", marginBottom: "16px" }}>
                        <div>
                            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px", color: "#334155" }}>
                                Vehicle Reg Number *
                            </label>
                            <input
                                type="text"
                                name="vehicleNo"
                                required
                                placeholder="e.g. MH12CD5678"
                                value={form.vehicleNo}
                                onChange={handleChange}
                                style={{ width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "14px", fontWeight: "600", textTransform: "uppercase" }}
                            />
                            {form.vehicleId && (
                                <small style={{ color: "#6b21a8", fontWeight: 600 }}>Linked Vehicle Entry #{form.vehicleId}</small>
                            )}
                        </div>

                        <div>
                            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px", color: "#334155" }}>
                                Raw Material / Commodity *
                            </label>
                            <select
                                name="commodity"
                                required
                                value={form.commodity}
                                onChange={handleChange}
                                style={{ width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "14px" }}
                            >
                                {commodities.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>

                        <div>
                            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px", color: "#334155" }}>
                                Gross Weight (KG) *
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                name="grossWeight"
                                required
                                placeholder="Loaded truck KG"
                                value={form.grossWeight}
                                onChange={handleChange}
                                style={{ width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "14px", fontWeight: "600" }}
                            />
                        </div>

                        <div>
                            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px", color: "#334155" }}>
                                Tare Weight (KG) *
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                name="tareWeight"
                                required
                                placeholder="Empty truck KG"
                                value={form.tareWeight}
                                onChange={handleChange}
                                style={{ width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "14px", fontWeight: "600" }}
                            />
                        </div>
                    </div>

                    {/* FINANCIAL CALCULATION BLOCK */}
                    <div style={{ background: "#faf5ff", padding: "16px", borderRadius: "8px", border: "1px solid #f3e8ff", marginBottom: "16px" }}>
                        <div style={{ fontSize: "12px", fontWeight: "700", textTransform: "uppercase", color: "#7e22ce", marginBottom: "10px", letterSpacing: "0.5px" }}>
                            Financial Calculations & Pricing
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
                            <div>
                                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px", color: "#334155" }}>
                                    Net Quantity (KG)
                                </label>
                                <div style={{ padding: "8px 10px", background: "#fff", border: "1px solid #d8b4fe", borderRadius: "6px", fontSize: "15px", fontWeight: "800", color: "#6b21a8" }}>
                                    {netWeight.toLocaleString()} KG
                                </div>
                            </div>

                            <div>
                                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px", color: "#334155" }}>
                                    Rate per KG (â‚¹) *
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    name="unitPrice"
                                    value={form.unitPrice}
                                    onChange={handleChange}
                                    style={{ width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "14px", fontWeight: "600" }}
                                />
                            </div>

                            <div>
                                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px", color: "#334155" }}>
                                    Discount (â‚¹)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    name="discount"
                                    value={form.discount}
                                    onChange={handleChange}
                                    style={{ width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "14px" }}
                                />
                            </div>

                            <div>
                                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px", color: "#334155" }}>
                                    GST Tax Rate (%)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    name="taxRate"
                                    value={form.taxRate}
                                    onChange={handleChange}
                                    style={{ width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "14px" }}
                                />
                            </div>

                            <div>
                                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px", color: "#334155" }}>
                                    Total Amount (Incl. GST)
                                </label>
                                <div style={{ padding: "8px 10px", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "6px", fontSize: "16px", fontWeight: "800", color: "#15803d" }}>
                                    â‚¹{grandTotal.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                                </div>
                            </div>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginTop: "12px" }}>
                            <div>
                                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px", color: "#334155" }}>
                                    Paid Amount (â‚¹)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    name="paidAmount"
                                    value={form.paidAmount}
                                    onChange={handleChange}
                                    style={{ width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "14px" }}
                                />
                            </div>

                            <div>
                                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px", color: "#334155" }}>
                                    Payment Status
                                </label>
                                <select
                                    name="paymentStatus"
                                    value={form.paymentStatus}
                                    onChange={handleChange}
                                    style={{ width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "14px", fontWeight: "600" }}
                                >
                                    <option value="PENDING">PENDING (Unpaid)</option>
                                    <option value="PARTIAL">PARTIAL (Advance Paid)</option>
                                    <option value="PAID">PAID (Settled in Full)</option>
                                </select>
                            </div>

                            <div>
                                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px", color: "#334155" }}>
                                    Notes / Remarks
                                </label>
                                <input
                                    type="text"
                                    name="remarks"
                                    placeholder="Batch, purity or moisture notes"
                                    value={form.remarks}
                                    onChange={handleChange}
                                    style={{ width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "14px" }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* SUBMIT BUTTONS */}
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                        <button
                            type="button"
                            onClick={resetForm}
                            style={{ padding: "8px 16px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer" }}
                        >
                            Reset Form
                        </button>

                        <button
                            type="submit"
                            disabled={saving || isClient}
                            style={{
                                padding: "8px 24px",
                                borderRadius: "6px",
                                border: "none",
                                background: isClient ? "#94a3b8" : "#7e22ce",
                                color: "#fff",
                                fontWeight: "700",
                                cursor: isClient ? "not-allowed" : "pointer",
                                fontSize: "14px"
                            }}
                        >
                            {isClient ? "Read-only Access" : (saving ? "Saving Record..." : editingId ? "Update Purchase Record" : "Save Raw Material Inward")}
                        </button>
                    </div>
                </form>
            </div>

            {/* SEARCH & FILTERS BAR */}
            <div className="card" style={{ padding: "16px", background: "#fff", borderRadius: "10px", border: "1px solid #e2e8f0", marginBottom: "20px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", alignItems: "center" }}>
                    <div>
                        <input
                            type="text"
                            placeholder="ðŸ” Search PO, supplier, vehicle, bill no..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "13px" }}
                        />
                    </div>

                    <div>
                        <input
                            type="date"
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                            style={{ width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "13px" }}
                        />
                    </div>

                    <div>
                        <select
                            value={paymentFilter}
                            onChange={(e) => setPaymentFilter(e.target.value)}
                            style={{ width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "13px" }}
                        >
                            <option value="ALL">All Payment Statuses</option>
                            <option value="PAID">Paid</option>
                            <option value="PARTIAL">Partial</option>
                            <option value="PENDING">Pending</option>
                        </select>
                    </div>

                    {dateFilter && (
                        <button
                            type="button"
                            onClick={() => setDateFilter("")}
                            style={{ padding: "6px 10px", background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "12px", cursor: "pointer" }}
                        >
                            Clear Date
                        </button>
                    )}
                </div>
            </div>

            {/* DATA TABLE */}
            <div className="card" style={{ background: "#fff", borderRadius: "10px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
                        <thead>
                            <tr style={{ background: "#f8fafc", borderBottom: "1px solid #cbd5e1", color: "#334155", fontWeight: "700" }}>
                                <th style={{ padding: "12px 14px" }}>PO / Date</th>
                                <th style={{ padding: "12px 14px" }}>Supplier</th>
                                <th style={{ padding: "12px 14px" }}>Vehicle Reg No</th>
                                <th style={{ padding: "12px 14px" }}>Commodity</th>
                                <th style={{ padding: "12px 14px" }}>Net Weight</th>
                                <th style={{ padding: "12px 14px" }}>Rate (â‚¹/KG)</th>
                                <th style={{ padding: "12px 14px" }}>Grand Total</th>
                                <th style={{ padding: "12px 14px" }}>Payment</th>
                                <th style={{ padding: "12px 14px", textAlign: "center" }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPurchases.length === 0 ? (
                                <tr>
                                    <td colSpan="9" style={{ padding: "28px", textAlign: "center", color: "#64748b" }}>
                                        {loading ? "Loading purchase records..." : "No purchase entries found."}
                                    </td>
                                </tr>
                            ) : (
                                filteredPurchases.map((p) => (
                                    <tr key={p.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                        <td style={{ padding: "10px 14px" }}>
                                            <strong style={{ color: "#7e22ce" }}>{p.purchaseOrderNo || `PO-#${p.id}`}</strong>
                                            <div style={{ fontSize: "11px", color: "#64748b" }}>{p.date}</div>
                                        </td>
                                        <td style={{ padding: "10px 14px", fontWeight: "600", color: "#1e293b" }}>
                                            {p.supplierName || "â€”"}
                                            {p.supplierInvoiceNo && (
                                                <div style={{ fontSize: "11px", color: "#64748b" }}>Bill: {p.supplierInvoiceNo}</div>
                                            )}
                                        </td>
                                        <td style={{ padding: "10px 14px", fontWeight: "600", color: "#334155" }}>
                                            {p.vehicleNo || "â€”"}
                                        </td>
                                        <td style={{ padding: "10px 14px", color: "#334155" }}>
                                            {p.commodity}
                                        </td>
                                        <td style={{ padding: "10px 14px" }}>
                                            <strong>{Number(p.netWeight || 0).toLocaleString()} KG</strong>
                                            <div style={{ fontSize: "11px", color: "#64748b" }}>
                                                G: {Number(p.grossWeight || 0).toLocaleString()} | T: {Number(p.tareWeight || 0).toLocaleString()}
                                            </div>
                                        </td>
                                        <td style={{ padding: "10px 14px", color: "#475569" }}>
                                            â‚¹{Number(p.unitPrice || 0).toFixed(2)}
                                        </td>
                                        <td style={{ padding: "10px 14px", fontWeight: "700", color: "#7e22ce" }}>
                                            ₹{Number(p.grandTotal || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                                        </td>
                                        <td style={{ padding: "10px 14px" }}>
                                            <span style={{
                                                padding: "3px 8px",
                                                borderRadius: "10px",
                                                fontSize: "11px",
                                                fontWeight: "600",
                                                background: p.paymentStatus === "PAID" ? "#dcfce7" : p.paymentStatus === "PARTIAL" ? "#fef3c7" : "#fee2e2",
                                                color: p.paymentStatus === "PAID" ? "#15803d" : p.paymentStatus === "PARTIAL" ? "#92400e" : "#b91c1c"
                                            }}>
                                                {p.paymentStatus || "PENDING"}
                                            </span>
                                        </td>
                                        <td style={{ padding: "10px 14px", textAlign: "center" }}>
                                            <div style={{ display: "inline-flex", gap: "6px", flexWrap: "wrap" }}>
                                                <button
                                                    onClick={() => setPoModalPurchase(p)}
                                                    title="View Purchase Order Slip"
                                                    style={{ padding: "4px 8px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "4px", cursor: "pointer", fontSize: "11px" }}
                                                >
                                                    Slip
                                                </button>
                                                {!isClient && (
                                                    <button
                                                        onClick={() => startEdit(p)}
                                                        title="Edit purchase"
                                                        style={{ padding: "4px 8px", background: "#fff", border: "1px solid #cbd5e1", borderRadius: "4px", cursor: "pointer", fontSize: "11px" }}
                                                    >
                                                        Edit
                                                    </button>
                                                )}
                                                {!isClient && (
                                                    <button
                                                        onClick={() => handleDelete(p.id, p.purchaseOrderNo)}
                                                        title="Delete record"
                                                        style={{ padding: "4px 8px", background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", borderRadius: "4px", cursor: "pointer", fontSize: "11px" }}
                                                    >
                                                        Delete
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* PURCHASE ORDER SLIP MODAL */}
            {poModalPurchase && (
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
                        maxWidth: "680px",
                        width: "100%",
                        padding: "28px",
                        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)"
                    }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #7e22ce", paddingBottom: "14px", marginBottom: "18px" }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: "20px", color: "#1e3a8a", fontWeight: "800" }}>
                                    DHM PYROTECH ENTERPRISES
                                </h2>
                                <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748b" }}>
                                    Factory Goods Inward Slip & Weighbridge Receipt
                                </p>
                            </div>
                            <div style={{ textAlign: "right" }}>
                                <span style={{ fontSize: "14px", fontWeight: "700", color: "#7e22ce" }}>
                                    {poModalPurchase.purchaseOrderNo || `PO-#${poModalPurchase.id}`}
                                </span>
                                <div style={{ fontSize: "12px", color: "#64748b" }}>Date: {poModalPurchase.date}</div>
                            </div>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px", fontSize: "13px" }}>
                            <div>
                                <strong>Supplier Particulars:</strong>
                                <div style={{ color: "#1e293b", fontWeight: "600", marginTop: "2px" }}>{poModalPurchase.supplierName || "â€”"}</div>
                                {poModalPurchase.supplierInvoiceNo && (
                                    <div style={{ color: "#64748b" }}>Supplier Invoice: {poModalPurchase.supplierInvoiceNo}</div>
                                )}
                            </div>
                            <div>
                                <strong>Vehicle & Gate Details:</strong>
                                <div style={{ color: "#1e293b", fontWeight: "600", marginTop: "2px" }}>Truck: {poModalPurchase.vehicleNo || "â€”"}</div>
                                <div style={{ color: "#64748b" }}>Commodity: {poModalPurchase.commodity}</div>
                            </div>
                        </div>

                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", marginBottom: "16px" }}>
                            <thead>
                                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #cbd5e1", textAlign: "left" }}>
                                    <th style={{ padding: "8px" }}>Item Description</th>
                                    <th style={{ padding: "8px" }}>Net Weight</th>
                                    <th style={{ padding: "8px" }}>Unit Rate</th>
                                    <th style={{ padding: "8px", textAlign: "right" }}>Subtotal</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                                    <td style={{ padding: "8px" }}>{poModalPurchase.commodity}</td>
                                    <td style={{ padding: "8px", fontWeight: "600" }}>{Number(poModalPurchase.netWeight || 0).toLocaleString()} KG</td>
                                    <td style={{ padding: "8px" }}>â‚¹{Number(poModalPurchase.unitPrice || 0).toFixed(2)}</td>
                                    <td style={{ padding: "8px", textAlign: "right", fontWeight: "600" }}>
                                        â‚¹{Number(poModalPurchase.subtotal || (Number(poModalPurchase.netWeight || 0) * Number(poModalPurchase.unitPrice || 0))).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                                    </td>
                                </tr>
                            </tbody>
                        </table>

                        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "20px" }}>
                            <div style={{ width: "240px", fontSize: "13px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                                    <span>Subtotal:</span>
                                    <span>â‚¹{Number(poModalPurchase.subtotal || 0).toFixed(2)}</span>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                                    <span>GST Tax ({poModalPurchase.taxRate || 18}%):</span>
                                    <span>â‚¹{Number(poModalPurchase.taxAmount || 0).toFixed(2)}</span>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderTop: "1px solid #cbd5e1", fontWeight: "800", fontSize: "15px", color: "#7e22ce" }}>
                                    <span>Grand Total:</span>
                                    <span>â‚¹{Number(poModalPurchase.grandTotal || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <button
                                onClick={() => window.print()}
                                style={{ padding: "8px 18px", background: "#1e3a8a", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: "600" }}
                            >
                                ðŸ–¨ Print Inward Slip
                            </button>

                            <button
                                onClick={() => setPoModalPurchase(null)}
                                style={{ padding: "8px 18px", background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: "6px", cursor: "pointer", fontSize: "13px" }}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

export default PurchaseRegister;

