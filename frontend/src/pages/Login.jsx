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

            const formData = new URLSearchParams();

            formData.append("username", username);
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

            navigate("/dashboard");

        } catch (error) {

            console.error("Login failed:", error);

            setError(
                "Invalid username or password."
            );

        } finally {

            setLoading(false);

        }
    }

    return (

        <div className="login-page">

            <div className="login-glow glow-one"></div>
            <div className="login-glow glow-two"></div>

            <div className="login-card">

                <div className="login-brand">
                    <img src="/dhm-logo.jpg" alt="DHM Pyrotech Enterprises" className="company-logo" />
                    <div>
                        <h1>DHM </h1>
                        <h2>Pyrotech Enterprises</h2>
                    </div>

                    

                    

                </div>

                <div className="login-divider"></div>

                <div className="login-heading">

                    <h2>
                        Welcome Back
                    </h2>

                    <p>
                        Sign in to continue to your dashboard
                    </p>

                </div>

                {error && (
                    <div className="login-error">
                        ⚠ {error}
                    </div>
                )}

                <form
                    className="login-form"
                    onSubmit={handleLogin}
                >

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
                                onChange={(e) =>
                                    setUsername(e.target.value)
                                }
                                placeholder="Enter username"
                                autoComplete="username"
                            />

                        </div>

                    </div>

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
                                onChange={(e) =>
                                    setPassword(e.target.value)
                                }
                                placeholder="Enter password"
                                autoComplete="current-password"
                            />

                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() =>
                                    setShowPassword(
                                        !showPassword
                                    )
                                }
                            >
                                {showPassword
                                    ? "◉"
                                    : "◌"}
                            </button>

                        </div>

                    </div>

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