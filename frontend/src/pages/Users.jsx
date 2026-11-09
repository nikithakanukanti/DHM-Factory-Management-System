import { useEffect, useState } from "react";
import api from "../api";

function Users() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const [showAddModal, setShowAddModal] = useState(false);
    const [newUsername, setNewUsername] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [newRole, setNewRole] = useState("SUPERVISOR");

    async function loadUsers() {
        try {
            setLoading(true);
            setError("");

            const response = await api.get("/api/users");

            setUsers(Array.isArray(response.data) ? response.data : []);
        } catch (err) {
            console.error("Users error:", err);
            if (err.response?.status === 403) {
                setError("You do not have administrative permission to manage users.");
            } else {
                setError("Unable to load user accounts.");
            }
            setUsers([]);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadUsers();
    }, []);

    async function handleCreateUser(e) {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (!newUsername.trim() || !newPassword) {
            setError("Please provide username and password.");
            return;
        }

        try {
            setSaving(true);
            await api.post("/api/users", {
                username: newUsername.trim(),
                password: newPassword,
                role: newRole
            });

            setSuccess(`User "${newUsername.trim()}" created successfully as ${newRole}.`);
            setNewUsername("");
            setNewPassword("");
            setNewRole("SUPERVISOR");
            setShowAddModal(false);
            await loadUsers();
        } catch (err) {
            console.error("Create user error:", err);
            setError(err.response?.data || "Unable to create user account. Username may already exist.");
        } finally {
            setSaving(false);
        }
    }

    async function handleDeleteUser(user) {
        if (user.username.toLowerCase() === "admin") {
            alert("Default admin account cannot be deleted.");
            return;
        }

        if (!window.confirm(`Are you sure you want to delete user account "${user.username}"?`)) {
            return;
        }

        try {
            setLoading(true);
            setError("");
            setSuccess("");

            await api.delete(`/api/users/${user.id}`);
            setSuccess(`User account "${user.username}" deleted successfully.`);
            await loadUsers();
        } catch (err) {
            console.error("Delete user error:", err);
            setError("Unable to delete user account.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="users-page">

            {/* PAGE HEADER */}
            <div className="page-header">
                <div>
                    <h1>USER MANAGEMENT</h1>
                    <p>Manage system access accounts (Administrator & Shift Supervisors)</p>
                </div>

                <div style={{ display: "flex", gap: "10px" }}>
                    <button
                        className="secondary-button"
                        onClick={loadUsers}
                        disabled={loading || saving}
                    >
                        {loading ? "Loading..." : "Refresh"}
                    </button>

                    <button
                        className="primary-button"
                        onClick={() => { setShowAddModal(true); setError(""); setSuccess(""); }}
                    >
                        + Add New User
                    </button>
                </div>
            </div>

            {/* NOTIFICATIONS */}
            {success && (
                <div className="success-message" style={{ marginBottom: "20px" }}>
                    ✓ {success}
                </div>
            )}

            {error && (
                <div className="error-message" style={{ marginBottom: "20px" }}>
                    ⚠ {error}
                </div>
            )}

            {/* CREATE USER MODAL / CARD */}
            {showAddModal && (
                <div className="card" style={{ marginBottom: "25px", border: "1px solid #93c5fd" }}>
                    <div className="section-header">
                        <div>
                            <h2>Create New User Account</h2>
                            <p>Configure credentials and access permissions</p>
                        </div>
                    </div>

                    <form onSubmit={handleCreateUser} className="form-grid">
                        <div className="form-group">
                            <label>Username *</label>
                            <input
                                type="text"
                                value={newUsername}
                                onChange={(e) => setNewUsername(e.target.value)}
                                placeholder="Enter username"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Password *</label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Enter temporary password"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Role *</label>
                            <select
                                value={newRole}
                                onChange={(e) => setNewRole(e.target.value)}
                                required
                            >
                                <option value="SUPERVISOR">SUPERVISOR (Data Entry & Weighbridge)</option>
                                <option value="ADMIN">ADMIN (Full Access & Reports)</option>
                            </select>
                        </div>

                        <div style={{ gridColumn: "1 / -1", display: "flex", gap: "10px", marginTop: "10px" }}>
                            <button
                                type="submit"
                                className="primary-button"
                                disabled={saving}
                            >
                                {saving ? "Creating..." : "Create Account"}
                            </button>

                            <button
                                type="button"
                                className="secondary-button"
                                onClick={() => setShowAddModal(false)}
                                disabled={saving}
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* USERS TABLE */}
            <div className="card">
                <div className="section-header">
                    <div>
                        <h2>System Accounts ({users.length})</h2>
                        <p>Active user credentials in DHM factory system</p>
                    </div>
                </div>

                <div className="table-container" style={{ overflowX: "auto" }}>
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Username</th>
                                <th>System Role</th>
                                <th>Access Rights</th>
                                <th>Actions</th>
                            </tr>
                        </thead>

                        <tbody>
                            {users.length === 0 ? (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: "center", padding: "30px", color: "#64748b" }}>
                                        No users found.
                                    </td>
                                </tr>
                            ) : (
                                users.map((user) => (
                                    <tr key={user.id}>
                                        <td>{user.id}</td>
                                        <td><strong>{user.username}</strong></td>
                                        <td>
                                            <span style={{
                                                display: "inline-block",
                                                padding: "3px 10px",
                                                borderRadius: "6px",
                                                fontSize: "11px",
                                                fontWeight: "bold",
                                                background: user.role === "ADMIN" ? "#dbeafe" : "#f1f5f9",
                                                color: user.role === "ADMIN" ? "#1e40af" : "#475569"
                                            }}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td>
                                            {user.role === "ADMIN"
                                                ? "Full Access (Dashboard, Reports, Users, All Registers)"
                                                : "Shift Entry (Vehicle Register, Sales, Purchases, Today's Edits)"
                                            }
                                        </td>
                                        <td>
                                            {user.username.toLowerCase() !== "admin" ? (
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteUser(user)}
                                                    style={{
                                                        padding: "4px 8px",
                                                        fontSize: "11px",
                                                        background: "#fee2e2",
                                                        border: "1px solid #fca5a5",
                                                        color: "#b91c1c",
                                                        borderRadius: "5px",
                                                        cursor: "pointer"
                                                    }}
                                                >
                                                    Delete
                                                </button>
                                            ) : (
                                                <span style={{ fontSize: "11px", color: "#94a3b8" }}>Primary Admin</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

            </div>

        </div>
    );
}

export default Users;
