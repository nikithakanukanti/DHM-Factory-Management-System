import { useEffect, useState } from "react";
import api from "../api";

function Reports() {
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const [stats, setStats] = useState({
        vehicles: 0,
        sales: 0,
        purchases: 0,
        reactor: 0,
        totalSalesWeightKg: 0,
        totalPurchasesWeightKg: 0
    });

    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");

    useEffect(() => {
        loadReportData();
    }, []);

    async function loadReportData() {
        setLoading(true);
        setError("");

        try {
            const res = await api.get("/api/dashboard/stats");
            if (res.data) {
                setStats({
                    vehicles: res.data.vehicles || 0,
                    sales: res.data.sales || 0,
                    purchases: res.data.purchases || 0,
                    reactor: res.data.reactorTimings || 0,
                    totalSalesWeightKg: res.data.totalSalesWeightKg || 0,
                    totalPurchasesWeightKg: res.data.totalPurchasesWeightKg || 0
                });
            }
        } catch (err) {
            console.error("Report loading error:", err);
            setError("Unable to load latest metrics.");
        } finally {
            setLoading(false);
        }
    }

    async function exportExcel() {
        try {
            setExporting(true);
            setError("");
            setSuccess("");

            const params = new URLSearchParams();
            if (dateFrom) params.append("from", dateFrom);
            if (dateTo) params.append("to", dateTo);
            const qs = params.toString() ? `?${params.toString()}` : "";

            const response = await api.get(`/api/reports/export/excel${qs}`, {
                responseType: "blob"
            });

            const blob = new Blob([response.data], {
                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = (dateFrom && dateTo) ? `DHM_Report_${dateFrom}_to_${dateTo}.xlsx` : "DHM_Report.xlsx";
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            setSuccess("Excel report generated and downloaded successfully.");
        } catch (err) {
            console.error("Excel export failed:", err);
            setError("Unable to export Excel report. Please verify connection.");
        } finally {
            setExporting(false);
        }
    }

    async function exportPdf() {
        try {
            setExporting(true);
            setError("");
            setSuccess("");

            const params = new URLSearchParams();
            if (dateFrom) params.append("from", dateFrom);
            if (dateTo) params.append("to", dateTo);
            const qs = params.toString() ? `?${params.toString()}` : "";

            const response = await api.get(`/api/reports/export/pdf${qs}`, {
                responseType: "blob"
            });

            const blob = new Blob([response.data], { type: "application/pdf" });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = (dateFrom && dateTo) ? `DHM_Report_${dateFrom}_to_${dateTo}.pdf` : "DHM_Report.pdf";
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            setSuccess("PDF report generated and downloaded successfully.");
        } catch (err) {
            console.error("PDF export failed:", err);
            setError("Unable to export PDF report. Please verify connection.");
        } finally {
            setExporting(false);
        }
    }

    function clearDates() {
        setDateFrom("");
        setDateTo("");
        setError("");
        setSuccess("");
    }

    return (
        <div className="reports-page">

            {/* PAGE HEADER */}
            <div className="page-header">
                <div>
                    <h1>OPERATIONS & EXPORT REPORTS</h1>
                    <p>Generate filtered Excel and PDF reports for audit & client review</p>
                </div>

                <button
                    type="button"
                    className="secondary-button"
                    onClick={loadReportData}
                    disabled={loading || exporting}
                >
                    {loading ? "Loading..." : "Refresh Stats"}
                </button>
            </div>

            {/* NOTIFICATIONS */}
            {success && (
                <div className="success-message" style={{ marginBottom: "20px" }}>
                    ✓ {success}
                </div>
            )}

            {error && (
                <div className="error-message" style={{ marginBottom: "20px" }}>
                    ⚠ {error}
                </div>
            )}

            {/* EXPORT CONTROL CARD */}
            <div className="card">
                <div className="section-header">
                    <div>
                        <h2>Export Parameters</h2>
                        <p>Filter by date range or export complete factory history</p>
                    </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", alignItems: "end" }}>
                    <div className="form-group" style={{ margin: 0 }}>
                        <label>Start Date (From)</label>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                        />
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                        <label>End Date (To)</label>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                        />
                    </div>

                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                        <button
                            type="button"
                            className="primary-button"
                            onClick={exportExcel}
                            disabled={exporting}
                            style={{ background: "#15803d", borderColor: "#166534" }}
                        >
                            📊 Export Excel
                        </button>

                        <button
                            type="button"
                            className="primary-button"
                            onClick={exportPdf}
                            disabled={exporting}
                            style={{ background: "#b91c1c", borderColor: "#991b1b" }}
                        >
                            📑 Export PDF
                        </button>

                        {(dateFrom || dateTo) && (
                            <button
                                type="button"
                                className="secondary-button"
                                onClick={clearDates}
                                disabled={exporting}
                            >
                                Clear Dates
                            </button>
                        )}
                    </div>
                </div>

                {dateFrom && dateTo && (
                    <div style={{ marginTop: "16px", fontSize: "13px", color: "#475569" }}>
                        Active filter: <strong>{dateFrom}</strong> to <strong>{dateTo}</strong>
                    </div>
                )}
            </div>

            {/* METRICS SUMMARY */}
            <div className="card" style={{ marginTop: "25px" }}>
                <div className="section-header">
                    <div>
                        <h2>System Record Counts</h2>
                        <p>Total historical entries captured across modules</p>
                    </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
                    <div style={{ padding: "20px", border: "1px solid #e5e7eb", borderRadius: "10px", background: "#f8fafc" }}>
                        <div style={{ color: "#6b7280", fontSize: "13px", marginBottom: "8px" }}>Total Vehicles Logged</div>
                        <strong style={{ fontSize: "28px", color: "#1e293b" }}>{stats.vehicles}</strong>
                        <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>Weighbridge Entries</div>
                    </div>

                    <div style={{ padding: "20px", border: "1px solid #e5e7eb", borderRadius: "10px", background: "#f8fafc" }}>
                        <div style={{ color: "#6b7280", fontSize: "13px", marginBottom: "8px" }}>Total Sales Dispatches</div>
                        <strong style={{ fontSize: "28px", color: "#0369a1" }}>{stats.sales}</strong>
                        <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                            {Number(stats.totalSalesWeightKg).toLocaleString()} KG Dispatched
                        </div>
                    </div>

                    <div style={{ padding: "20px", border: "1px solid #e5e7eb", borderRadius: "10px", background: "#f8fafc" }}>
                        <div style={{ color: "#6b7280", fontSize: "13px", marginBottom: "8px" }}>Total Raw Material Inwards</div>
                        <strong style={{ fontSize: "28px", color: "#0f766e" }}>{stats.purchases}</strong>
                        <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                            {Number(stats.totalPurchasesWeightKg).toLocaleString()} KG Received
                        </div>
                    </div>

                    <div style={{ padding: "20px", border: "1px solid #e5e7eb", borderRadius: "10px", background: "#f8fafc" }}>
                        <div style={{ color: "#6b7280", fontSize: "13px", marginBottom: "8px" }}>Reactor Batches</div>
                        <strong style={{ fontSize: "28px", color: "#b45309" }}>{stats.reactor}</strong>
                        <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>Operating Logs</div>
                    </div>
                </div>
            </div>

        </div>
    );
}

export default Reports;
