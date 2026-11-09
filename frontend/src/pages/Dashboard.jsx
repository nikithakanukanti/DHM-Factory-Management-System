import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";

function Dashboard() {
    const [stats, setStats] = useState({
        vehicles: 0,
        sales: 0,
        purchases: 0,
        reactorTimings: 0,
        todayVehicles: 0,
        todaySales: 0,
        todayPurchases: 0,
        todayReactorTimings: 0,
        totalSalesWeightKg: 0,
        totalPurchasesWeightKg: 0
    });

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDashboard();
    }, []);

    async function loadDashboard() {
        try {
            setLoading(true);
            const response = await api.get("/api/dashboard/stats");
            if (response.data) {
                setStats({
                    vehicles: response.data.vehicles || 0,
                    sales: response.data.sales || 0,
                    purchases: response.data.purchases || 0,
                    reactorTimings: response.data.reactorTimings || 0,
                    todayVehicles: response.data.todayVehicles || 0,
                    todaySales: response.data.todaySales || 0,
                    todayPurchases: response.data.todayPurchases || 0,
                    todayReactorTimings: response.data.todayReactorTimings || 0,
                    totalSalesWeightKg: response.data.totalSalesWeightKg || 0,
                    totalPurchasesWeightKg: response.data.totalPurchasesWeightKg || 0
                });
            }
        } catch (error) {
            console.error("Dashboard loading error:", error);
        } finally {
            setLoading(false);
        }
    }

    const inwardMT = (Number(stats.totalPurchasesWeightKg || 0) / 1000).toFixed(1);
    const outwardMT = (Number(stats.totalSalesWeightKg || 0) / 1000).toFixed(1);

    return (
        <div className="dashboard-page">

            {/* PAGE HEADING */}
            <div className="page-heading">
                <div>
                    <span className="page-kicker">OVERVIEW & LIVE METRICS</span>
                    <h1>Operations Dashboard</h1>
                    <p>Real-time factory metrics, weighbridge logs, and daily plant operations.</p>
                </div>

                <div className="dashboard-date" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ color: "#22c55e", fontSize: "14px" }}>●</span>
                    <span>System Online (Asia/Kolkata)</span>
                </div>
            </div>

            {/* TODAY'S ACTIVITY BAR */}
            <div className="card" style={{ marginBottom: "25px", background: "linear-gradient(135deg, #122b45 0%, #1e4063 100%)", color: "white" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
                    <div>
                        <div style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px", opacity: 0.8 }}>
                            TODAY'S SHIFT ACTIVITY
                        </div>
                        <h2 style={{ fontSize: "22px", margin: "4px 0 0", color: "white" }}>
                            {loading ? "..." : `${stats.todayVehicles} Vehicles at Weighbridge Today`}
                        </h2>
                    </div>

                    <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
                        <div>
                            <span style={{ fontSize: "12px", opacity: 0.8, display: "block" }}>Today's Sales</span>
                            <strong style={{ fontSize: "20px" }}>{stats.todaySales}</strong>
                        </div>
                        <div>
                            <span style={{ fontSize: "12px", opacity: 0.8, display: "block" }}>Today's Inward</span>
                            <strong style={{ fontSize: "20px" }}>{stats.todayPurchases}</strong>
                        </div>
                        <div>
                            <span style={{ fontSize: "12px", opacity: 0.8, display: "block" }}>Today's Reactor Logs</span>
                            <strong style={{ fontSize: "20px" }}>{stats.todayReactorTimings}</strong>
                        </div>
                    </div>
                </div>
            </div>

            {/* STAT CARDS GRID */}
            <div className="stat-grid">

                {/* VEHICLES */}
                <div className="stat-card blue">
                    <div className="stat-icon">🚛</div>
                    <div className="stat-content">
                        <span>ALL VEHICLES</span>
                        <strong>{loading ? "..." : stats.vehicles}</strong>
                        <small>Total Gate & Weighbridge Logs</small>
                    </div>
                </div>

                {/* SALES */}
                <div className="stat-card green">
                    <div className="stat-icon">↗</div>
                    <div className="stat-content">
                        <span>SALES DISPATCHES</span>
                        <strong>{loading ? "..." : stats.sales}</strong>
                        <small>{outwardMT} MT Dispatched ({Number(stats.totalSalesWeightKg).toLocaleString()} KG)</small>
                    </div>
                </div>

                {/* PURCHASES */}
                <div className="stat-card purple">
                    <div className="stat-icon">↙</div>
                    <div className="stat-content">
                        <span>PURCHASE INWARD</span>
                        <strong>{loading ? "..." : stats.purchases}</strong>
                        <small>{inwardMT} MT Inward ({Number(stats.totalPurchasesWeightKg).toLocaleString()} KG)</small>
                    </div>
                </div>

                {/* REACTOR TIMING */}
                <div className="stat-card amber">
                    <div className="stat-icon">◷</div>
                    <div className="stat-content">
                        <span>REACTOR BATCHES</span>
                        <strong>{loading ? "..." : stats.reactorTimings}</strong>
                        <small>Pyrolysis Reactor 1 & 2 Runs</small>
                    </div>
                </div>

            </div>

            {/* QUICK ACTIONS & MODULE NAV */}
            <div className="card" style={{ marginTop: "25px" }}>
                <div className="section-header">
                    <div>
                        <h2>Quick Module Operations</h2>
                        <p>Direct shortcuts to factory workflows</p>
                    </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
                    <Link
                        to="/vehicle-register"
                        style={{
                            padding: "18px",
                            borderRadius: "10px",
                            border: "1px solid #e2e8f0",
                            background: "#f8fafc",
                            textDecoration: "none",
                            color: "inherit",
                            display: "block",
                            transition: "all 0.2s"
                        }}
                    >
                        <div style={{ fontSize: "24px", marginBottom: "8px" }}>🚛</div>
                        <strong style={{ display: "block", fontSize: "16px", color: "#1e293b", marginBottom: "4px" }}>
                            Vehicle Weighbridge
                        </strong>
                        <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>
                            Log arriving trucks and route to Sales or Purchase
                        </p>
                    </Link>

                    <Link
                        to="/sales-register"
                        style={{
                            padding: "18px",
                            borderRadius: "10px",
                            border: "1px solid #e2e8f0",
                            background: "#f8fafc",
                            textDecoration: "none",
                            color: "inherit",
                            display: "block",
                            transition: "all 0.2s"
                        }}
                    >
                        <div style={{ fontSize: "24px", marginBottom: "8px" }}>↗</div>
                        <strong style={{ display: "block", fontSize: "16px", color: "#1e293b", marginBottom: "4px" }}>
                            Sales Register
                        </strong>
                        <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>
                            Manage outgoing dispatches (Oil, Scrap, Carbon)
                        </p>
                    </Link>

                    <Link
                        to="/purchase-register"
                        style={{
                            padding: "18px",
                            borderRadius: "10px",
                            border: "1px solid #e2e8f0",
                            background: "#f8fafc",
                            textDecoration: "none",
                            color: "inherit",
                            display: "block",
                            transition: "all 0.2s"
                        }}
                    >
                        <div style={{ fontSize: "24px", marginBottom: "8px" }}>↙</div>
                        <strong style={{ display: "block", fontSize: "16px", color: "#1e293b", marginBottom: "4px" }}>
                            Purchase Register
                        </strong>
                        <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>
                            Record tyre waste deliveries and raw materials
                        </p>
                    </Link>

                    <Link
                        to="/reactor-timing"
                        style={{
                            padding: "18px",
                            borderRadius: "10px",
                            border: "1px solid #e2e8f0",
                            background: "#f8fafc",
                            textDecoration: "none",
                            color: "inherit",
                            display: "block",
                            transition: "all 0.2s"
                        }}
                    >
                        <div style={{ fontSize: "24px", marginBottom: "8px" }}>◷</div>
                        <strong style={{ display: "block", fontSize: "16px", color: "#1e293b", marginBottom: "4px" }}>
                            Reactor Timings
                        </strong>
                        <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>
                            Batch operating times for Reactor 1 & 2
                        </p>
                    </Link>
                </div>
            </div>

        </div>
    );
}

export default Dashboard;
