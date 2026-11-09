import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

function Login() {
    const navigate = useNavigate();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [coldStartNotice, setColdStartNotice] = useState(false);
    const [error, setError] = useState("");

    async function handleLogin(event) {
        event.preventDefault();
        setError("");

        if (!username.trim() || !password) {
            setError("Please enter username and password.");
            return;
        }

        setLoading(true);
        setColdStartNotice(false);

        // Show cloud server wake-up notice if it takes more than 3.5 seconds
        const noticeTimer = setTimeout(() => {
            setColdStartNotice(true);
        }, 3500);

        try {
            // STEP 1: Attempt JSON token-based login
            let userData = null;

            try {
                const res = await api.post("/api/auth/login", {
                    username: username.trim(),
                    password: password
                });

                if (res.data && res.data.token) {
                    userData = {
                        username: res.data.username || username.trim(),
                        role: res.data.role || "ADMIN",
                        token: res.data.token
                    };
                }
            } catch (jsonErr) {
                // If 401 Unauthorized, rethrow so user sees invalid credentials
                if (jsonErr.response?.status === 401) {
                    throw jsonErr;
                }
                // Fallback to legacy form login if endpoint not reached
                console.warn("JSON login endpoint fallback, attempting form login...", jsonErr);
            }

            // STEP 2: Fallback to form-login if JSON login was not returned
            if (!userData) {
                const formData = new URLSearchParams();
                formData.append("username", username.trim());
                formData.append("password", password);

                await api.post("/login", formData, {
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded"
                    }
                });

                // Fetch user details from /api/auth/me
                const meRes = await api.get("/api/auth/me");
                userData = {
                    username: meRes.data?.username || username.trim(),
                    role: meRes.data?.role || "ADMIN",
                    token: ""
                };
            }

            // STEP 3: Store authenticated user
            localStorage.setItem("dhmUser", JSON.stringify(userData));
            sessionStorage.setItem("dhmUser", JSON.stringify(userData));

            // STEP 4: Navigate to appropriate landing page
            if (userData.role === "SUPERVISOR") {
                navigate("/vehicle-register", { replace: true });
            } else {
                navigate("/dashboard", { replace: true });
            }

        } catch (err) {
            console.error("Login failed:", err);

            if (err.response?.data?.error) {
                setError(err.response.data.error);
            } else if (err.response?.status === 401 || err.response?.status === 403) {
                setError("Invalid username or password.");
            } else if (err.code === "ECONNABORTED" || !err.response) {
                setError("Server is currently waking up or unreachable. Please try again in 10-15 seconds.");
            } else {
                setError("Unable to connect to the server. Please try again.");
            }
        } finally {
            clearTimeout(noticeTimer);
            setLoading(false);
            setColdStartNotice(false);
        }
    }

    return (
        <div className="login-page">

            {/* Background effects */}
            <div className="login-glow glow-one"></div>
            <div className="login-glow glow-two"></div>

            {/* Login Card */}
            <div className="login-card">

                {/* Company Branding */}
                <div className="login-brand">
                    <img
                        src="/dhm-logo.jpg"
                        alt="DHM Pyrotech Enterprises"
                        className="company-logo"
                    />
                    <div>
                        <h1>DHM</h1>
                        <h2>Pyrotech Enterprises</h2>
                    </div>
                </div>

                <div className="login-divider"></div>

                {/* Heading */}
                <div className="login-heading">
                    <h2>Welcome Back</h2>
                    <p>Sign in to continue to your factory dashboard</p>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="login-error">
                        ⚠ {error}
                    </div>
                )}

                {/* Cold Start Notice */}
                {coldStartNotice && (
                    <div style={{
                        background: "rgba(59, 130, 246, 0.12)",
                        border: "1px solid rgba(59, 130, 246, 0.3)",
                        color: "#93c5fd",
                        padding: "10px 14px",
                        borderRadius: "8px",
                        fontSize: "12px",
                        marginBottom: "16px",
                        textAlign: "center"
                    }}>
                        ⏳ Waking up cloud server... please hold on a few seconds.
                    </div>
                )}

                {/* Login Form */}
                <form
                    className="login-form"
                    onSubmit={handleLogin}
                >

                    {/* Username */}
                    <div className="form-group">
                        <label>Username</label>
                        <div className="input-wrapper">
                            <span className="input-icon">◉</span>
                            <input
                                type="text"
                                value={username}
                                onChange={(event) => setUsername(event.target.value)}
                                placeholder="Enter username"
                                autoComplete="username"
                                disabled={loading}
                                required
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div className="form-group">
                        <label>Password</label>
                        <div className="input-wrapper">
                            <span className="input-icon">◆</span>
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                placeholder="Enter password"
                                autoComplete="current-password"
                                disabled={loading}
                                required
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowPassword(!showPassword)}
                                disabled={loading}
                                aria-label="Toggle password visibility"
                            >
                                {showPassword ? "◉" : "◌"}
                            </button>
                        </div>
                    </div>

                    {/* Sign In Button */}
                    <button
                        type="submit"
                        className="login-button"
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <span className="button-spinner"></span>
                                Signing in...
                            </>
                        ) : (
                            <>
                                Sign In
                                <span>→</span>
                            </>
                        )}
                    </button>

                    {/* Quick Demo Credentials */}
                    <div style={{ display: 'flex', gap: '8px', marginTop: '14px', justifyContent: 'center' }}>
                        <button
                            type="button"
                            onClick={() => { setUsername('admin'); setPassword('Admin@123'); setError(''); }}
                            style={{
                                background: 'rgba(255,255,255,0.08)',
                                border: '1px solid rgba(255,255,255,0.18)',
                                color: '#b5c4d3',
                                padding: '6px 12px',
                                borderRadius: '7px',
                                fontSize: '11px',
                                cursor: 'pointer'
                            }}
                        >
                            ⚡ Admin Demo
                        </button>
                        <button
                            type="button"
                            onClick={() => { setUsername('supervisor'); setPassword('Supervisor@123'); setError(''); }}
                            style={{
                                background: 'rgba(255,255,255,0.08)',
                                border: '1px solid rgba(255,255,255,0.18)',
                                color: '#b5c4d3',
                                padding: '6px 12px',
                                borderRadius: '7px',
                                fontSize: '11px',
                                cursor: 'pointer'
                            }}
                        >
                            ⚡ Supervisor Demo
                        </button>
                    </div>

                </form>

                {/* Footer */}
                <div className="login-footer">
                    <span>DHM Factory Management System</span>
                    <span>Secure Access</span>
                </div>

            </div>

        </div>
    );
}

export default Login;
