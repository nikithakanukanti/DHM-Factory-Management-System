import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../api";

const commodities = [
    "Fuel Oil",
    "Carbon Black Powder",
    "Metal Steel Scrap",
    "Local Waste Rubber Tyre",
    "Imported Waste Rubber Tyre"
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
    invoiceNo: "",
    vehicleId: "",
    vehicleNo: "",
    customerId: "",
    customerName: "",
    grossWeight: "",
    tareWeight: "",
    commodity: "Fuel Oil",
    unitPrice: "55.00",
    discount: "0.00",
    taxRate: "18.00",
    paidAmount: "0.00",
    paymentStatus: "PENDING",
    remarks: ""
};

function SalesRegister() {
    const [searchParams] = useSearchParams();
    const currentUser = (() => { try { return JSON.parse(localStorage.getItem("dhmUser") || sessionStorage.getItem("dhmUser") || "{}"); } catch { return {}; } })();
    const isClient = currentUser?.role === "CLIENT";
    const [sales, setSales] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [form, setForm] = useState(emptyForm);
    const [search, setSearch] = useState("");
    const [paymentFilter, setPaymentFilter] = useState("ALL");
    const [dateFilter, setDateFilter] = useState("");
    const [editingId, setEditingId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [invoiceModalSale, setInvoiceModalSale] = useState(null);

    useEffect(() => {
        const vehicleId = searchParams.get("vehicleId");
        const vehicleNo = searchParams.get("vehicleNo");
        const date = searchParams.get("date");
        const customerName = searchParams.get("partyName") || searchParams.get("customerName");
        const commodity = searchParams.get("commodity");
        const grossWeight = searchParams.get("grossWeight");
        const tareWeight = searchParams.get("tareWeight");
        const q = searchParams.get("search");
        if (q) setSearch(q);
        if (vehicleId || vehicleNo || date || customerName || commodity || grossWeight || tareWeight) {
            setForm(prev => ({
                ...prev,
                date: date || prev.date,
                vehicleNo: vehicleNo || prev.vehicleNo,
                customerName: customerName || prev.customerName,
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
            const [salesRes, custRes] = await Promise.allSettled([
                api.get("/api/sales"),
                api.get("/api/customers")
            ]);

            if (salesRes.status === "fulfilled") {
                setSales(Array.isArray(salesRes.value.data) ? salesRes.value.data : []);
            }
            if (custRes.status === "fulfilled") {
                setCustomers(Array.isArray(custRes.value.data) ? custRes.value.data : []);
            }
        } catch (err) {
            console.error("Sales loading error:", err);
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
            if (name === "customerId") {
                const found = customers.find(c => String(c.id) === String(value));
                if (found) {
                    updated.customerName = found.name;
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

    function clearForm() {
        setForm({ ...emptyForm, date: getTodayDate() });
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

        const payload = {
            date: form.date,
            invoiceNo: form.invoiceNo ? form.invoiceNo.trim() : null,
            vehicleNo: form.vehicleNo.trim().toUpperCase(),
            vehicleId: form.vehicleId ? Number(form.vehicleId) : null,
            customerId: form.customerId ? Number(form.customerId) : null,
            customerName: form.customerName ? form.customerName.trim() : null,
            grossWeight: gross,
            tareWeight: tare,
            netWeight: netWeight,
            quantity: netWeight,
            commodity: form.commodity,
            unitPrice: unitPrice,
            rate: unitPrice,
            discount: discount,
            taxRate: taxRate,
            paidAmount: Number(form.paidAmount) || 0,
            paymentStatus: form.paymentStatus || "PENDING",
            remarks: form.remarks.trim()
        };

        try {
            setSaving(true);
            if (editingId) {
                await api.put(`/api/sales/${editingId}`, payload);
                setSuccess("Sales invoice updated successfully.");
            } else {
                await api.post("/api/sales", payload);
                setSuccess("Sales dispatch recorded and invoice generated successfully.");
            }

            clearForm();
            await loadData();
        } catch (err) {
            console.error("Sales save error:", err);
            setError(err.response?.data?.message || typeof err.response?.data === "string" ? err.response.data : "Unable to save sales entry.");
        } finally {
            setSaving(false);
        }
    }

    function startEdit(sale) {
        setEditingId(sale.id);
        setForm({
            date: sale.date || getTodayDate(),
            invoiceNo: sale.invoiceNo || "",
            vehicleId: sale.vehicleId ? String(sale.vehicleId) : "",
            vehicleNo: sale.vehicleNo || "",
            customerId: sale.customerId || "",
            customerName: sale.customerName || "",
            grossWeight: sale.grossWeight ?? "",
            tareWeight: sale.tareWeight ?? "",
            commodity: sale.commodity || "Fuel Oil",
            unitPrice: sale.unitPrice ?? "55.00",
            discount: sale.discount ?? "0.00",
            taxRate: sale.taxRate ?? "18.00",
            paidAmount: sale.paidAmount ?? "0.00",
            paymentStatus: sale.paymentStatus || "PENDING",
            remarks: sale.remarks || ""
        });
        setError("");
        setSuccess("");
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    async function deleteSale(id) {
        if (!window.confirm("Are you sure you want to delete this sales invoice?")) {
            return;
        }

        try {
            setLoading(true);
            await api.delete(`/api/sales/${id}`);
            setSuccess("Sales entry deleted successfully.");
            await loadData();
        } catch (err) {
            setError("Unable to delete sales entry.");
        } finally {
            setLoading(false);
        }
    }

    const filteredSales = useMemo(() => {
        const query = search.toLowerCase().trim();
        return sales.filter((s) => {
            const matchesQuery = !query ||
                String(s.date || "").toLowerCase().includes(query) ||
                String(s.invoiceNo || "").toLowerCase().includes(query) ||
                String(s.vehicleNo || "").toLowerCase().includes(query) ||
                String(s.customerName || "").toLowerCase().includes(query) ||
                String(s.commodity || "").toLowerCase().includes(query);

            const matchesPayment = paymentFilter === "ALL" || s.paymentStatus === paymentFilter;
            const matchesDate = !dateFilter || s.date === dateFilter;

            return matchesQuery && matchesPayment && matchesDate;
        });
    }, [sales, search, paymentFilter, dateFilter]);

    const totalSalesWeight = filteredSales.reduce((sum, s) => {
        const val = s.netWeight != null ? Number(s.netWeight) : (s.grossWeight && s.tareWeight ? Number(s.grossWeight) - Number(s.tareWeight) : 0);
        return sum + val;
    }, 0);

    const totalRevenue = filteredSales.reduce((sum, s) => sum + Number(s.grandTotal || 0), 0);

    return (
        <div className="vehicle-page">

            {/* PAGE HEADER */}
            <div className="page-header">
                <div>
                    <h1>SALES MANAGEMENT & INVOICING</h1>
                    <p>Finished Goods Dispatch, Customer Orders & GST Tax Invoice Generation</p>
                </div>

                <button type="button" className="secondary-button" onClick={loadData} disabled={loading || saving}>
                    {loading ? "Loading..." : "Refresh"}
                </button>
            </div>

            {/* NOTIFICATIONS */}
            {success && <div className="success-message" style={{ marginBottom: "20px" }}>✓ {success}</div>}
            {error && <div className="error-message" style={{ marginBottom: "20px" }}>⚠ {error}</div>}

            {/* FORM CARD */}
            <div className="card">
                <div className="section-header">
                    <div>
                        <h2>{editingId ? "Edit Sales Invoice" : "New Sales Dispatch & Invoice"}</h2>
                        <p>Calculate weight, tax rate, and generate customer invoice</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="form-grid">

                    {/* DATE */}
                    <div className="form-group">
                        <label>Date *</label>
                        <input type="date" name="date" value={form.date} onChange={handleChange} required />
                    </div>

                    {/* INVOICE NO */}
                    <div className="form-group">
                        <label>Invoice Number</label>
                        <input
                            type="text"
                            name="invoiceNo"
                            value={form.invoiceNo}
                            onChange={handleChange}
                            placeholder="Auto-generated if blank (e.g. INV-2026-0001)"
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
                        {form.vehicleId && (
                            <small style={{ color: "#166534", fontWeight: 600 }}>Linked Vehicle Entry #{form.vehicleId}</small>
                        )}
                    </div>

                    {/* CUSTOMER SELECTION */}
                    <div className="form-group">
                        <label>Customer</label>
                        <select name="customerId" value={form.customerId} onChange={handleChange}>
                            <option value="">Select Customer (or type in remarks)</option>
                            {customers.map(c => (
                                <option key={c.id} value={c.id}>{c.name} ({c.customerCode})</option>
                            ))}
                        </select>
                    </div>

                    {/* COMMODITY */}
                    <div className="form-group">
                        <label>Commodity *</label>
                        <select name="commodity" value={form.commodity} onChange={handleChange} required>
                            {commodities.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
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

                    {/* NET WEIGHT (CALCULATED) */}
                    <div className="form-group">
                        <label>Net Weight (Calculated)</label>
                        <input
                            type="text"
                            value={`${netWeight.toFixed(2)} KG`}
                            readOnly
                            style={{ background: "#f1f5f9", fontWeight: "bold" }}
                        />
                    </div>

                    {/* UNIT PRICE */}
                    <div className="form-group">
                        <label>Unit Rate (₹ per KG/Litre) *</label>
                        <input
                            type="number"
                            name="unitPrice"
                            value={form.unitPrice}
                            onChange={handleChange}
                            min="0"
                            step="0.01"
                            required
                        />
                    </div>

                    {/* DISCOUNT */}
                    <div className="form-group">
                        <label>Discount Amount (₹)</label>
                        <input
                            type="number"
                            name="discount"
                            value={form.discount}
                            onChange={handleChange}
                            min="0"
                            step="0.01"
                        />
                    </div>

                    {/* TAX RATE (GST) */}
                    <div className="form-group">
                        <label>Tax Rate (%)</label>
                        <select name="taxRate" value={form.taxRate} onChange={handleChange}>
                            <option value="0">0% (Nil)</option>
                            <option value="5">5% GST</option>
                            <option value="12">12% GST</option>
                            <option value="18">18% GST (Standard)</option>
                            <option value="28">28% GST</option>
                        </select>
                    </div>

                    {/* GRAND TOTAL PREVIEW */}
                    <div className="form-group">
                        <label>Grand Total (Incl. Tax)</label>
                        <input
                            type="text"
                            value={`₹${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                            readOnly
                            style={{ background: "#ecfdf5", color: "#166534", fontWeight: "bold" }}
                        />
                    </div>

                    {/* PAID AMOUNT */}
                    <div className="form-group">
                        <label>Paid Amount (₹)</label>
                        <input
                            type="number"
                            name="paidAmount"
                            value={form.paidAmount}
                            onChange={handleChange}
                            min="0"
                            step="0.01"
                        />
                    </div>

                    {/* REMARKS */}
                    <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                        <label>Destination & Remarks</label>
                        <textarea
                            name="remarks"
                            value={form.remarks}
                            onChange={handleChange}
                            placeholder="Destination, transport bill number, or notes"
                            rows="2"
                        />
                    </div>

                    {/* BUTTONS */}
                    <div style={{ gridColumn: "1 / -1", display: "flex", gap: "10px", flexWrap: "wrap" }}>
                        <button type="submit" className="primary-button" disabled={saving || isClient}>
                            {isClient ? "Read-only Access" : (saving ? "Saving..." : editingId ? "Update Sales Invoice" : "Generate Sales Invoice")}
                        </button>
                        <button type="button" className="secondary-button" onClick={clearForm} disabled={saving || isClient}>
                            Clear Form
                        </button>
                        {isClient && <span style={{ fontSize: 12, color: "#64748b", alignSelf: "center" }}>Client accounts can view records only.</span>}
                    </div>

                </form>
            </div>

            {/* SUMMARY CARDS */}
            <div className="card" style={{ marginTop: "25px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
                    <div style={{ padding: "18px", border: "1px solid #e5e7eb", borderRadius: "10px", background: "#f8fafc" }}>
                        <div style={{ color: "#6b7280", fontSize: "13px" }}>Total Invoices</div>
                        <strong style={{ fontSize: "26px", color: "#1f2937" }}>{filteredSales.length}</strong>
                    </div>

                    <div style={{ padding: "18px", border: "1px solid #e5e7eb", borderRadius: "10px", background: "#f8fafc" }}>
                        <div style={{ color: "#6b7280", fontSize: "13px" }}>Total Outward Tonnage</div>
                        <strong style={{ fontSize: "26px", color: "#0369a1" }}>
                            {totalSalesWeight.toLocaleString()} KG
                            <span style={{ fontSize: "13px", color: "#64748b", marginLeft: "6px" }}>
                                ({(totalSalesWeight / 1000).toFixed(2)} MT)
                            </span>
                        </strong>
                    </div>

                    <div style={{ padding: "18px", border: "1px solid #e5e7eb", borderRadius: "10px", background: "#f8fafc" }}>
                        <div style={{ color: "#6b7280", fontSize: "13px" }}>Total Sales Value</div>
                        <strong style={{ fontSize: "26px", color: "#15803d" }}>
                            ₹{totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </strong>
                    </div>
                </div>
            </div>

            {/* SALES TABLE */}
            <div className="card" style={{ marginTop: "25px" }}>
                <div className="section-header" style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", alignItems: "center" }}>
                    <div>
                        <h2>Sales Dispatches ({filteredSales.length})</h2>
                        <p>Complete invoice history, GST calculations, and payment tracking</p>
                    </div>

                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
                        <input
                            type="text"
                            placeholder="🔍 Search invoice, customer, truck..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", minWidth: "200px" }}
                        />

                        <input
                            type="date"
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                            style={{ padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                        />

                        <select
                            value={paymentFilter}
                            onChange={(e) => setPaymentFilter(e.target.value)}
                            style={{ padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                        >
                            <option value="ALL">All Payments</option>
                            <option value="PAID">Paid</option>
                            <option value="PARTIAL">Partial</option>
                            <option value="PENDING">Pending</option>
                        </select>

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

                <div className="table-container" style={{ overflowX: "auto" }}>
                    <table>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Invoice No</th>
                                <th>Vehicle No</th>
                                <th>Customer</th>
                                <th>Commodity</th>
                                <th>Net Weight</th>
                                <th>Grand Total</th>
                                <th>Payment</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredSales.length === 0 ? (
                                <tr>
                                    <td colSpan="9" style={{ textAlign: "center", padding: "30px", color: "#64748b" }}>
                                        No sales invoices found.
                                    </td>
                                </tr>
                            ) : (
                                filteredSales.map((s) => (
                                    <tr key={s.id}>
                                        <td>{s.date}</td>
                                        <td><strong>{s.invoiceNo || "-"}</strong></td>
                                        <td>{s.vehicleNo}</td>
                                        <td>{s.customerName || "-"}</td>
                                        <td>{s.commodity}</td>
                                        <td><strong>{Number(s.netWeight || 0).toLocaleString()} KG</strong></td>
                                        <td><strong>₹{Number(s.grandTotal || 0).toLocaleString()}</strong></td>
                                        <td>
                                            <span style={{
                                                fontSize: "11px",
                                                padding: "3px 8px",
                                                borderRadius: "6px",
                                                fontWeight: "bold",
                                                background: s.paymentStatus === "PAID" ? "#dcfce7" : s.paymentStatus === "PARTIAL" ? "#fef3c7" : "#fee2e2",
                                                color: s.paymentStatus === "PAID" ? "#15803d" : s.paymentStatus === "PARTIAL" ? "#92400e" : "#b91c1c"
                                            }}>
                                                {s.paymentStatus || "PENDING"}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                                                <button
                                                    type="button"
                                                    onClick={() => setInvoiceModalSale(s)}
                                                    style={{ padding: "4px 8px", fontSize: "11px", background: "#dbeafe", border: "1px solid #bfdbfe", color: "#1e40af", borderRadius: "5px", cursor: "pointer" }}
                                                >
                                                    Invoice 🧾
                                                </button>
                                                {!isClient && (
                                                    <button
                                                        type="button"
                                                        onClick={() => startEdit(s)}
                                                        style={{ padding: "4px 8px", fontSize: "11px", background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: "5px", cursor: "pointer" }}
                                                    >
                                                        Edit
                                                    </button>
                                                )}
                                                {!isClient && (
                                                    <button
                                                        type="button"
                                                        onClick={() => deleteSale(s.id)}
                                                        style={{ padding: "4px 8px", fontSize: "11px", background: "#fee2e2", border: "1px solid #fca5a5", color: "#b91c1c", borderRadius: "5px", cursor: "pointer" }}
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

            {/* PRINTABLE INVOICE MODAL */}
            {invoiceModalSale && (
                <div style={{
                    position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
                    background: "rgba(10, 25, 41, 0.75)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    zIndex: 9999, padding: "16px"
                }}>
                    <div style={{
                        background: "white", borderRadius: "12px", width: "100%", maxWidth: "650px",
                        padding: "28px", boxShadow: "0 25px 50px rgba(0,0,0,0.3)", maxHeight: "90vh", overflowY: "auto"
                    }}>
                        <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "2px solid #173f67", paddingBottom: "14px" }}>
                            <div>
                                <h2 style={{ margin: 0, color: "#173f67" }}>DHM PYROTECH ENTERPRISES</h2>
                                <p style={{ margin: "2px 0", fontSize: "12px", color: "#64748b" }}>Factory & Digital Weighbridge Dispatch Invoice</p>
                            </div>
                            <div style={{ textAlign: "right" }}>
                                <strong style={{ fontSize: "16px", color: "#0369a1" }}>TAX INVOICE</strong>
                                <div style={{ fontSize: "12px", color: "#64748b" }}>{invoiceModalSale.invoiceNo}</div>
                            </div>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", margin: "16px 0", fontSize: "13px" }}>
                            <div>
                                <div><strong>Invoice Date:</strong> {invoiceModalSale.date}</div>
                                <div><strong>Vehicle No:</strong> {invoiceModalSale.vehicleNo}</div>
                                <div><strong>Commodity:</strong> {invoiceModalSale.commodity}</div>
                            </div>
                            <div>
                                <div><strong>Billed To:</strong> {invoiceModalSale.customerName || "Customer"}</div>
                                <div><strong>Payment Status:</strong> {invoiceModalSale.paymentStatus || "PENDING"}</div>
                                <div><strong>Remarks:</strong> {invoiceModalSale.remarks || "-"}</div>
                            </div>
                        </div>

                        <table style={{ width: "100%", borderCollapse: "collapse", margin: "16px 0", fontSize: "13px" }}>
                            <thead>
                                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #cbd5e1" }}>
                                    <th style={{ padding: "8px", textAlign: "left" }}>Description</th>
                                    <th style={{ padding: "8px", textAlign: "right" }}>Gross Weight</th>
                                    <th style={{ padding: "8px", textAlign: "right" }}>Tare Weight</th>
                                    <th style={{ padding: "8px", textAlign: "right" }}>Net Weight</th>
                                    <th style={{ padding: "8px", textAlign: "right" }}>Rate (₹)</th>
                                    <th style={{ padding: "8px", textAlign: "right" }}>Amount (₹)</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td style={{ padding: "8px" }}>{invoiceModalSale.commodity}</td>
                                    <td style={{ padding: "8px", textAlign: "right" }}>{invoiceModalSale.grossWeight || "-"} KG</td>
                                    <td style={{ padding: "8px", textAlign: "right" }}>{invoiceModalSale.tareWeight || "-"} KG</td>
                                    <td style={{ padding: "8px", textAlign: "right" }}><strong>{invoiceModalSale.netWeight} KG</strong></td>
                                    <td style={{ padding: "8px", textAlign: "right" }}>₹{invoiceModalSale.unitPrice || "0.00"}</td>
                                    <td style={{ padding: "8px", textAlign: "right" }}>₹{invoiceModalSale.subtotal || invoiceModalSale.grandTotal}</td>
                                </tr>
                            </tbody>
                        </table>

                        <div style={{ textAlign: "right", fontSize: "13px", lineHeight: "1.8", marginTop: "14px" }}>
                            <div>Subtotal: <strong>₹{invoiceModalSale.subtotal || "0.00"}</strong></div>
                            <div>GST ({invoiceModalSale.taxRate || 18}%): <strong>₹{invoiceModalSale.taxAmount || "0.00"}</strong></div>
                            <div style={{ fontSize: "17px", color: "#166534", marginTop: "4px" }}>
                                Grand Total: <strong>₹{invoiceModalSale.grandTotal}</strong>
                            </div>
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "24px", paddingTop: "14px", borderTop: "1px solid #e2e8f0" }}>
                            <button
                                type="button"
                                className="primary-button"
                                onClick={() => window.print()}
                            >
                                🖨 Print Invoice
                            </button>
                            <button
                                type="button"
                                className="secondary-button"
                                onClick={() => setInvoiceModalSale(null)}
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

export default SalesRegister;
