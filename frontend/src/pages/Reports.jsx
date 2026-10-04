import axios from "axios";
import { useEffect, useState } from "react";

const API_URL = "http://localhost:8090";

function Reports() {
    const [activeReport, setActiveReport] = useState("overview");
    const [loading, setLoading] = useState(false);

    const [stats, setStats] = useState({
        vehicles: 0,
        sales: 0,
        purchases: 0,
        reactor: 0
    });

    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");

    useEffect(() => {
        loadReportData();
    }, []);

    async function loadReportData() {
        setLoading(true);

        try {
            const results = await Promise.allSettled([
                axios.get(`${API_URL}/api/vehicles`, {
                    withCredentials: true
                }),
                axios.get(`${API_URL}/api/sales`, {
                    withCredentials: true
                }),
                axios.get(`${API_URL}/api/purchases`, {
                    withCredentials: true
                }),
                axios.get(`${API_URL}/api/reactor-timings`, {
                    withCredentials: true
                })
            ]);

            setStats({
                vehicles:
                    results[0].status === "fulfilled"
                        ? results[0].value.data.length
                        : 0,

                sales:
                    results[1].status === "fulfilled"
                        ? results[1].value.data.length
                        : 0,

                purchases:
                    results[2].status === "fulfilled"
                        ? results[2].value.data.length
                        : 0,

                reactor:
                    results[3].status === "fulfilled"
                        ? results[3].value.data.length
                        : 0
            });

        } catch (error) {
            console.error("Report loading error:", error);
        } finally {
            setLoading(false);
        }
    }

    async function exportExcel() {
        try {
            const response = await axios.get(
                `${API_URL}/api/reports/export/excel`,
                {
                    withCredentials: true,
                    responseType: "blob"
                }
            );

            const url = window.URL.createObjectURL(
                new Blob([response.data], {
                    type:
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                })
            );

            const link = document.createElement("a");

            link.href = url;
            link.download = "DHM_Report.xlsx";

            document.body.appendChild(link);
            link.click();
            link.remove();

            window.URL.revokeObjectURL(url);

        } catch (error) {
            console.error("Excel export failed:", error);
            alert("Unable to export Excel report.");
        }
    }

    async function exportPdf() {
        try {
            const response = await axios.get(
                `${API_URL}/api/reports/export/pdf`,
                {
                    withCredentials: true,
                    responseType: "blob"
                }
            );

            const url = window.URL.createObjectURL(
                new Blob([response.data], {
                    type: "application/pdf"
                })
            );

            const link = document.createElement("a");

            link.href = url;
            link.download = "DHM_Report.pdf";

            document.body.appendChild(link);
            link.click();
            link.remove();

            window.URL.revokeObjectURL(url);

        } catch (error) {
            console.error("PDF export failed:", error);
            alert("Unable to export PDF report.");
        }
    }

    function clearDates() {
        setDateFrom("");
        setDateTo("");
    }

    return (
        <div className="reports-page">

            {/* PAGE HEADER */}
            <div className="reports-header">

                <div>
                    <span className="page-kicker">
                        ADMINISTRATION / REPORTS
                    </span>

                    <h1>
                        Reports & Analytics
                    </h1>

                    <p>
                        View factory records and generate
                        downloadable management reports.
                    </p>
                </div>

                <div className="reports-header-status">
                    <span className="status-dot"></span>

                    <div>
                        <strong>
                            Reporting System
                        </strong>

                        <small>
                            Ready
                        </small>
                    </div>
                </div>

            </div>

            {/* REPORT TABS */}
            <div className="report-tabs">

                <button
                    className={
                        activeReport === "overview"
                            ? "report-tab active"
                            : "report-tab"
                    }
                    onClick={() =>
                        setActiveReport("overview")
                    }
                >
                    <span>▦</span>
                    Overview
                </button>

                <button
                    className={
                        activeReport === "vehicle"
                            ? "report-tab active"
                            : "report-tab"
                    }
                    onClick={() =>
                        setActiveReport("vehicle")
                    }
                >
                    <span>🚛</span>
                    Vehicle
                </button>

                <button
                    className={
                        activeReport === "sales"
                            ? "report-tab active"
                            : "report-tab"
                    }
                    onClick={() =>
                        setActiveReport("sales")
                    }
                >
                    <span>↗</span>
                    Sales
                </button>

                <button
                    className={
                        activeReport === "purchase"
                            ? "report-tab active"
                            : "report-tab"
                    }
                    onClick={() =>
                        setActiveReport("purchase")
                    }
                >
                    <span>↙</span>
                    Purchase
                </button>

                <button
                    className={
                        activeReport === "reactor"
                            ? "report-tab active"
                            : "report-tab"
                    }
                    onClick={() =>
                        setActiveReport("reactor")
                    }
                >
                    <span>◷</span>
                    Reactor Timing
                </button>

            </div>

            {/* FILTER CARD */}
            <div className="report-filter-card">

                <div className="filter-heading">

                    <div className="filter-icon">
                        ⚙
                    </div>

                    <div>
                        <h3>
                            Report Filters
                        </h3>

                        <p>
                            Select a date range for your report.
                        </p>
                    </div>

                </div>

                <div className="filter-fields">

                    <div className="report-date-field">

                        <label>
                            FROM DATE
                        </label>

                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) =>
                                setDateFrom(e.target.value)
                            }
                        />

                    </div>

                    <div className="report-date-field">

                        <label>
                            TO DATE
                        </label>

                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) =>
                                setDateTo(e.target.value)
                            }
                        />

                    </div>

                    <button
                        className="filter-clear-button"
                        onClick={clearDates}
                    >
                        Clear
                    </button>

                </div>

            </div>

            {/* STATISTICS */}
            <div className="report-stat-grid">

                <div className="report-stat-card">

                    <div className="report-stat-top">
                        <span>VEHICLE RECORDS</span>

                        <div className="report-stat-icon blue">
                            🚛
                        </div>
                    </div>

                    <strong>
                        {loading ? "..." : stats.vehicles}
                    </strong>

                    <p>
                        Total vehicle entries
                    </p>

                    <div className="report-progress">
                        <span style={{ width: "78%" }}></span>
                    </div>

                </div>

                <div className="report-stat-card">

                    <div className="report-stat-top">
                        <span>SALES RECORDS</span>

                        <div className="report-stat-icon green">
                            ↗
                        </div>
                    </div>

                    <strong>
                        {loading ? "..." : stats.sales}
                    </strong>

                    <p>
                        Total sales entries
                    </p>

                    <div className="report-progress green">
                        <span style={{ width: "64%" }}></span>
                    </div>

                </div>

                <div className="report-stat-card">

                    <div className="report-stat-top">
                        <span>PURCHASE RECORDS</span>

                        <div className="report-stat-icon orange">
                            ↙
                        </div>
                    </div>

                    <strong>
                        {loading ? "..." : stats.purchases}
                    </strong>

                    <p>
                        Total purchase entries
                    </p>

                    <div className="report-progress orange">
                        <span style={{ width: "52%" }}></span>
                    </div>

                </div>

                <div className="report-stat-card">

                    <div className="report-stat-top">
                        <span>REACTOR RECORDS</span>

                        <div className="report-stat-icon purple">
                            ◷
                        </div>
                    </div>

                    <strong>
                        {loading ? "..." : stats.reactor}
                    </strong>

                    <p>
                        Total timing entries
                    </p>

                    <div className="report-progress purple">
                        <span style={{ width: "43%" }}></span>
                    </div>

                </div>

            </div>

            {/* MAIN REPORT AREA */}
            <div className="reports-content-grid">

                {/* REPORT PREVIEW */}
                <div className="report-preview-card">

                    <div className="report-card-header">

                        <div>
                            <span className="panel-kicker">
                                REPORT PREVIEW
                            </span>

                            <h2>
                                {activeReport === "overview" &&
                                    "Factory Summary"}

                                {activeReport === "vehicle" &&
                                    "Vehicle Register"}

                                {activeReport === "sales" &&
                                    "Sales Register"}

                                {activeReport === "purchase" &&
                                    "Purchase Register"}

                                {activeReport === "reactor" &&
                                    "Reactor Timing Register"}
                            </h2>
                        </div>

                        <span className="preview-badge">
                            LIVE DATA
                        </span>

                    </div>

                    <div className="report-preview-body">

                        {activeReport === "overview" && (
                            <>

                                <div className="summary-row">
                                    <div>
                                        <span>
                                            Vehicle Entries
                                        </span>

                                        <strong>
                                            {stats.vehicles}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>
                                            Sales Entries
                                        </span>

                                        <strong>
                                            {stats.sales}
                                        </strong>
                                    </div>
                                </div>

                                <div className="summary-row">
                                    <div>
                                        <span>
                                            Purchase Entries
                                        </span>

                                        <strong>
                                            {stats.purchases}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>
                                            Reactor Timings
                                        </span>

                                        <strong>
                                            {stats.reactor}
                                        </strong>
                                    </div>
                                </div>

                            </>
                        )}

                        {activeReport === "vehicle" && (
                            <div className="report-placeholder">

                                <div>🚛</div>

                                <h3>
                                    Vehicle Register Report
                                </h3>

                                <p>
                                    The exported report contains
                                    vehicle date, vehicle number,
                                    gross weight, tare weight,
                                    net weight, local/imported
                                    status and remarks.
                                </p>

                            </div>
                        )}

                        {activeReport === "sales" && (
                            <div className="report-placeholder">

                                <div>↗</div>

                                <h3>
                                    Sales Register Report
                                </h3>

                                <p>
                                    The exported report contains
                                    sales date, vehicle number,
                                    weights, commodity and remarks.
                                </p>

                            </div>
                        )}

                        {activeReport === "purchase" && (
                            <div className="report-placeholder">

                                <div>↙</div>

                                <h3>
                                    Purchase Register Report
                                </h3>

                                <p>
                                    The exported report contains
                                    purchase date, net weight,
                                    commodity and remarks.
                                </p>

                            </div>
                        )}

                        {activeReport === "reactor" && (
                            <div className="report-placeholder">

                                <div>◷</div>

                                <h3>
                                    Reactor Timing Report
                                </h3>

                                <p>
                                    The exported report contains
                                    reactor timing records.
                                </p>

                            </div>
                        )}

                    </div>

                </div>

                {/* EXPORT PANEL */}
                <div className="export-panel">

                    <div className="export-panel-header">

                        <div className="export-big-icon">
                            ↓
                        </div>

                        <h2>
                            Export Reports
                        </h2>

                        <p>
                            Download complete factory
                            records for management use.
                        </p>

                    </div>

                    <div className="export-options">

                        <button
                            className="export-option excel"
                            onClick={exportExcel}
                        >

                            <div className="export-file-icon">
                                XLS
                            </div>

                            <div>
                                <strong>
                                    Excel Report
                                </strong>

                                <small>
                                    Complete workbook
                                </small>
                            </div>

                            <span>
                                →
                            </span>

                        </button>

                        <button
                            className="export-option pdf"
                            onClick={exportPdf}
                        >

                            <div className="export-file-icon">
                                PDF
                            </div>

                            <div>
                                <strong>
                                    PDF Report
                                </strong>

                                <small>
                                    Printable document
                                </small>
                            </div>

                            <span>
                                →
                            </span>

                        </button>

                    </div>

                    <div className="export-note">

                        <span>ⓘ</span>

                        <p>
                            Reports contain the latest
                            available records from the
                            DHM database.
                        </p>

                    </div>

                </div>

            </div>

        </div>
    );
}

export default Reports;