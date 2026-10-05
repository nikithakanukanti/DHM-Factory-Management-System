import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

function Login() {
    const navigate = useNavigate();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function handleLogin(event) {
        event.preventDefault();

        setError("");

        if (!username.trim() || !password) {
            setError("Please enter username and password.");
            return;
        }

        setLoading(true);

        try {
            // ------------------------------------------------
            // STEP 1: Clear any existing Spring Security session
            // ------------------------------------------------
            try {
                await axios.post(
                    "http://localhost:8090/logout",
                    {},
                    {
                        withCredentials: true
                    }
                );
            } catch (logoutError) {
                // It's okay if there was no previous session
                console.log("No previous session to clear.");
            }

            // ------------------------------------------------
            // STEP 2: Login using Spring Security form login
            // ------------------------------------------------
            const formData = new URLSearchParams();

            formData.append("username", username.trim());
            formData.append("password", password);

            await axios.post(
                "http://localhost:8090/login",
                formData,
                {
                    withCredentials: true,
                    headers: {
                        "Content-Type":
                            "application/x-www-form-urlencoded"
                    }
                }
            );

            // ------------------------------------------------
            // STEP 3: Ask backend who actually logged in
            // ------------------------------------------------
            const response = await axios.get(
                "http://localhost:8090/api/auth/me",
                {
                    withCredentials: true
                }
            );

            console.log(
                "Logged in user:",
                response.data
            );

            // ------------------------------------------------
            // STEP 4: Store actual username + role
            // ------------------------------------------------
            sessionStorage.setItem(
                "dhmUser",
                JSON.stringify(response.data)
            );

            // ------------------------------------------------
            // STEP 5: Go to dashboard
            // ------------------------------------------------
            navigate("/dashboard");

        } catch (error) {
            console.error(
                "Login failed:",
                error
            );

            if (error.response) {
                console.error(
                    "Status:",
                    error.response.status
                );

                console.error(
                    "Response:",
                    error.response.data
                );
            }

            setError(
                "Invalid username or password."
            );

        } finally {
            setLoading(false);
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

                    <h2>
                        Welcome Back
                    </h2>

                    <p>
                        Sign in to continue to your dashboard
                    </p>

                </div>

                {/* Error Message */}
                {error && (
                    <div className="login-error">
                        ⚠ {error}
                    </div>
                )}

                {/* Login Form */}
                <form
                    className="login-form"
                    onSubmit={handleLogin}
                >

                    {/* Username */}
                    <div className="form-group">

                        <label>
                            Username
                        </label>

                        <div className="input-wrapper">

                            <span className="input-icon">
                                ◉
                            </span>

                            <input
                                type="text"
                                value={username}
                                onChange={(event) =>
                                    setUsername(
                                        event.target.value
                                    )
                                }
                                placeholder="Enter username"
                                autoComplete="username"
                                disabled={loading}
                            />

                        </div>

                    </div>

                    {/* Password */}
                    <div className="form-group">

                        <label>
                            Password
                        </label>

                        <div className="input-wrapper">

                            <span className="input-icon">
                                ◆
                            </span>

                            <input
                                type={
                                    showPassword
                                        ? "text"
                                        : "password"
                                }
                                value={password}
                                onChange={(event) =>
                                    setPassword(
                                        event.target.value
                                    )
                                }
                                placeholder="Enter password"
                                autoComplete="current-password"
                                disabled={loading}
                            />

                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() =>
                                    setShowPassword(
                                        !showPassword
                                    )
                                }
                                disabled={loading}
                            >
                                {showPassword
                                    ? "◉"
                                    : "◌"}
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

                </form>

                {/* Footer */}
                <div className="login-footer">

                    <span>
                        DHM Factory Management System
                    </span>

                    <span>
                        Secure Access
                    </span>

                </div>

            </div>

        </div>
    );
}

export default Login;