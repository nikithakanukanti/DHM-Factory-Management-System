import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../api";

function MainLayout() {
    const navigate = useNavigate();

    const [role, setRole] = useState(() => {
        try {
            const stored = localStorage.getItem("dhmUser") || sessionStorage.getItem("dhmUser");
            if (stored) {
                const user = JSON.parse(stored);
                return user.role || "";
            }
        } catch (e) {
            // Ignore parse error
        }
        return "";
    });

    const [loading, setLoading] = useState(() => !role);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Verify currently authenticated user with backend
    useEffect(() => {
        let isMounted = true;

        async function verifyCurrentUser() {
            try {
                const response = await api.get("/api/auth/me");

                if (!response.data || !response.data.role) {
                    throw new Error("User role was not returned by server.");
                }

                if (isMounted) {
                    setRole(response.data.role);

                    // Update stored user
                    const currentStored = localStorage.getItem("dhmUser") || sessionStorage.getItem("dhmUser");
                    let updatedUser = { username: response.data.username, role: response.data.role };
                    if (currentStored) {
                        try {
                            const parsed = JSON.parse(currentStored);
                            updatedUser = { ...parsed, ...response.data };
                        } catch (e) {}
                    }
                    localStorage.setItem("dhmUser", JSON.stringify(updatedUser));
                    sessionStorage.setItem("dhmUser", JSON.stringify(updatedUser));
                }
            } catch (error) {
                console.error("Session verification failed:", error);

                if (isMounted) {
                    localStorage.removeItem("dhmUser");
                    sessionStorage.removeItem("dhmUser");
                    navigate("/login", { replace: true });
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        }

        verifyCurrentUser();

        return () => {
            isMounted = false;
        };
    }, [navigate]);

    // Logout
    async function logout() {
        try {
            await api.post("/logout", {});
        } catch (error) {
            console.error("Logout error:", error);
        } finally {
            localStorage.removeItem("dhmUser");
            sessionStorage.removeItem("dhmUser");
            navigate("/login", { replace: true });
        }
    }

    function closeSidebar() {
        setSidebarOpen(false);
    }

    if (loading) {
        return (
            <div className="loading-screen">
                <div className="loading-logo-wrapper">
                    <img
                        src="/dhm-logo.jpg"
                        alt="DHM Pyrotech Enterprises"
                        className="loading-logo"
                    />
                </div>
                <div className="loading-ring"></div>
                <h2>DHM Factory</h2>
                <p>Connecting to Factory Operations System...</p>
            </div>
        );
    }

    return (
        <div className="app-layout">

            {/* MOBILE OVERLAY */}
            {sidebarOpen && (
                <div
                    className="sidebar-overlay"
                    onClick={closeSidebar}
                />
            )}

            {/* SIDEBAR */}
            <aside
                className={`sidebar ${
                    sidebarOpen ? "sidebar-open" : ""
                }`}
            >
                {/* COMPANY BRAND */}
                <div className="sidebar-header">
                    <div className="brand-logo-wrapper">
                        <img
                            src="/dhm-logo.jpg"
                            alt="DHM Pyrotech Enterprises"
                            className="brand-logo"
                        />
                    </div>

                    <div className="brand-text">
                        <h2>DHM</h2>
                        <p>Factory Digital Entry</p>
                    </div>
                </div>

                <div className="sidebar-section-title">
                    MAIN MENU
                </div>

                <nav className="sidebar-nav">

                    {/* DASHBOARD */}
                    {role === "ADMIN" && (
                        <NavLink
                            to="/dashboard"
                            onClick={closeSidebar}
                            className={({ isActive }) =>
                                isActive ? "active" : ""
                            }
                        >
                            <span className="nav-icon">▦</span>
                            <span>Dashboard</span>
                        </NavLink>
                    )}

                    {/* VEHICLE REGISTER */}
                    <NavLink
                        to="/vehicle-register"
                        onClick={closeSidebar}
                        className={({ isActive }) =>
                            isActive ? "active" : ""
                        }
                    >
                        <span className="nav-icon">🚛</span>
                        <span>Vehicle Register</span>
                    </NavLink>

                    {/* SALES REGISTER */}
                    <NavLink
                        to="/sales-register"
                        onClick={closeSidebar}
                        className={({ isActive }) =>
                            isActive ? "active" : ""
                        }
                    >
                        <span className="nav-icon">↗</span>
                        <span>Sales Register</span>
                    </NavLink>

                    {/* PURCHASE REGISTER */}
                    <NavLink
                        to="/purchase-register"
                        onClick={closeSidebar}
                        className={({ isActive }) =>
                            isActive ? "active" : ""
                        }
                    >
                        <span className="nav-icon">↙</span>
                        <span>Purchase Register</span>
                    </NavLink>

                    {/* REACTOR TIMING */}
                    <NavLink
                        to="/reactor-timing"
                        onClick={closeSidebar}
                        className={({ isActive }) =>
                            isActive ? "active" : ""
                        }
                    >
                        <span className="nav-icon">◷</span>
                        <span>Reactor Timing</span>
                    </NavLink>

                    {/* ADMINISTRATION */}
                    {role === "ADMIN" && (
                        <>
                            <div className="sidebar-section-title">
                                ADMINISTRATION
                            </div>

                            {/* REPORTS */}
                            <NavLink
                                to="/reports"
                                onClick={closeSidebar}
                                className={({ isActive }) =>
                                    isActive ? "active" : ""
                                }
                            >
                                <span className="nav-icon">▤</span>
                                <span>Reports</span>
                            </NavLink>

                            {/* USERS */}
                            <NavLink
                                to="/users"
                                onClick={closeSidebar}
                                className={({ isActive }) =>
                                    isActive ? "active" : ""
                                }
                            >
                                <span className="nav-icon">♙</span>
                                <span>Users</span>
                            </NavLink>
                        </>
                    )}

                </nav>

                {/* SIDEBAR BOTTOM */}
                <div className="sidebar-bottom">
                    <div className="logged-user">
                        <div className="user-avatar">
                            {role === "ADMIN" ? "A" : "S"}
                        </div>

                        <div className="user-details">
                            <strong>
                                {role === "ADMIN"
                                    ? "Administrator"
                                    : "Supervisor"}
                            </strong>

                            <span>
                                {role === "ADMIN"
                                    ? "Full Access"
                                    : "Data Entry Shift"}
                            </span>
                        </div>
                    </div>

                    <button
                        className="logout-button"
                        onClick={logout}
                    >
                        <span>↪</span>
                        Logout
                    </button>
                </div>

            </aside>

            {/* MAIN CONTENT */}
            <main className="main-content">

                {/* TOPBAR */}
                <header className="topbar">
                    <div className="topbar-left">

                        <button
                            className="mobile-menu"
                            onClick={() => setSidebarOpen(true)}
                            aria-label="Open navigation menu"
                        >
                            ☰
                        </button>

                        <div className="topbar-title">
                            <img
                                src="/dhm-logo.jpg"
                                alt="DHM Pyrotech Enterprises"
                                className="topbar-logo"
                            />

                            <span className="topbar-line"></span>

                            <div>
                                <h2>DHM Pyrotech Enterprises</h2>
                            </div>
                        </div>

                    </div>

                    <div className="topbar-user">
                        <span className="status-dot"></span>

                        <div>
                            <strong>
                                {role === "ADMIN"
                                    ? "Administrator"
                                    : "Supervisor"}
                            </strong>

                            <small>
                                {role === "ADMIN"
                                    ? "Full Access"
                                    : "Weighbridge & Shifts"}
                            </small>
                        </div>
                    </div>
                </header>

                {/* PAGE CONTENT */}
                <section className="page-content page-transition">
                    <Outlet />
                </section>

            </main>

        </div>
    );
}

export default MainLayout;
