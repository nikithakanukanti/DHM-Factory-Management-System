import { useEffect, useMemo, useState } from "react";
import api from "../api";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function formatMoney(v) {
  const n = Number(v || 0);
  return "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

export default function Payments() {
  const currentUser = (() => { try { return JSON.parse(localStorage.getItem("dhmUser") || sessionStorage.getItem("dhmUser") || "{}"); } catch { return {}; } })();
  const isClient = currentUser?.role === "CLIENT";
  const [payments, setPayments] = useState([]);
  const [sales, setSales] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    paymentDate: today(),
    paymentType: "CUSTOMER_PAYMENT",
    partyName: "",
    referenceId: "",
    referenceNo: "",
    amount: "",
    paymentMethod: "BANK_TRANSFER",
    transactionRef: "",
    remarks: ""
  });

  async function loadAll() {
    try {
      setLoading(true);
      setError("");
      const [pRes, sRes, puRes] = await Promise.all([
        api.get("/api/payments"),
        api.get("/api/sales"),
        api.get("/api/purchases")
      ]);
      setPayments(Array.isArray(pRes.data) ? pRes.data : []);
      setSales(Array.isArray(sRes.data) ? sRes.data : []);
      setPurchases(Array.isArray(puRes.data) ? puRes.data : []);
    } catch (e) {
      setError(e?.response?.data?.error || e?.response?.data || "Failed to load payments data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  const pendingSales = useMemo(() => sales.filter(s => (s.paymentStatus || "PENDING") !== "PAID"), [sales]);
  const pendingPurchases = useMemo(() => purchases.filter(p => (p.paymentStatus || "PENDING") !== "PAID"), [purchases]);

  const outstandingReceivables = useMemo(() => pendingSales.reduce((sum, s) => {
    const grand = Number(s.grandTotal || 0);
    const paid = Number(s.paidAmount || 0);
    return sum + Math.max(grand - paid, 0);
  }, 0), [pendingSales]);

  const outstandingPayables = useMemo(() => pendingPurchases.reduce((sum, p) => {
    const grand = Number(p.grandTotal || 0);
    const paid = Number(p.paidAmount || 0);
    return sum + Math.max(grand - paid, 0);
  }, 0), [pendingPurchases]);

  const filteredPayments = useMemo(() => {
    const q = search.trim().toLowerCase();
    return payments.filter(p => {
      if (typeFilter !== "ALL" && p.paymentType !== typeFilter) return false;
      if (!q) return true;
      return [p.partyName, p.referenceNo, p.transactionRef, p.paymentMethod, p.remarks, p.paymentType]
        .some(v => String(v || "").toLowerCase().includes(q));
    });
  }, [payments, search, typeFilter]);

  function onChange(e) {
    const { name, value } = e.target;
    setForm(prev => {
      const next = { ...prev, [name]: value };
      if (name === "paymentType") {
        next.referenceId = "";
        next.referenceNo = "";
        next.partyName = "";
      }
      if (name === "referenceId") {
        if (prev.paymentType === "CUSTOMER_PAYMENT") {
          const sale = sales.find(s => String(s.id) === String(value));
          if (sale) {
            next.referenceNo = sale.invoiceNo || "";
            next.partyName = sale.customerName || "";
            const due = Math.max(Number(sale.grandTotal || 0) - Number(sale.paidAmount || 0), 0);
            if (!prev.amount) next.amount = due ? String(due) : "";
          }
        } else {
          const purchase = purchases.find(p => String(p.id) === String(value));
          if (purchase) {
            next.referenceNo = purchase.purchaseOrderNo || purchase.supplierInvoiceNo || "";
            next.partyName = purchase.supplierName || "";
            const due = Math.max(Number(purchase.grandTotal || 0) - Number(purchase.paidAmount || 0), 0);
            if (!prev.amount) next.amount = due ? String(due) : "";
          }
        }
      }
      return next;
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm({
      paymentDate: today(),
      paymentType: "CUSTOMER_PAYMENT",
      partyName: "",
      referenceId: "",
      referenceNo: "",
      amount: "",
      paymentMethod: "BANK_TRANSFER",
      transactionRef: "",
      remarks: ""
    });
  }

  function startEdit(p) {
    setEditingId(p.id);
    setForm({
      paymentDate: p.paymentDate || today(),
      paymentType: p.paymentType || "CUSTOMER_PAYMENT",
      partyName: p.partyName || "",
      referenceId: p.referenceId ? String(p.referenceId) : "",
      referenceNo: p.referenceNo || "",
      amount: p.amount != null ? String(p.amount) : "",
      paymentMethod: p.paymentMethod || "BANK_TRANSFER",
      transactionRef: p.transactionRef || "",
      remarks: p.remarks || ""
    });
    setError("");
    setSuccess("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      setSaving(true);
      const payload = {
        ...form,
        amount: form.amount ? Number(form.amount) : null,
        referenceId: form.referenceId ? Number(form.referenceId) : null
      };
      if (editingId) {
        await api.put(`/api/payments/${editingId}`, payload);
        setSuccess("Payment updated successfully (linked balances reconciled).");
      } else {
        await api.post("/api/payments", payload);
        setSuccess("Payment recorded successfully.");
      }
      resetForm();
      await loadAll();
    } catch (e2) {
      setError(e2?.response?.data?.error || e2?.response?.data || "Failed to save payment.");
    } finally {
      setSaving(false);
    }
  }

  async function deletePayment(id) {
    if (!window.confirm("Delete this payment record? Linked sale/purchase paid amount will be adjusted automatically.")) return;
    setError("");
    setSuccess("");
    try {
      await api.delete(`/api/payments/${id}`);
      setSuccess("Payment deleted and linked balances reconciled.");
      if (editingId === id) resetForm();
      await loadAll();
    } catch (e) {
      setError(e?.response?.data?.error || e?.response?.data || "Failed to delete payment.");
    }
  }

  return (
    <div className="page-container" style={{ paddingBottom: 30 }}>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>Payments Management</h1>
          <p className="page-subtitle" style={{ margin: "4px 0 0", color: "#64748b" }}>
            Record customer receipts and supplier payments, track references, and monitor outstanding balances (live data).
          </p>
        </div>
        <button onClick={loadAll} disabled={loading} className="secondary-button" style={{ padding: "8px 12px" }}>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", padding: "10px 12px", borderRadius: 8, marginBottom: 12 }}>{String(error)}</div>}
      {success && <div style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", color: "#065f46", padding: "10px 12px", borderRadius: 8, marginBottom: 12 }}>{success}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginBottom: 16 }}>
        <div className="card" style={{ padding: 14, border: "1px solid #e2e8f0", borderRadius: 10, background: "#fff" }}>
          <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700 }}>OUTSTANDING RECEIVABLES</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#c2410c" }}>{formatMoney(outstandingReceivables)}</div>
          <div style={{ fontSize: 12, color: "#64748b" }}>{pendingSales.length} pending/partial sales</div>
        </div>
        <div className="card" style={{ padding: 14, border: "1px solid #e2e8f0", borderRadius: 10, background: "#fff" }}>
          <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700 }}>OUTSTANDING PAYABLES</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#7c2d12" }}>{formatMoney(outstandingPayables)}</div>
          <div style={{ fontSize: 12, color: "#64748b" }}>{pendingPurchases.length} pending/partial purchases</div>
        </div>
        <div className="card" style={{ padding: 14, border: "1px solid #e2e8f0", borderRadius: 10, background: "#fff" }}>
          <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700 }}>RECORDED PAYMENTS</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#1d4ed8" }}>{payments.length}</div>
          <div style={{ fontSize: 12, color: "#64748b" }}>Recent records loaded</div>
        </div>
      </div>

      <div className="card" style={{ padding: 16, border: "1px solid #e2e8f0", borderRadius: 10, background: "#fff", marginBottom: 16, opacity: isClient ? 0.8 : 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>{editingId ? `Edit Payment #${editingId}` : "Record Payment"}</h3>
          {editingId && !isClient && <button type="button" className="secondary-button" onClick={resetForm}>Cancel Edit</button>}
        </div>
        {isClient && <div style={{ marginBottom: 10, fontSize: 12, color: "#92400e", background: "#fffbeb", border: "1px solid #fde68a", padding: "8px 10px", borderRadius: 8 }}>Client accounts have read-only access. Payment recording/editing is disabled.</div>}
        <form onSubmit={submit}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600 }}>Payment Date *</label>
              <input type="date" name="paymentDate" value={form.paymentDate} onChange={onChange} required style={{ width: "100%", padding: 8, border: "1px solid #cbd5e1", borderRadius: 6 }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600 }}>Payment Type *</label>
              <select name="paymentType" value={form.paymentType} onChange={onChange} style={{ width: "100%", padding: 8, border: "1px solid #cbd5e1", borderRadius: 6 }}>
                <option value="CUSTOMER_PAYMENT">Customer Payment (Receipt)</option>
                <option value="SUPPLIER_PAYMENT">Supplier Payment (Payable)</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600 }}>Linked Reference</label>
              <select name="referenceId" value={form.referenceId} onChange={onChange} style={{ width: "100%", padding: 8, border: "1px solid #cbd5e1", borderRadius: 6 }}>
                <option value="">-- Optional --</option>
                {form.paymentType === "CUSTOMER_PAYMENT"
                  ? sales.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.invoiceNo || `Sale #${s.id}`} | {s.customerName || "Customer"} | Due {formatMoney(Math.max(Number(s.grandTotal || 0) - Number(s.paidAmount || 0), 0))}
                      </option>
                    ))
                  : purchases.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.purchaseOrderNo || `Purchase #${p.id}`} | {p.supplierName || "Supplier"} | Due {formatMoney(Math.max(Number(p.grandTotal || 0) - Number(p.paidAmount || 0), 0))}
                      </option>
                    ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600 }}>Party Name *</label>
              <input name="partyName" value={form.partyName} onChange={onChange} required placeholder="Customer/Supplier name" style={{ width: "100%", padding: 8, border: "1px solid #cbd5e1", borderRadius: 6 }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600 }}>Amount (₹) *</label>
              <input type="number" step="0.01" min="0" name="amount" value={form.amount} onChange={onChange} required style={{ width: "100%", padding: 8, border: "1px solid #cbd5e1", borderRadius: 6 }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600 }}>Payment Method *</label>
              <select name="paymentMethod" value={form.paymentMethod} onChange={onChange} style={{ width: "100%", padding: 8, border: "1px solid #cbd5e1", borderRadius: 6 }}>
                <option value="CASH">Cash</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="CHEQUE">Cheque</option>
                <option value="UPI">UPI</option>
                <option value="NEFT">NEFT</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600 }}>Transaction Reference</label>
              <input name="transactionRef" value={form.transactionRef} onChange={onChange} placeholder="UTR/Cheque/Ref no." style={{ width: "100%", padding: 8, border: "1px solid #cbd5e1", borderRadius: 6 }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600 }}>Reference No</label>
              <input name="referenceNo" value={form.referenceNo} onChange={onChange} placeholder="Invoice/PO ref" style={{ width: "100%", padding: 8, border: "1px solid #cbd5e1", borderRadius: 6 }} />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ fontSize: 12, fontWeight: 600 }}>Remarks</label>
              <input name="remarks" value={form.remarks} onChange={onChange} placeholder="Notes" style={{ width: "100%", padding: 8, border: "1px solid #cbd5e1", borderRadius: 6 }} />
            </div>
          </div>
          <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
            <button type="submit" disabled={saving || isClient} className="primary-button" style={{ padding: "8px 16px", opacity: isClient ? 0.6 : 1, cursor: isClient ? "not-allowed" : "pointer" }}>
              {saving ? "Saving..." : (editingId ? "Update Payment" : "Record Payment")}
            </button>
          </div>
        </form>
      </div>

      <div className="card" style={{ padding: 16, border: "1px solid #e2e8f0", borderRadius: 10, background: "#fff" }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "space-between", marginBottom: 10 }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Payment History</h3>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input placeholder="Search party/ref/method..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ padding: 8, border: "1px solid #cbd5e1", borderRadius: 6, minWidth: 220 }} />
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={{ padding: 8, border: "1px solid #cbd5e1", borderRadius: 6 }}>
              <option value="ALL">All Types</option>
              <option value="CUSTOMER_PAYMENT">Customer Payments</option>
              <option value="SUPPLIER_PAYMENT">Supplier Payments</option>
            </select>
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                <th style={{ padding: 10, textAlign: "left" }}>Date</th>
                <th style={{ padding: 10, textAlign: "left" }}>Type</th>
                <th style={{ padding: 10, textAlign: "left" }}>Party</th>
                <th style={{ padding: 10, textAlign: "left" }}>Reference</th>
                <th style={{ padding: 10, textAlign: "left" }}>Method</th>
                <th style={{ padding: 10, textAlign: "right" }}>Amount</th>
                <th style={{ padding: 10, textAlign: "left" }}>Recorded By</th>
                <th style={{ padding: 10, textAlign: "left" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.length === 0 ? (
                <tr><td colSpan="8" style={{ padding: 18, textAlign: "center", color: "#64748b" }}>{loading ? "Loading..." : "No payment records found."}</td></tr>
              ) : filteredPayments.map(p => (
                <tr key={p.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: 10 }}>{p.paymentDate}</td>
                  <td style={{ padding: 10 }}>
                    <span style={{ padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 700, background: p.paymentType === "CUSTOMER_PAYMENT" ? "#dcfce7" : "#fee2e2", color: p.paymentType === "CUSTOMER_PAYMENT" ? "#166534" : "#991b1b" }}>
                      {p.paymentType === "CUSTOMER_PAYMENT" ? "RECEIPT" : "PAYABLE"}
                    </span>
                  </td>
                  <td style={{ padding: 10 }}>{p.partyName || "-"}</td>
                  <td style={{ padding: 10 }}>{p.referenceNo || (p.referenceId ? `#${p.referenceId}` : "-")}{p.transactionRef ? <div style={{ fontSize: 11, color: "#64748b" }}>Txn: {p.transactionRef}</div> : null}</td>
                  <td style={{ padding: 10 }}>{p.paymentMethod || "-"}</td>
                  <td style={{ padding: 10, textAlign: "right", fontWeight: 700 }}>{formatMoney(p.amount)}</td>
                  <td style={{ padding: 10 }}>{p.recordedBy || "-"}</td>
                  <td style={{ padding: 10 }}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {!isClient && <button onClick={() => startEdit(p)} style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #bfdbfe", background: "#eff6ff", color: "#1d4ed8", cursor: "pointer" }}>Edit</button>}
                      {!isClient && <button onClick={() => deletePayment(p.id)} style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #fecaca", background: "#fef2f2", color: "#b91c1c", cursor: "pointer" }}>Delete</button>}
                      {isClient && <span style={{ color: "#64748b", fontSize: 12 }}>Read-only</span>}
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
