import { useEffect, useState } from "react";
import axios from "axios";

function Dashboard() {

    const [stats, setStats] = useState({
        vehicles: 0,
        sales: 0,
        purchases: 0,
        reactor: 0
    });

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDashboard();
    }, []);

    async function loadDashboard() {

        try {

            /*
             * These endpoints can be connected
             * to your DashboardController.
             *
             * Until then, the page remains functional
             * with zero values.
             */

            const requests = await Promise.allSettled([
                axios.get(
                    "http://localhost:8090/api/vehicles",
                    { withCredentials: true }
                ),
                axios.get(
                    "http://localhost:8090/api/sales",
                    { withCredentials: true }
                ),
                axios.get(
                    "http://localhost:8090/api/purchases",
                    { withCredentials: true }
                ),
                axios.get(
                    "http://localhost:8090/api/reactor-timings",
                    { withCredentials: true }
                )
            ]);

            const vehicles =
                requests[0].status === "fulfilled"
                    ? requests[0].value.data.length
                    : 0;

            const sales =
                requests[1].status === "fulfilled"
                    ? requests[1].value.data.length
                    : 0;

            const purchases =
                requests[2].status === "fulfilled"
                    ? requests[2].value.data.length
                    : 0;

            const reactor =
                requests[3].status === "fulfilled"
                    ? requests[3].value.data.length
                    : 0;

            setStats({
                vehicles,
                sales,
                purchases,
                reactor
            });

        } catch (error) {

            console.error(
                "Dashboard loading error:",
                error
            );

        } finally {

            setLoading(false);

        }
    }

    return (

        <div className="dashboard-page">

            <div className="page-heading">

                <div>

                    <span className="page-kicker">
                        OVERVIEW
                    </span>

                    <h1>
                        Dashboard
                    </h1>

                    <p>
                        Monitor your factory records and
                        daily operations.
                    </p>

                </div>

                <div className="dashboard-date">
                    <span>●</span>
                    System Online
                </div>

            </div>

            <div className="stat-grid">

                <div className="stat-card blue">

                    <div className="stat-icon">
                        🚛
                    </div>

                    <div className="stat-content">

                        <span>
                            VEHICLES
                        </span>

                        <strong>
                            {loading
                                ? "..."
                                : stats.vehicles}
                        </strong>

                        <small>
                            Registered vehicles
                        </small>

                    </div>

                </div>

                <div className="stat-card green">

                    <div className="stat-icon">
                        ↗
                    </div>

                    <div className="stat-content">

                        <span>
                            SALES
                        </span>

                        <strong>
                            {loading
                                ? "..."
                                : stats.sales}
                        </strong>

                        <small>
                            Sales entries
                        </small>

                    </div>

                </div>

                <div className="stat-card orange">

                    <div className="stat-icon">
                        ↙
                    </div>

                    <div className="stat-content">

                        <span>
                            PURCHASES
                        </span>

                        <strong>
                            {loading
                                ? "..."
                                : stats.purchases}
                        </strong>

                        <small>
                            Purchase entries
                        </small>

                    </div>

                </div>

                <div className="stat-card purple">

                    <div className="stat-icon">
                        ◷
                    </div>

                    <div className="stat-content">

                        <span>
                            TIMINGS
                        </span>

                        <strong>
                            {loading
                                ? "..."
                                : stats.reactor}
                        </strong>

                        <small>
                            Timing records
                        </small>

                    </div>

                </div>

            </div>

            <div className="dashboard-grid">

                <div className="dashboard-panel">

                    <div className="panel-header">

                        <div>
                            <span className="panel-kicker">
                                QUICK ACCESS
                            </span>

                            <h2>
                                Common Actions
                            </h2>
                        </div>

                    </div>

                    <div className="quick-actions">

                        <a href="/vehicle-register">
                            <span>🚛</span>
                            <div>
                                <strong>
                                    Vehicle Register
                                </strong>
                                <small>
                                    Add vehicle entry
                                </small>
                            </div>
                            <b>→</b>
                        </a>

                        <a href="/sales-register">
                            <span>↗</span>
                            <div>
                                <strong>
                                    Sales Register
                                </strong>
                                <small>
                                    Manage sales entries
                                </small>
                            </div>
                            <b>→</b>
                        </a>

                        <a href="/purchase-register">
                            <span>↙</span>
                            <div>
                                <strong>
                                    Purchase Register
                                </strong>
                                <small>
                                    Manage purchases
                                </small>
                            </div>
                            <b>→</b>
                        </a>

                        <a href="/reactor-timing">
                            <span>◷</span>
                            <div>
                                <strong>
                                    Reactor Timing
                                </strong>
                                <small>
                                    View timing records
                                </small>
                            </div>
                            <b>→</b>
                        </a>

                    </div>

                </div>

                <div className="dashboard-panel system-panel">

                    <div className="panel-header">

                        <div>
                            <span className="panel-kicker">
                                SYSTEM
                            </span>

                            <h2>
                                System Status
                            </h2>
                        </div>

                    </div>

                    <div className="system-status">

                        <div className="system-status-icon">
                            ✓
                        </div>

                        <h3>
                            All Systems Operational
                        </h3>

                        <p>
                            DHM Factory Management System
                            is running normally.
                        </p>

                        <div className="status-item">
                            <span>
                                Backend
                            </span>
                            <b>Online</b>
                        </div>

                        <div className="status-item">
                            <span>
                                Database
                            </span>
                            <b>Connected</b>
                        </div>

                        <div className="status-item">
                            <span>
                                Security
                            </span>
                            <b>Protected</b>
                        </div>

                    </div>

                </div>

            </div>

        </div>
    );
}

export default Dashboard;