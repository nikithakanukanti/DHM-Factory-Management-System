import { useEffect, useMemo, useState } from "react";
import api from "../api";

const tabs = [
  { key: "vehicles", label: "Vehicles" },
  { key: "sales", label: "Sales" },
  { key: "purchases", label: "Purchases" },
  { key: "reactor", label: "Reactor Timing" },
  { key: "customers", label: "Customers" },
  { key: "suppliers", label: "Suppliers" },
  { key: "inventory", label: "Inventory" },
  { key: "payments", label: "Payments" },
  { key: "attendance", label: "Attendance" },
  { key: "employees", label: "Employees" },
];

function inRangeDate(dateStr, from, to) {
  if (!dateStr) return !from && !to;
  if (from && dateStr < from) return false;
  if (to && dateStr > to) return false;
  return true;
}

function inRangeDateTime(dtStr, from, to) {
  if (!dtStr) return !from && !to;
  const d = String(dtStr).slice(0, 10);
  return inRangeDate(d, from, to);
}

export default function Reports() {
  const [activeTab, setActiveTab] = useState("vehicles");
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [quickRange, setQuickRange] = useState("CUSTOM");
  const [search, setSearch] = useState("");
  const [data, setData] = useState({
    vehicles: [], sales: [], purchases: [], reactor: [], customers: [], suppliers: [], inventory: [], payments: [], attendance: [], employees: []
  });

  async function loadAll() {
    try {
      setLoading(true);
      setError("");
      const results = await Promise.allSettled([
        api.get("/api/vehicles"),
        api.get("/api/sales"),
        api.get("/api/purchases"),
        api.get("/api/reactor-timings"),
        api.get("/api/customers"),
        api.get("/api/suppliers"),
        api.get("/api/inventory/items"),
        api.get("/api/payments"),
        api.get("/api/attendance"),
        api.get("/api/employees"),
      ]);
      const pick = (i) => results[i].status === "fulfilled" && Array.isArray(results[i].value.data) ? results[i].value.data : [];
      setData({
        vehicles: pick(0), sales: pick(1), purchases: pick(2), reactor: pick(3), customers: pick(4),
        suppliers: pick(5), inventory: pick(6), payments: pick(7), attendance: pick(8), employees: pick(9),
      });
    } catch (e) {
      setError(e?.response?.data?.error || e?.response?.data || "Failed to load report data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  function applyQuickRange(v) {
    setQuickRange(v);
    const today = new Date();
    const iso = (d) => d.toISOString().slice(0, 10);
    if (v === "TODAY") {
      const t = iso(today); setDateFrom(t); setDateTo(t);
    } else if (v === "WEEK") {
      const d = new Date(today); d.setDate(d.getDate() - 6); setDateFrom(iso(d)); setDateTo(iso(today));
    } else if (v === "MONTH") {
      const d = new Date(today.getFullYear(), today.getMonth(), 1); setDateFrom(iso(d)); setDateTo(iso(today));
    } else if (v === "ALL") {
      setDateFrom(""); setDateTo("");
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const match = (obj) => !q || Object.values(obj || {}).some(v => String(v ?? "").toLowerCase().includes(q));
    return {
      vehicles: data.vehicles.filter(v => inRangeDate(v.date, dateFrom, dateTo) && match(v)),
      sales: data.sales.filter(v => inRangeDate(v.date, dateFrom, dateTo) && match(v)),
      purchases: data.purchases.filter(v => inRangeDate(v.date, dateFrom, dateTo) && match(v)),
      reactor: data.reactor.filter(v => inRangeDate(v.date, dateFrom, dateTo) && match(v)),
      payments: data.payments.filter(v => inRangeDate(v.paymentDate, dateFrom, dateTo) && match(v)),
      attendance: data.attendance.filter(v => inRangeDate(v.date, dateFrom, dateTo) && match(v)),
      customers: data.customers.filter(match),
      suppliers: data.suppliers.filter(match),
      inventory: data.inventory.filter(match),
      employees: data.employees.filter(match),
    };
  }, [data, dateFrom, dateTo, search]);

  async function exportFile(type) {
    try {
      setExporting(true); setError(""); setSuccess("");
      const params = new URLSearchParams();
      if (dateFrom) params.append("from", dateFrom);
      if (dateTo) params.append("to", dateTo);
      const qs = params.toString() ? `?${params.toString()}` : "";
      const response = await api.get(`/api/reports/export/${type}${qs}`, { responseType: "blob" });
      const mime = type === "excel" ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "application/pdf";
      const ext = type === "excel" ? "xlsx" : "pdf";
      const blob = new Blob([response.data], { type: mime });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = (dateFrom && dateTo) ? `DHM_Report_${dateFrom}_to_${dateTo}.${ext}` : `DHM_Report.${ext}`;
      document.body.appendChild(link); link.click(); link.remove(); window.URL.revokeObjectURL(url);
      setSuccess(`${type.toUpperCase()} report exported successfully.`);
    } catch (e) {
      setError(e?.response?.data?.error || e?.response?.data || `Failed to export ${type.toUpperCase()} report.`);
    } finally { setExporting(false); }
  }

  function renderTable() {
    const rows = filtered[activeTab] || [];
    const commonEmpty = <div style={{ padding: 16, color: "#64748b" }}>No records found for selected filters.</div>;

    if (activeTab === "vehicles") return rows.length ? (
      <table style={tbl}><thead><tr>{th("Date")}{th("Vehicle No")}{th("Driver")}{th("Party")}{th("Gross/Tare/Net")}{th("Register")}{th("Status")}</tr></thead><tbody>
        {rows.map(r => <tr key={r.id} style={tr}>{td(r.date)}{td(r.vehicleNo)}{td(r.driverName || "-")}{td(r.partyName || "-")}{td(`${r.grossWeight ?? "-"} / ${r.tareWeight ?? "-"} / ${r.netWeight ?? "-"}`)}{td(r.registerType || "-")}{td(r.status || "-")}</tr>)}
      </tbody></table>) : commonEmpty;

    if (activeTab === "sales") return rows.length ? (
      <table style={tbl}><thead><tr>{th("Date")}{th("Invoice")}{th("Customer")}{th("Vehicle")}{th("Commodity")}{th("Net KG")}{th("Grand Total")}{th("Payment")}</tr></thead><tbody>
        {rows.map(r => <tr key={r.id} style={tr}>{td(r.date)}{td(r.invoiceNo || "-")}{td(r.customerName || "-")}{td(r.vehicleNo || "-")}{td(r.commodity || "-")}{td(r.netWeight ?? "-")}{td(r.grandTotal ?? "-")}{td(r.paymentStatus || "-")}</tr>)}
      </tbody></table>) : commonEmpty;

    if (activeTab === "purchases") return rows.length ? (
      <table style={tbl}><thead><tr>{th("Date")}{th("PO No")}{th("Supplier")}{th("Vehicle")}{th("Commodity")}{th("Net KG")}{th("Grand Total")}{th("Payment")}</tr></thead><tbody>
        {rows.map(r => <tr key={r.id} style={tr}>{td(r.date)}{td(r.purchaseOrderNo || "-")}{td(r.supplierName || "-")}{td(r.vehicleNo || "-")}{td(r.commodity || "-")}{td(r.netWeight ?? "-")}{td(r.grandTotal ?? "-")}{td(r.paymentStatus || "-")}</tr>)}
      </tbody></table>) : commonEmpty;

    if (activeTab === "reactor") return rows.length ? (
      <table style={tbl}><thead><tr>{th("ID")}{th("Date")}{th("Start")}{th("End")}{th("Duration")}{th("Responsible")}{th("Related")}{th("Notes")}</tr></thead><tbody>
        {rows.map(r => <tr key={r.id} style={tr}>{td(r.id)}{td(r.date)}{td(r.startTime || r.reactor1Time || "-")}{td(r.endTime || r.reactor2Time || "-")}{td(r.durationText || "-")}{td(r.responsibleUser || r.operatorName || "-")}{td(r.relatedTransactionType ? `${r.relatedTransactionType}${r.relatedTransactionId ? ` #${r.relatedTransactionId}` : ""}` : "-")}{td(r.remarks || "-")}</tr>)}
      </tbody></table>) : commonEmpty;

    if (activeTab === "customers") return rows.length ? (
      <table style={tbl}><thead><tr>{th("Code")}{th("Name")}{th("Phone")}{th("Email")}{th("GSTIN")}{th("Status")}</tr></thead><tbody>
        {rows.map(r => <tr key={r.id} style={tr}>{td(r.customerCode || "-")}{td(r.name || "-")}{td(r.phone || "-")}{td(r.email || "-")}{td(r.gstin || "-")}{td(r.status || "-")}</tr>)}
      </tbody></table>) : commonEmpty;

    if (activeTab === "suppliers") return rows.length ? (
      <table style={tbl}><thead><tr>{th("Code")}{th("Name")}{th("Phone")}{th("Email")}{th("GSTIN")}{th("Status")}</tr></thead><tbody>
        {rows.map(r => <tr key={r.id} style={tr}>{td(r.supplierCode || "-")}{td(r.name || "-")}{td(r.phone || "-")}{td(r.email || "-")}{td(r.gstin || "-")}{td(r.status || "-")}</tr>)}
      </tbody></table>) : commonEmpty;

    if (activeTab === "inventory") return rows.length ? (
      <table style={tbl}><thead><tr>{th("Code")}{th("Name")}{th("Category")}{th("Unit")}{th("Current Stock")}{th("Min Alert")}</tr></thead><tbody>
        {rows.map(r => <tr key={r.id} style={tr}>{td(r.itemCode || "-")}{td(r.name || "-")}{td(r.category || "-")}{td(r.unit || "-")}{td(r.currentStock ?? "-")}{td(r.minStockAlert ?? "-")}</tr>)}
      </tbody></table>) : commonEmpty;

    if (activeTab === "payments") return rows.length ? (
      <table style={tbl}><thead><tr>{th("Date")}{th("Type")}{th("Party")}{th("Amount")}{th("Method")}{th("Txn Ref")}{th("Recorded By")}</tr></thead><tbody>
        {rows.map(r => <tr key={r.id} style={tr}>{td(r.paymentDate)}{td(r.paymentType || "-")}{td(r.partyName || "-")}{td(r.amount ?? "-")}{td(r.paymentMethod || "-")}{td(r.transactionRef || r.referenceNo || "-")}{td(r.recordedBy || "-")}</tr>)}
      </tbody></table>) : commonEmpty;

    if (activeTab === "attendance") return rows.length ? (
      <table style={tbl}><thead><tr>{th("Date")}{th("Employee")}{th("Department")}{th("Shift")}{th("Status")}{th("Remarks")}</tr></thead><tbody>
        {rows.map(r => <tr key={r.id} style={tr}>{td(r.date)}{td(r.employeeName || r.employeeId || "-")}{td(r.department || "-")}{td(r.shift || "-")}{td(r.status || "-")}{td(r.remarks || "-")}</tr>)}
      </tbody></table>) : commonEmpty;

    if (activeTab === "employees") return rows.length ? (
      <table style={tbl}><thead><tr>{th("Code")}{th("Name")}{th("Department")}{th("Designation")}{th("Joining Date")}{th("Status")}</tr></thead><tbody>
        {rows.map(r => <tr key={r.id} style={tr}>{td(r.employeeCode || "-")}{td(r.name || "-")}{td(r.department || "-")}{td(r.designation || "-")}{td(r.joiningDate || "-")}{td(r.status || "-")}</tr>)}
      </tbody></table>) : commonEmpty;

    return commonEmpty;
  }

  const activeRows = filtered[activeTab] || [];

  return (
    <div className="page-container" style={{ paddingBottom: 30 }}>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>Reports & Exports</h1>
          <p className="page-subtitle" style={{ margin: "4px 0 0", color: "#64748b" }}>
            Central reporting hub with date ranges, search/filters, live module views, Excel/PDF export, and print.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="secondary-button" onClick={loadAll} disabled={loading}>{loading ? "Loading..." : "Refresh Data"}</button>
          <button className="secondary-button" onClick={() => window.print()}>Print</button>
          <button className="primary-button" onClick={() => exportFile("excel")} disabled={exporting}>Export Excel</button>
          <button className="primary-button" onClick={() => exportFile("pdf")} disabled={exporting}>Export PDF</button>
        </div>
      </div>

      {error && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", padding: 10, borderRadius: 8, marginBottom: 12 }}>{String(error)}</div>}
      {success && <div style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", color: "#065f46", padding: 10, borderRadius: 8, marginBottom: 12 }}>{success}</div>}

      <div className="card" style={{ padding: 16, border: "1px solid #e2e8f0", borderRadius: 10, background: "#fff", marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, alignItems: "end" }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600 }}>Quick Range</label>
            <select value={quickRange} onChange={(e) => applyQuickRange(e.target.value)} style={inp}>
              <option value="CUSTOM">Custom</option>
              <option value="TODAY">Today</option>
              <option value="WEEK">Last 7 Days</option>
              <option value="MONTH">This Month</option>
              <option value="ALL">All Time</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600 }}>From Date</label>
            <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setQuickRange("CUSTOM"); }} style={inp} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600 }}>To Date</label>
            <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setQuickRange("CUSTOM"); }} style={inp} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600 }}>Search (current module)</label>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search records..." style={inp} />
          </div>
        </div>
        <div style={{ marginTop: 10, fontSize: 12, color: "#64748b" }}>
          Range: <strong>{dateFrom || "Earliest"}</strong> to <strong>{dateTo || "Latest"}</strong> | Export uses backend date-filtered Excel/PDF generation with company branding.
        </div>
      </div>

      <div className="card" style={{ padding: 12, border: "1px solid #e2e8f0", borderRadius: 10, background: "#fff", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #cbd5e1", background: activeTab === t.key ? "#2563eb" : "#fff", color: activeTab === t.key ? "#fff" : "#334155", cursor: "pointer", fontWeight: 600 }}>
              {t.label} ({(filtered[t.key] || []).length})
            </button>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: 16, border: "1px solid #e2e8f0", borderRadius: 10, background: "#fff" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>{tabs.find(t => t.key === activeTab)?.label} Report</h3>
          <div style={{ fontSize: 12, color: "#64748b" }}>{activeRows.length} record(s) shown</div>
        </div>
        <div style={{ overflowX: "auto" }}>{renderTable()}</div>
      </div>
    </div>
  );
}

const inp = { width: "100%", padding: 8, border: "1px solid #cbd5e1", borderRadius: 6 };
const tbl = { width: "100%", borderCollapse: "collapse", fontSize: 13 };
const tr = { borderBottom: "1px solid #f1f5f9" };
function th(label) { return <th style={{ padding: 10, textAlign: "left", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>{label}</th>; }
function td(value) { return <td style={{ padding: 10, verticalAlign: "top" }}>{value ?? "-"}</td>; }