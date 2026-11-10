import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../api";
import NotificationBell from "../components/NotificationBell";

function MainLayout() {
    const navigate = useNavigate();
    const location = useLocation();

    const readStoredUser = () => {
        try {
            const stored = localStorage.getItem("dhmUser") || sessionStorage.getItem("dhmUser");
            if (stored) return JSON.parse(stored);
        } catch (e) {}
        return null;
    };

    const storedUser = readStoredUser();

    const [role, setRole] = useState(storedUser?.role || "");
    const [username, setUsername] = useState(storedUser?.username || "");
    const [fullName, setFullName] = useState(storedUser?.fullName || storedUser?.username || "");
    const [permittedModules, setPermittedModules] = useState(storedUser?.permittedModules || "");

    const [loading, setLoading] = useState(() => !role);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [showChangePassword, setShowChangePassword] = useState(false);
    const [currentPass, setCurrentPass] = useState("");
    const [newPass, setNewPass] = useState("");
    const [passMsg, setPassMsg] = useState("");
    const [passErr, setPassErr] = useState("");

    useEffect(() => {
        let isMounted = true;

        async function verifyCurrentUser() {
            try {
                const response = await api.get("/api/auth/me");
                if (isMounted && response.data?.role) {
                    const nextRole = response.data.role;
                    const nextUsername = response.data.username || "User";
                    const nextFullName = response.data.fullName || nextUsername;
                    const nextPermitted = response.data.permittedModules || "";
                    setRole(nextRole);
                    setUsername(nextUsername);
                    setFullName(nextFullName);
                    setPermittedModules(nextPermitted);

                    try {
                        const prev = readStoredUser() || {};
                        const merged = { ...prev, role: nextRole, username: nextUsername, fullName: nextFullName, permittedModules: nextPermitted };
                        localStorage.setItem("dhmUser", JSON.stringify(merged));
                        sessionStorage.setItem("dhmUser", JSON.stringify(merged));
                    } catch (e) {}
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
        return () => { isMounted = false; };
    }, [navigate]);

    const moduleSet = new Set(
        String(permittedModules || "")
            .split(",")
            .map((m) => m.trim().toUpperCase())
            .filter(Boolean)
    );

    const hasPermitted = (moduleKey) => {
        if (moduleSet.has(moduleKey)) return true;
        // Compatibility aliases
        if (moduleKey === "CUSTOMERS") return moduleSet.has("SALES");
        if (moduleKey === "SUPPLIERS") return moduleSet.has("PURCHASES");
        if (moduleKey === "ATTENDANCE") return moduleSet.has("EMPLOYEES");
        if (moduleKey === "SALES") return moduleSet.has("CUSTOMERS");
        if (moduleKey === "PURCHASES") return moduleSet.has("SUPPLIERS");
        if (moduleKey === "EMPLOYEES") return moduleSet.has("ATTENDANCE");
        return false;
    };

    const canAccessModule = (moduleKey) => {
        if (role === "ADMIN" || role === "SUPERVISOR") return true;
        if (role === "CLIENT") return hasPermitted(moduleKey);
        return false;
    };

    const routeModule = (path) => {
        if (path.startsWith("/dashboard")) return "DASHBOARD";
        if (path.startsWith("/vehicle-register") || path.startsWith("/vehicle-map")) return "VEHICLES";
        if (path.startsWith("/sales-register")) return "SALES";
        if (path.startsWith("/customers")) return "CUSTOMERS";
        if (path.startsWith("/purchase-register")) return "PURCHASES";
        if (path.startsWith("/suppliers")) return "SUPPLIERS";
        if (path.startsWith("/inventory")) return "INVENTORY";
        if (path.startsWith("/payments")) return "PAYMENTS";
        if (path.startsWith("/reactor-timing")) return "REACTOR";
        if (path.startsWith("/employees")) return "EMPLOYEES";
        if (path.startsWith("/reports")) return "REPORTS";
        if (path.startsWith("/notifications")) return "NOTIFICATIONS";
        return null; // admin-only or unknown handled below/backend
    };

    useEffect(() => {
        if (role === "ADMIN") return;
        const path = location.pathname;
        const isAdminOnly = path.startsWith("/users") || path.startsWith("/audit-logs") || path.startsWith("/settings");
        if (isAdminOnly) {
            navigate("/dashboard", { replace: true });
            return;
        }
        if (role === "CLIENT") {
            const mod = routeModule(path);
            if (mod && !canAccessModule(mod)) {
                navigate("/dashboard", { replace: true });
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [role, permittedModules, location.pathname]);

    const roleLabel = role === "ADMIN" ? "Administrator" : role === "CLIENT" ? "Client" : "Supervisor";
    const roleSubLabel = role === "ADMIN" ? "Full Access" : role === "CLIENT" ? "Permitted Access" : "Shift Operations";
    const avatarText = (fullName || username || role || "U").charAt(0).toUpperCase();

    async function logout() {
        try {
            await api.post("/logout", {});
        } catch (error) {
        } finally {
            localStorage.removeItem("dhmUser");
            sessionStorage.removeItem("dhmUser");
            navigate("/login", { replace: true });
        }
    }

    async function handleChangePassword(e) {
        e.preventDefault();
        setPassMsg("");
        setPassErr("");

        try {
            const res = await api.post("/api/auth/change-password", {
                currentPassword: currentPass,
                newPassword: newPass
            });
            setPassMsg(res.data.message || "Password changed successfully.");
            setCurrentPass("");
            setNewPass("");
            setTimeout(() => {
                setShowChangePassword(false);
                setPassMsg("");
            }, 1800);
        } catch (err) {
            setPassErr(err.response?.data?.error || "Failed to change password.");
        }
    }

    function closeSidebar() {
        setSidebarOpen(false);
    }

    if (loading) {
        return (
            <div className="loading-screen">
                <div className="loading-logo-wrapper">
                    <img src="/dhm-logo.jpg" alt="DHM Pyrotech" className="loading-logo" />
                </div>
                <div className="loading-ring"></div>
                <h2>DHM Factory</h2>
                <p>Connecting to Enterprise Factory Management System...</p>
            </div>
        );
    }

    return (
        <div className="app-layout">

            {sidebarOpen && <div className="sidebar-overlay" onClick={closeSidebar} />}

            {/* SIDEBAR NAVIGATION */}
            <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
                <div className="sidebar-header">
                    <div className="brand-logo-wrapper">
                        <img src="/dhm-logo.jpg" alt="DHM Pyrotech Enterprises" className="brand-logo" />
                    </div>
                    <div className="brand-text">
                        <h2>DHM Factory</h2>
                        <p>Enterprise Operations</p>
                    </div>
                </div>

                <nav className="sidebar-nav" style={{ overflowY: "auto", flex: 1, paddingBottom: "20px" }}>

                    {canAccessModule("DASHBOARD") && (
                        <>
                            <div className="sidebar-section-title">OVERVIEW</div>
                            <NavLink to="/dashboard" onClick={closeSidebar} className={({ isActive }) => isActive ? "active" : ""}>
                                <span className="nav-icon">D</span>
                                <span>Dashboard</span>
                            </NavLink>
                        </>
                    )}

                    {canAccessModule("VEHICLES") && (
                        <>
                            <div className="sidebar-section-title">VEHICLE WEIGHBRIDGE</div>
                            <NavLink to="/vehicle-register" onClick={closeSidebar} className={({ isActive }) => isActive ? "active" : ""}>
                                <span className="nav-icon">V</span>
                                <span>Vehicle Register</span>
                            </NavLink>
                            <NavLink to="/vehicle-map" onClick={closeSidebar} className={({ isActive }) => isActive ? "active" : ""}>
                                <span className="nav-icon">M</span>
                                <span>GPS Vehicle Map</span>
                            </NavLink>
                        </>
                    )}

                    {(canAccessModule("SALES") || canAccessModule("CUSTOMERS")) && (
                        <>
                            <div className="sidebar-section-title">SALES & DISPATCH</div>
                            {canAccessModule("SALES") && (
                                <NavLink to="/sales-register" onClick={closeSidebar} className={({ isActive }) => isActive ? "active" : ""}>
                                    <span className="nav-icon">S</span>
                                    <span>Sales Dispatches</span>
                                </NavLink>
                            )}
                            {canAccessModule("CUSTOMERS") && (
                                <NavLink to="/customers" onClick={closeSidebar} className={({ isActive }) => isActive ? "active" : ""}>
                                    <span className="nav-icon">C</span>
                                    <span>Customers</span>
                                </NavLink>
                            )}
                        </>
                    )}

                    {(canAccessModule("PURCHASES") || canAccessModule("SUPPLIERS")) && (
                        <>
                            <div className="sidebar-section-title">PURCHASE & INWARD</div>
                            {canAccessModule("PURCHASES") && (
                                <NavLink to="/purchase-register" onClick={closeSidebar} className={({ isActive }) => isActive ? "active" : ""}>
                                    <span className="nav-icon">P</span>
                                    <span>Purchase Inward</span>
                                </NavLink>
                            )}
                            {canAccessModule("SUPPLIERS") && (
                                <NavLink to="/suppliers" onClick={closeSidebar} className={({ isActive }) => isActive ? "active" : ""}>
                                    <span className="nav-icon">Su</span>
                                    <span>Suppliers</span>
                                </NavLink>
                            )}
                        </>
                    )}

                    {(canAccessModule("INVENTORY") || canAccessModule("PAYMENTS")) && (
                        <>
                            <div className="sidebar-section-title">FINANCE & STOCKS</div>
                            {canAccessModule("INVENTORY") && (
                                <NavLink to="/inventory" onClick={closeSidebar} className={({ isActive }) => isActive ? "active" : ""}>
                                    <span className="nav-icon">I</span>
                                    <span>Inventory Master</span>
                                </NavLink>
                            )}
                            {canAccessModule("PAYMENTS") && (
                                <NavLink to="/payments" onClick={closeSidebar} className={({ isActive }) => isActive ? "active" : ""}>
                                    <span className="nav-icon">₹</span>
                                    <span>Payments Log</span>
                                </NavLink>
                            )}
                        </>
                    )}

                    {(canAccessModule("REACTOR") || canAccessModule("EMPLOYEES")) && (
                        <>
                            <div className="sidebar-section-title">PLANT OPERATIONS</div>
                            {canAccessModule("REACTOR") && (
                                <NavLink to="/reactor-timing" onClick={closeSidebar} className={({ isActive }) => isActive ? "active" : ""}>
                                    <span className="nav-icon">R</span>
                                    <span>Reactor Timing</span>
                                </NavLink>
                            )}
                            {canAccessModule("EMPLOYEES") && (
                                <NavLink to="/employees" onClick={closeSidebar} className={({ isActive }) => isActive ? "active" : ""}>
                                    <span className="nav-icon">E</span>
                                    <span>Employees & Attendance</span>
                                </NavLink>
                            )}
                        </>
                    )}

                    {(canAccessModule("REPORTS") || canAccessModule("NOTIFICATIONS")) && (
                        <>
                            <div className="sidebar-section-title">REPORTS & ALERTS</div>
                            {canAccessModule("REPORTS") && (
                                <NavLink to="/reports" onClick={closeSidebar} className={({ isActive }) => isActive ? "active" : ""}>
                                    <span className="nav-icon">Rp</span>
                                    <span>Reports Hub</span>
                                </NavLink>
                            )}
                            {canAccessModule("NOTIFICATIONS") && (
                                <NavLink to="/notifications" onClick={closeSidebar} className={({ isActive }) => isActive ? "active" : ""}>
                                    <span className="nav-icon">N</span>
                                    <span>Notification Centre</span>
                                </NavLink>
                            )}
                        </>
                    )}

                    {role === "ADMIN" && (
                        <>
                            <div className="sidebar-section-title">ADMINISTRATION</div>
                            <NavLink to="/users" onClick={closeSidebar} className={({ isActive }) => isActive ? "active" : ""}>
                                <span className="nav-icon">U</span>
                                <span>User Accounts</span>
                            </NavLink>
                            <NavLink to="/audit-logs" onClick={closeSidebar} className={({ isActive }) => isActive ? "active" : ""}>
                                <span className="nav-icon">A</span>
                                <span>Security Audit Logs</span>
                            </NavLink>
                            <NavLink to="/settings" onClick={closeSidebar} className={({ isActive }) => isActive ? "active" : ""}>
                                <span className="nav-icon">G</span>
                                <span>Factory & Geofence</span>
                            </NavLink>
                        </>
                    )}

                </nav>

                <div className="sidebar-bottom">
                    <div className="logged-user">
                        <div className="user-avatar">{avatarText}</div>
                        <div className="user-details">
                            <strong>{fullName || username || roleLabel}</strong>
                            <span>{roleSubLabel}</span>
                        </div>
                    </div>
                    <button className="logout-button" onClick={logout}>
                        <span>â†ª</span> Logout
                    </button>
                </div>
            </aside>

            {/* MAIN CONTENT AREA */}
            <main className="main-content">
                <header className="topbar">
                    <div className="topbar-left">
                        <button className="mobile-menu" onClick={() => setSidebarOpen(true)} aria-label="Menu">
                            â˜°
                        </button>
                        <div className="topbar-title">
                            <img src="/dhm-logo.jpg" alt="DHM Pyrotech" className="topbar-logo" />
                            <span className="topbar-line"></span>
                            <div>
                                <h2>DHM Pyrotech Enterprises</h2>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                        <NotificationBell />

                        <div className="topbar-user" style={{ cursor: "pointer" }} onClick={() => setShowChangePassword(true)}>
                            <span className="status-dot"></span>
                            <div>
                                <strong>{fullName || username}</strong>
                                <small>{roleLabel}</small>
                            </div>
                        </div>
                    </div>
                </header>

                <section className="page-content page-transition">
                    <Outlet />
                </section>
            </main>

            {/* CHANGE PASSWORD MODAL */}
            {showChangePassword && (
                <div style={{
                    position: "fixed",
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: "rgba(10, 25, 41, 0.75)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    zIndex: 9999
                }}>
                    <div style={{
                        background: "white", padding: "24px", borderRadius: "12px", width: "100%", maxWidth: "400px",
                        boxShadow: "0 20px 40px rgba(0,0,0,0.3)"
                    }}>
                        <h3 style={{ margin: "0 0 16px", color: "#173f67" }}>ðŸ”‘ Update Account Password</h3>

                        {passMsg && <div style={{ color: "#15803d", marginBottom: "12px", fontSize: "13px" }}>âœ“ {passMsg}</div>}
                        {passErr && <div style={{ color: "#b91c1c", marginBottom: "12px", fontSize: "13px" }}>âš  {passErr}</div>}

                        <form onSubmit={handleChangePassword}>
                            <div className="form-group">
                                <label>Current Password *</label>
                                <input
                                    type="password"
                                    value={currentPass}
                                    onChange={(e) => setCurrentPass(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>New Password (min 6 chars) *</label>
                                <input
                                    type="password"
                                    value={newPass}
                                    onChange={(e) => setNewPass(e.target.value)}
                                    required
                                />
                            </div>

                            <div style={{ display: "flex", gap: "10px", marginTop: "16px", justifyContent: "flex-end" }}>
                                <button
                                    type="button"
                                    className="secondary-button"
                                    onClick={() => setShowChangePassword(false)}
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="primary-button">
                                    Update Password
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}

export default MainLayout;
