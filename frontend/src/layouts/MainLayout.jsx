import { NavLink, Outlet, useNavigate } from "react-router-dom";

function MainLayout() {
    const navigate = useNavigate();

    function handleLogout() {
        localStorage.removeItem("username");
        localStorage.removeItem("role");

        fetch("http://localhost:8090/logout", {
            method: "POST",
            credentials: "include"
        }).finally(() => {
            navigate("/login");
        });
    }

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
                            objectPosition: "center",
                        }}
                    />

                    <div className="logo-text">
                        <h2>DHM</h2>
                        <span>Factory Digital Entry</span>
                    </div>

                </div>


                {/* NAVIGATION */}
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

                    <NavLink to="/reports">
                        Reports
                    </NavLink>

                    <NavLink to="/users">
                        Users
                    </NavLink>

                </nav>


                {/* SIDEBAR BOTTOM */}
                <div className="sidebar-bottom">

                    <div className="logged-user">
                        <div className="user-avatar">
                            A
                        </div>

                        <div className="user-details">
                            <strong>Admin</strong>
                            <span>Administrator</span>
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