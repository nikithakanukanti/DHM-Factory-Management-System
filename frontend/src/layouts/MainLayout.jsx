import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";

function MainLayout() {
    const navigate = useNavigate();

    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkCurrentUser();
    }, []);

    async function checkCurrentUser() {
        try {
            const response = await axios.get(
                "http://localhost:8090/api/auth/me",
                {
                    withCredentials: true
                }
            );

            console.log("CURRENT USER:", response.data);

            setUser(response.data);

            // Keep the actual logged-in user in session storage
            sessionStorage.setItem(
                "dhmUser",
                JSON.stringify(response.data)
            );

        } catch (error) {
            console.error(
                "Unable to get current user:",
                error
            );

            sessionStorage.removeItem("dhmUser");

            navigate("/login");
        } finally {
            setLoading(false);
        }
    }

    async function handleLogout() {
        try {
            await axios.post(
                "http://localhost:8090/logout",
                {},
                {
                    withCredentials: true
                }
            );
        } catch (error) {
            console.error(
                "Logout error:",
                error
            );
        } finally {
            sessionStorage.removeItem("dhmUser");
            localStorage.removeItem("username");
            localStorage.removeItem("role");

            navigate("/login");
        }
    }

    // Wait until backend confirms the logged-in user
    if (loading) {
        return (
            <div className="app-layout">
                <div
                    style={{
                        width: "100%",
                        minHeight: "100vh",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "#f5f7fb",
                        color: "#334155",
                        fontSize: "15px",
                        fontWeight: "600"
                    }}
                >
                    Loading...
                </div>
            </div>
        );
    }

    if (!user) {
        return null;
    }

    const isAdmin = user.role === "ADMIN";

    const displayName =
        user.username === "admin"
            ? "Admin"
            : user.username === "supervisor"
                ? "Supervisor"
                : user.username;

    const roleName =
        isAdmin
            ? "Administrator"
            : "Supervisor";

    const avatarLetter =
        displayName.charAt(0).toUpperCase();

    return (
        <div className="app-layout">

            {/* =========================
                SIDEBAR
                ========================= */}
            <aside className="sidebar">

                {/* COMPANY LOGO */}
                <div className="logo">

                    <img
                        src="/dhm-logo.jpg"
                        alt="DHM Pyrotech Enterprises"
                        className="sidebar-logo"
                        style={{
                            position: "static",
                            transform: "none",
                            animation: "none",
                            transition: "none",
                            objectPosition: "center"
                        }}
                    />

                    <div className="logo-text">

                        <h2>DHM</h2>

                        <span>
                            Factory Digital Entry
                        </span>

                    </div>

                </div>


                {/* =========================
                    NAVIGATION
                    ========================= */}
                <nav>

                    <NavLink to="/dashboard">
                        Dashboard
                    </NavLink>

                    <NavLink to="/vehicle-register">
                        Vehicle Register
                    </NavLink>

                    <NavLink to="/sales-register">
                        Sales Register
                    </NavLink>

                    <NavLink to="/purchase-register">
                        Purchase Register
                    </NavLink>

                    <NavLink to="/reactor-timing">
                        Reactor Timing
                    </NavLink>


                    {/* ADMIN ONLY */}
                    {isAdmin && (
                        <>
                            <NavLink to="/reports">
                                Reports
                            </NavLink>

                            <NavLink to="/users">
                                Users
                            </NavLink>
                        </>
                    )}

                </nav>


                {/* =========================
                    SIDEBAR BOTTOM
                    ========================= */}
                <div className="sidebar-bottom">

                    <div className="logged-user">

                        <div className="user-avatar">
                            {avatarLetter}
                        </div>

                        <div className="user-details">

                            <strong>
                                {displayName}
                            </strong>

                            <span>
                                {roleName}
                            </span>

                        </div>

                    </div>


                    <button
                        className="logout-button"
                        onClick={handleLogout}
                    >
                        <span>↪</span>
                        Logout
                    </button>

                </div>

            </aside>


            {/* =========================
                MAIN AREA
                ========================= */}
            <main className="main-content">

                {/* TOP BAR */}
                <header className="topbar">

                    <div>

                        <h2>
                            DHM Factory Digital Entry
                        </h2>

                    </div>

                </header>


                {/* PAGE CONTENT */}
                <section className="page-content">

                    <Outlet />

                </section>

            </main>

        </div>
    );
}

export default MainLayout;