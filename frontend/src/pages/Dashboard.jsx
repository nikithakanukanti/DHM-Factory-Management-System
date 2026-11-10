import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";

function formatCurrency(val) {
    const num = Number(val) || 0;
    return "₹" + num.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function formatWeight(val) {
    const num = Number(val) || 0;
    if (num >= 1000) {
        return `${(num / 1000).toFixed(2)} MT (${num.toLocaleString("en-IN")} KG)`;
    }
    return `${num.toLocaleString("en-IN")} KG`;
}

function Dashboard() {
    const [stats, setStats] = useState({
        vehicles: 0,
        sales: 0,
        purchases: 0,
        reactorTimings: 0,
        customers: 0,
        suppliers: 0,
        employees: 0,
        items: 0,
        lowStockCount: 0,
        lowStockItems: [],
        totalInventoryStockKg: 0,
        todayVehicles: 0,
        vehiclesInsideCount: 0,
        todaySales: 0,
        todaySalesAmount: 0,
        todayPurchases: 0,
        todayPurchasesAmount: 0,
        todayReactorTimings: 0,
        pendingCustomerReceivables: 0,
        pendingSupplierPayables: 0,
        totalSalesWeightKg: 0,
        totalPurchasesWeightKg: 0,
        totalSalesRevenue: 0,
        totalPurchaseExpense: 0,
        weeklyTrend: [],
        recentVehicles: [],
        recentSales: [],
        recentPurchases: []
    });

    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("all");
    const [currentTime, setCurrentTime] = useState(() => new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" }));

    useEffect(() => {
        loadDashboard();
        const timer = setInterval(() => {
            setCurrentTime(new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" }));
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    async function loadDashboard() {
        try {
            setLoading(true);
            const response = await api.get("/api/dashboard/stats");
            if (response.data) {
                setStats(prev => ({
                    ...prev,
                    ...response.data
                }));
            }
        } catch (error) {
            console.error("Dashboard loading error:", error);
        } finally {
            setLoading(false);
        }
    }

    const weeklyTrend = Array.isArray(stats.weeklyTrend) ? stats.weeklyTrend : [];
    const maxBarValue = Math.max(
        ...weeklyTrend.map(d => Math.max(Number(d.vehicles) || 0, Number(d.sales) || 0, Number(d.purchases) || 0)),
        1
    );

    return (
        <div className="dashboard-page" style={{ paddingBottom: "40px" }}>

            {/* TOP HEADER */}
            <div className="page-heading" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px", marginBottom: "20px" }}>
                <div>
                    <span className="page-kicker" style={{ color: "#2563eb", fontWeight: "700", letterSpacing: "1px", fontSize: "12px", textTransform: "uppercase" }}>
                        DHM PYROTECH ENTERPRISES • FACTORY MANAGEMENT SYSTEM
                    </span>
                    <h1 style={{ margin: "4px 0 6px", fontSize: "28px", color: "#0f172a", fontWeight: "800" }}>Operations Dashboard</h1>
                    <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>
                        Real-time plant analytics, weighbridge throughput, production registers, and balance summaries.
                    </p>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                    <div style={{
                        padding: "8px 14px",
                        background: "#f0fdf4",
                        border: "1px solid #bbf7d0",
                        borderRadius: "8px",
                        fontSize: "13px",
                        color: "#166534",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px"
                    }}>
                        <span style={{ height: "8px", width: "8px", borderRadius: "50%", background: "#22c55e", display: "inline-block" }}></span>
                        <span>Plant Live (IST): <strong>{currentTime}</strong></span>
                    </div>

                    <button
                        onClick={loadDashboard}
                        disabled={loading}
                        style={{
                            padding: "8px 14px",
                            background: "#fff",
                            border: "1px solid #cbd5e1",
                            borderRadius: "8px",
                            cursor: "pointer",
                            fontSize: "13px",
                            fontWeight: "600",
                            color: "#334155"
                        }}
                    >
                        {loading ? "Refreshing..." : "↻ Refresh Data"}
                    </button>
                </div>
            </div>

            {/* LIVE SHIFT HIGHLIGHT STRIP */}
            <div style={{
                background: "linear-gradient(135deg, #0f2b48 0%, #1e4b7a 100%)",
                color: "#ffffff",
                borderRadius: "12px",
                padding: "20px 24px",
                marginBottom: "24px",
                boxShadow: "0 10px 15px -3px rgba(15, 23, 42, 0.08)"
            }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "20px" }}>
                    <div>
                        <div style={{ fontSize: "11px", letterSpacing: "1.5px", textTransform: "uppercase", color: "#93c5fd" }}>
                            CURRENT SHIFT ACTIVITY (TODAY)
                        </div>
                        <h2 style={{ fontSize: "24px", margin: "4px 0 0", color: "#fff", fontWeight: "700" }}>
                            {loading ? "..." : `${stats.todayVehicles} Vehicles Entered`}
                            <span style={{ fontSize: "15px", fontWeight: "400", opacity: 0.85, marginLeft: "12px" }}>
                                ({stats.vehiclesInsideCount} currently inside factory)
                            </span>
                        </h2>
                    </div>

                    <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
                        <div style={{ borderLeft: "2px solid rgba(255,255,255,0.15)", paddingLeft: "16px" }}>
                            <span style={{ fontSize: "12px", color: "#cbd5e1", display: "block" }}>Today's Sales</span>
                            <strong style={{ fontSize: "20px", color: "#86efac" }}>{stats.todaySales}</strong>
                            <small style={{ display: "block", color: "#e2e8f0", fontSize: "11px" }}>{formatCurrency(stats.todaySalesAmount)}</small>
                        </div>

                        <div style={{ borderLeft: "2px solid rgba(255,255,255,0.15)", paddingLeft: "16px" }}>
                            <span style={{ fontSize: "12px", color: "#cbd5e1", display: "block" }}>Today's Inward</span>
                            <strong style={{ fontSize: "20px", color: "#fbcfe8" }}>{stats.todayPurchases}</strong>
                            <small style={{ display: "block", color: "#e2e8f0", fontSize: "11px" }}>{formatCurrency(stats.todayPurchasesAmount)}</small>
                        </div>

                        <div style={{ borderLeft: "2px solid rgba(255,255,255,0.15)", paddingLeft: "16px" }}>
                            <span style={{ fontSize: "12px", color: "#cbd5e1", display: "block" }}>Reactor Runs</span>
                            <strong style={{ fontSize: "20px", color: "#fef08a" }}>{stats.todayReactorTimings}</strong>
                            <small style={{ display: "block", color: "#e2e8f0", fontSize: "11px" }}>Batches logged</small>
                        </div>
                    </div>
                </div>
            </div>

            {/* QUICK ACTIONS HUB */}
            <div style={{ marginBottom: "25px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                    <h3 style={{ margin: 0, fontSize: "15px", color: "#334155", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        ⚡ Quick Action Hub
                    </h3>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
                    <Link
                        to="/vehicle-register"
                        style={{
                            padding: "14px",
                            borderRadius: "10px",
                            border: "1px solid #bfdbfe",
                            background: "#eff6ff",
                            textDecoration: "none",
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                            transition: "transform 0.15s, box-shadow 0.15s"
                        }}
                    >
                        <span style={{ fontSize: "24px" }}>🚛</span>
                        <div>
                            <strong style={{ display: "block", fontSize: "14px", color: "#1e3a8a" }}>+ Log Vehicle</strong>
                            <span style={{ fontSize: "11px", color: "#3b82f6" }}>Gate weighbridge</span>
                        </div>
                    </Link>

                    <Link
                        to="/sales-register"
                        style={{
                            padding: "14px",
                            borderRadius: "10px",
                            border: "1px solid #bbf7d0",
                            background: "#f0fdf4",
                            textDecoration: "none",
                            display: "flex",
                            alignItems: "center",
                            gap: "12px"
                        }}
                    >
                        <span style={{ fontSize: "24px" }}>↗</span>
                        <div>
                            <strong style={{ display: "block", fontSize: "14px", color: "#166534" }}>+ Record Sale</strong>
                            <span style={{ fontSize: "11px", color: "#16a34a" }}>Outward dispatch</span>
                        </div>
                    </Link>

                    <Link
                        to="/purchase-register"
                        style={{
                            padding: "14px",
                            borderRadius: "10px",
                            border: "1px solid #e9d5ff",
                            background: "#faf5ff",
                            textDecoration: "none",
                            display: "flex",
                            alignItems: "center",
                            gap: "12px"
                        }}
                    >
                        <span style={{ fontSize: "24px" }}>↙</span>
                        <div>
                            <strong style={{ display: "block", fontSize: "14px", color: "#6b21a8" }}>+ Purchase Inward</strong>
                            <span style={{ fontSize: "11px", color: "#9333ea" }}>Tyres & Scrap</span>
                        </div>
                    </Link>

                    <Link
                        to="/reactor-timing"
                        style={{
                            padding: "14px",
                            borderRadius: "10px",
                            border: "1px solid #fed7aa",
                            background: "#fff7ed",
                            textDecoration: "none",
                            display: "flex",
                            alignItems: "center",
                            gap: "12px"
                        }}
                    >
                        <span style={{ fontSize: "24px" }}>◷</span>
                        <div>
                            <strong style={{ display: "block", fontSize: "14px", color: "#9a3412" }}>+ Reactor Batch</strong>
                            <span style={{ fontSize: "11px", color: "#ea580c" }}>Pyrolysis shift log</span>
                        </div>
                    </Link>

                    <Link
                        to="/reports"
                        style={{
                            padding: "14px",
                            borderRadius: "10px",
                            border: "1px solid #cbd5e1",
                            background: "#f8fafc",
                            textDecoration: "none",
                            display: "flex",
                            alignItems: "center",
                            gap: "12px"
                        }}
                    >
                        <span style={{ fontSize: "24px" }}>📄</span>
                        <div>
                            <strong style={{ display: "block", fontSize: "14px", color: "#334155" }}>Export Reports</strong>
                            <span style={{ fontSize: "11px", color: "#64748b" }}>Excel & PDF audit</span>
                        </div>
                    </Link>
                </div>
            </div>

            {/* PRIMARY METRICS GRID */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px", marginBottom: "25px" }}>

                {/* 1. WEIGHBRIDGE VEHICLES */}
                <div className="card" style={{ padding: "18px", borderRadius: "10px", border: "1px solid #e2e8f0", background: "#fff" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                        <span style={{ fontSize: "12px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>TOTAL VEHICLES</span>
                        <span style={{ padding: "4px 8px", background: "#eff6ff", color: "#2563eb", borderRadius: "6px", fontSize: "18px" }}>🚛</span>
                    </div>
                    <div style={{ fontSize: "28px", fontWeight: "800", color: "#0f172a" }}>
                        {loading ? "..." : stats.vehicles}
                    </div>
                    <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                        Today: <strong style={{ color: "#2563eb" }}>{stats.todayVehicles} entries</strong> ({stats.vehiclesInsideCount} inside plant)
                    </div>
                </div>

                {/* 2. SALES DISPATCHES */}
                <div className="card" style={{ padding: "18px", borderRadius: "10px", border: "1px solid #e2e8f0", background: "#fff" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                        <span style={{ fontSize: "12px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>SALES REVENUE</span>
                        <span style={{ padding: "4px 8px", background: "#f0fdf4", color: "#16a34a", borderRadius: "6px", fontSize: "18px" }}>↗</span>
                    </div>
                    <div style={{ fontSize: "26px", fontWeight: "800", color: "#15803d" }}>
                        {loading ? "..." : formatCurrency(stats.totalSalesRevenue)}
                    </div>
                    <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                        Total Dispatched: <strong>{formatWeight(stats.totalSalesWeightKg)}</strong>
                    </div>
                </div>

                {/* 3. PURCHASES & INWARD */}
                <div className="card" style={{ padding: "18px", borderRadius: "10px", border: "1px solid #e2e8f0", background: "#fff" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                        <span style={{ fontSize: "12px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>PURCHASE EXPENSE</span>
                        <span style={{ padding: "4px 8px", background: "#faf5ff", color: "#9333ea", borderRadius: "6px", fontSize: "18px" }}>↙</span>
                    </div>
                    <div style={{ fontSize: "26px", fontWeight: "800", color: "#7e22ce" }}>
                        {loading ? "..." : formatCurrency(stats.totalPurchaseExpense)}
                    </div>
                    <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                        Total Inward: <strong>{formatWeight(stats.totalPurchasesWeightKg)}</strong>
                    </div>
                </div>

                {/* 4. PENDING BALANCES */}
                <div className="card" style={{ padding: "18px", borderRadius: "10px", border: "1px solid #e2e8f0", background: "#fff" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                        <span style={{ fontSize: "12px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>PENDING RECEIVABLES</span>
                        <span style={{ padding: "4px 8px", background: "#fff7ed", color: "#ea580c", borderRadius: "6px", fontSize: "18px" }}>💳</span>
                    </div>
                    <div style={{ fontSize: "26px", fontWeight: "800", color: "#c2410c" }}>
                        {loading ? "..." : formatCurrency(stats.pendingCustomerReceivables)}
                    </div>
                    <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                        Supplier Payables: <strong>{formatCurrency(stats.pendingSupplierPayables)}</strong>
                    </div>
                </div>

            </div>

            {/* ANALYTICS SECTION: 7-DAY ACTIVITY CHART + INVENTORY OVERVIEW */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "20px", marginBottom: "25px" }}>

                {/* WEEKLY ACTIVITY TREND CHART */}
                <div className="card" style={{ padding: "20px", background: "#fff", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                        <div>
                            <h3 style={{ margin: 0, fontSize: "16px", color: "#1e293b", fontWeight: "700" }}>
                                7-Day Factory Operations Volume
                            </h3>
                            <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748b" }}>
                                Daily gate weighbridge entries, inward receipts, and outward dispatches
                            </p>
                        </div>
                        <div style={{ display: "flex", gap: "12px", fontSize: "11px", fontWeight: "600" }}>
                            <span style={{ display: "flex", alignItems: "center", gap: "4px", color: "#2563eb" }}>
                                <span style={{ width: "10px", height: "10px", background: "#2563eb", borderRadius: "2px" }}></span> Vehicles
                            </span>
                            <span style={{ display: "flex", alignItems: "center", gap: "4px", color: "#16a34a" }}>
                                <span style={{ width: "10px", height: "10px", background: "#16a34a", borderRadius: "2px" }}></span> Sales
                            </span>
                            <span style={{ display: "flex", alignItems: "center", gap: "4px", color: "#9333ea" }}>
                                <span style={{ width: "10px", height: "10px", background: "#9333ea", borderRadius: "2px" }}></span> Purchases
                            </span>
                        </div>
                    </div>

                    {/* CHART BARS */}
                    {weeklyTrend.length === 0 ? (
                        <div style={{ padding: "40px 0", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>
                            Collecting recent shift data...
                        </div>
                    ) : (
                        <div style={{ display: "flex", alignItems: "flex-end", height: "180px", gap: "16px", padding: "10px 0", borderBottom: "1px solid #e2e8f0" }}>
                            {weeklyTrend.map((d, idx) => {
                                const vHeight = Math.max((Number(d.vehicles || 0) / maxBarValue) * 140, 4);
                                const sHeight = Math.max((Number(d.sales || 0) / maxBarValue) * 140, 4);
                                const pHeight = Math.max((Number(d.purchases || 0) / maxBarValue) * 140, 4);

                                return (
                                    <div key={idx} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "flex-end" }}>
                                        <div style={{ display: "flex", alignItems: "flex-end", gap: "4px", width: "100%", justifyContent: "center" }}>
                                            <div
                                                title={`Vehicles: ${d.vehicles}`}
                                                style={{ width: "10px", height: `${vHeight}px`, background: "#2563eb", borderRadius: "3px 3px 0 0", transition: "height 0.3s" }}
                                            />
                                            <div
                                                title={`Sales: ${d.sales}`}
                                                style={{ width: "10px", height: `${sHeight}px`, background: "#16a34a", borderRadius: "3px 3px 0 0", transition: "height 0.3s" }}
                                            />
                                            <div
                                                title={`Purchases: ${d.purchases}`}
                                                style={{ width: "10px", height: `${pHeight}px`, background: "#9333ea", borderRadius: "3px 3px 0 0", transition: "height 0.3s" }}
                                            />
                                        </div>
                                        <span style={{ fontSize: "11px", color: "#64748b", marginTop: "8px", fontWeight: "600" }}>
                                            {d.dayLabel}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* INVENTORY SUMMARY & LOW STOCK ALERTS */}
                <div className="card" style={{ padding: "20px", background: "#fff", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                        <h3 style={{ margin: 0, fontSize: "16px", color: "#1e293b", fontWeight: "700" }}>
                            Inventory Health
                        </h3>
                        <Link to="/inventory" style={{ fontSize: "12px", color: "#2563eb", fontWeight: "600", textDecoration: "none" }}>
                            Manage Items →
                        </Link>
                    </div>

                    <div style={{ padding: "12px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0", marginBottom: "16px" }}>
                        <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase" }}>TOTAL ON-HAND STOCK</div>
                        <div style={{ fontSize: "20px", fontWeight: "800", color: "#0f172a" }}>
                            {formatWeight(stats.totalInventoryStockKg)}
                        </div>
                        <small style={{ color: "#64748b", fontSize: "11px" }}>Across {stats.items} catalog items</small>
                    </div>

                    <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                            <span style={{ fontSize: "12px", fontWeight: "700", color: stats.lowStockCount > 0 ? "#dc2626" : "#16a34a" }}>
                                {stats.lowStockCount > 0 ? `⚠ ${stats.lowStockCount} Low-Stock Alert(s)` : "✓ Stock Levels Optimal"}
                            </span>
                        </div>

                        {Array.isArray(stats.lowStockItems) && stats.lowStockItems.length > 0 ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                {stats.lowStockItems.map((item, idx) => (
                                    <div key={idx} style={{ padding: "8px 10px", background: "#fef2f2", borderRadius: "6px", border: "1px solid #fecaca", fontSize: "12px" }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "600", color: "#991b1b" }}>
                                            <span>{item.name}</span>
                                            <span>{Number(item.currentStock || 0)} {item.unit}</span>
                                        </div>
                                        <div style={{ color: "#b91c1c", fontSize: "11px" }}>
                                            Min Alert Threshold: {Number(item.minStockAlert || 0)} {item.unit}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p style={{ margin: 0, fontSize: "12px", color: "#64748b", padding: "12px 0" }}>
                                All industrial commodities are operating above threshold levels.
                            </p>
                        )}
                    </div>
                </div>

            </div>

            {/* RECENT FACTORY ACTIVITIES FEED */}
            <div className="card" style={{ padding: "20px", background: "#fff", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: "16px", color: "#1e293b", fontWeight: "700" }}>
                            Recent Operational Records
                        </h3>
                        <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748b" }}>
                            Live activity feed from factory weighbridge, outward dispatches, and inward receipts
                        </p>
                    </div>

                    <div style={{ display: "flex", gap: "6px" }}>
                        <button
                            onClick={() => setActiveTab("all")}
                            style={{
                                padding: "6px 12px",
                                borderRadius: "6px",
                                border: "1px solid #cbd5e1",
                                background: activeTab === "all" ? "#2563eb" : "#fff",
                                color: activeTab === "all" ? "#fff" : "#475569",
                                fontSize: "12px",
                                fontWeight: "600",
                                cursor: "pointer"
                            }}
                        >
                            All Vehicles ({stats.recentVehicles?.length || 0})
                        </button>

                        <button
                            onClick={() => setActiveTab("sales")}
                            style={{
                                padding: "6px 12px",
                                borderRadius: "6px",
                                border: "1px solid #cbd5e1",
                                background: activeTab === "sales" ? "#2563eb" : "#fff",
                                color: activeTab === "sales" ? "#fff" : "#475569",
                                fontSize: "12px",
                                fontWeight: "600",
                                cursor: "pointer"
                            }}
                        >
                            Recent Sales ({stats.recentSales?.length || 0})
                        </button>
                    </div>
                </div>

                {activeTab === "all" ? (
                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
                            <thead>
                                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#475569", fontWeight: "600" }}>
                                    <th style={{ padding: "10px 14px" }}>Date</th>
                                    <th style={{ padding: "10px 14px" }}>Vehicle No</th>
                                    <th style={{ padding: "10px 14px" }}>Party / Customer</th>
                                    <th style={{ padding: "10px 14px" }}>Commodity</th>
                                    <th style={{ padding: "10px 14px" }}>Net Weight</th>
                                    <th style={{ padding: "10px 14px" }}>Register</th>
                                    <th style={{ padding: "10px 14px" }}>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(!stats.recentVehicles || stats.recentVehicles.length === 0) ? (
                                    <tr>
                                        <td colSpan="7" style={{ padding: "20px", textAlign: "center", color: "#64748b" }}>
                                            No recent vehicle entries recorded.
                                        </td>
                                    </tr>
                                ) : (
                                    stats.recentVehicles.map((v) => (
                                        <tr key={v.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                            <td style={{ padding: "10px 14px", color: "#64748b" }}>{v.date}</td>
                                            <td style={{ padding: "10px 14px", fontWeight: "700", color: "#1e293b" }}>{v.vehicleNo}</td>
                                            <td style={{ padding: "10px 14px", color: "#334155" }}>{v.partyName || "—"}</td>
                                            <td style={{ padding: "10px 14px", color: "#334155" }}>{v.commodity || "—"}</td>
                                            <td style={{ padding: "10px 14px", fontWeight: "600", color: "#0f172a" }}>
                                                {v.netWeight ? `${Number(v.netWeight).toLocaleString()} KG` : "—"}
                                            </td>
                                            <td style={{ padding: "10px 14px" }}>
                                                <span style={{
                                                    padding: "2px 8px",
                                                    borderRadius: "4px",
                                                    fontSize: "11px",
                                                    fontWeight: "600",
                                                    background: v.registerType === "SALES" ? "#dcfce7" : v.registerType === "PURCHASE" ? "#ede9fe" : "#f1f5f9",
                                                    color: v.registerType === "SALES" ? "#15803d" : v.registerType === "PURCHASE" ? "#6b21a8" : "#475569"
                                                }}>
                                                    {v.registerType || "GATE"}
                                                </span>
                                            </td>
                                            <td style={{ padding: "10px 14px" }}>
                                                <span style={{
                                                    padding: "2px 8px",
                                                    borderRadius: "10px",
                                                    fontSize: "11px",
                                                    fontWeight: "600",
                                                    background: v.status === "INSIDE" ? "#fef3c7" : "#e2e8f0",
                                                    color: v.status === "INSIDE" ? "#92400e" : "#475569"
                                                }}>
                                                    ● {v.status || "INSIDE"}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
                            <thead>
                                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#475569", fontWeight: "600" }}>
                                    <th style={{ padding: "10px 14px" }}>Invoice</th>
                                    <th style={{ padding: "10px 14px" }}>Date</th>
                                    <th style={{ padding: "10px 14px" }}>Customer</th>
                                    <th style={{ padding: "10px 14px" }}>Vehicle</th>
                                    <th style={{ padding: "10px 14px" }}>Commodity</th>
                                    <th style={{ padding: "10px 14px" }}>Grand Total</th>
                                    <th style={{ padding: "10px 14px" }}>Payment</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(!stats.recentSales || stats.recentSales.length === 0) ? (
                                    <tr>
                                        <td colSpan="7" style={{ padding: "20px", textAlign: "center", color: "#64748b" }}>
                                            No recent sales invoices recorded.
                                        </td>
                                    </tr>
                                ) : (
                                    stats.recentSales.map((s) => (
                                        <tr key={s.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                            <td style={{ padding: "10px 14px", fontWeight: "600", color: "#2563eb" }}>{s.invoiceNo}</td>
                                            <td style={{ padding: "10px 14px", color: "#64748b" }}>{s.date}</td>
                                            <td style={{ padding: "10px 14px", color: "#334155" }}>{s.customerName || "—"}</td>
                                            <td style={{ padding: "10px 14px", color: "#334155" }}>{s.vehicleNo}</td>
                                            <td style={{ padding: "10px 14px", color: "#334155" }}>{s.commodity}</td>
                                            <td style={{ padding: "10px 14px", fontWeight: "700", color: "#166534" }}>{formatCurrency(s.grandTotal)}</td>
                                            <td style={{ padding: "10px 14px" }}>
                                                <span style={{
                                                    padding: "2px 8px",
                                                    borderRadius: "10px",
                                                    fontSize: "11px",
                                                    fontWeight: "600",
                                                    background: s.paymentStatus === "PAID" ? "#dcfce7" : s.paymentStatus === "PARTIAL" ? "#fef3c7" : "#fee2e2",
                                                    color: s.paymentStatus === "PAID" ? "#15803d" : s.paymentStatus === "PARTIAL" ? "#92400e" : "#b91c1c"
                                                }}>
                                                    {s.paymentStatus || "PENDING"}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

        </div>
    );
}

export default Dashboard;
