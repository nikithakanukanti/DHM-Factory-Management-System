import { useEffect, useState, useMemo } from "react";
import api from "../api";

function Users() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState("ALL");

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);

    const [form, setForm] = useState({
        username: "",
        fullName: "",
        phone: "",
        role: "SUPERVISOR",
        password: "",
        permittedModules: "DASHBOARD,VEHICLES,SALES,PURCHASES,REPORTS"
    });

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

    function openAddModal() {
        setEditingUser(null);
        setForm({
            username: "",
            fullName: "",
            phone: "",
            role: "SUPERVISOR",
            password: "",
            permittedModules: "DASHBOARD,VEHICLES,SALES,PURCHASES,REPORTS"
        });
        setError("");
        setSuccess("");
        setShowModal(true);
    }

    function openEditModal(u) {
        setEditingUser(u);
        setForm({
            username: u.username,
            fullName: u.fullName || "",
            phone: u.phone || "",
            role: u.role || "SUPERVISOR",
            password: "", // empty means keep existing password
            permittedModules: u.permittedModules || "DASHBOARD,VEHICLES,SALES,PURCHASES,REPORTS"
        });
        setError("");
        setSuccess("");
        setShowModal(true);
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (!editingUser && (!form.username.trim() || !form.password)) {
            setError("Please provide username and password for new user.");
            return;
        }

        try {
            setSaving(true);
            if (editingUser) {
                const payload = {
                    fullName: form.fullName,
                    phone: form.phone,
                    role: form.role,
                    permittedModules: form.permittedModules
                };
                if (form.password.trim()) {
                    payload.password = form.password.trim();
                }

                await api.put(`/api/users/${editingUser.id}`, payload);
                setSuccess(`User account "${editingUser.username}" updated successfully.`);
            } else {
                await api.post("/api/users", {
                    username: form.username.trim(),
                    fullName: form.fullName.trim(),
                    phone: form.phone.trim(),
                    role: form.role,
                    password: form.password,
                    permittedModules: form.permittedModules
                });
                setSuccess(`User "${form.username.trim()}" created successfully as ${form.role}.`);
            }

            setShowModal(false);
            await loadUsers();
        } catch (err) {
            console.error("Save user error:", err);
            setError(err.response?.data?.message || err.response?.data || "Unable to save user account.");
        } finally {
            setSaving(false);
        }
    }

    async function handleToggleStatus(u) {
        if (u.username.toLowerCase() === "admin") {
            alert("Default admin account cannot be deactivated.");
            return;
        }

        const actionWord = u.active ? "deactivate" : "activate";
        if (!window.confirm(`Are you sure you want to ${actionWord} user "${u.username}"?`)) {
            return;
        }

        try {
            setLoading(true);
            setError("");
            await api.patch(`/api/users/${u.id}/toggle-status`);
            setSuccess(`User "${u.username}" has been ${u.active ? "deactivated" : "activated"}.`);
            await loadUsers();
        } catch (err) {
            console.error("Toggle user status error:", err);
            setError(err.response?.data || "Failed to update user status.");
        } finally {
            setLoading(false);
        }
    }

    async function handleDeleteUser(user) {
        if (user.username.toLowerCase() === "admin") {
            alert("Default admin account cannot be deleted.");
            return;
        }

        if (!window.confirm(`Are you sure you want to delete user account "${user.username}"? This action cannot be undone.`)) {
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

    const filteredUsers = useMemo(() => {
        return users.filter(u => {
            const matchesSearch = !search ||
                (u.username && u.username.toLowerCase().includes(search.toLowerCase())) ||
                (u.fullName && u.fullName.toLowerCase().includes(search.toLowerCase())) ||
                (u.phone && u.phone.includes(search));

            const matchesRole = roleFilter === "ALL" || u.role === roleFilter;

            return matchesSearch && matchesRole;
        });
    }, [users, search, roleFilter]);

    return (
        <div className="users-page">

            {/* PAGE HEADER */}
            <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: "24px", color: "#1e3a8a", fontWeight: "700" }}>USER ACCESS & PERMISSIONS</h1>
                    <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "14px" }}>
                        Manage Administrator, Plant Supervisor, and Client access credentials with role-based policies.
                    </p>
                </div>

                <div style={{ display: "flex", gap: "10px" }}>
                    <button
                        className="secondary-button"
                        onClick={loadUsers}
                        disabled={loading || saving}
                        style={{ padding: "8px 16px", borderRadius: "6px", cursor: "pointer", border: "1px solid #cbd5e1", background: "#f8fafc" }}
                    >
                        {loading ? "Loading..." : "↻ Refresh"}
                    </button>

                    <button
                        className="primary-button"
                        onClick={openAddModal}
                        style={{ padding: "8px 18px", borderRadius: "6px", cursor: "pointer", background: "#2563eb", color: "#fff", fontWeight: "600", border: "none" }}
                    >
                        + Add New User
                    </button>
                </div>
            </div>

            {/* NOTIFICATIONS */}
            {success && (
                <div style={{ padding: "12px 16px", background: "#ecfdf5", border: "1px solid #a7f3d0", color: "#065f46", borderRadius: "8px", marginBottom: "16px" }}>
                    ✓ {success}
                </div>
            )}

            {error && (
                <div style={{ padding: "12px 16px", background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", borderRadius: "8px", marginBottom: "16px" }}>
                    ⚠ {error}
                </div>
            )}

            {/* SEARCH & FILTERS BAR */}
            <div className="card" style={{ padding: "16px", background: "#fff", borderRadius: "10px", border: "1px solid #e2e8f0", marginBottom: "20px" }}>
                <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "center" }}>
                    <div style={{ flex: 1, minWidth: "220px" }}>
                        <input
                            type="text"
                            placeholder="🔍 Search users by username, full name, or phone..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            style={{ width: "100%", padding: "9px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "14px" }}
                        />
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <label style={{ fontSize: "13px", fontWeight: "600", color: "#475569" }}>Role:</label>
                        <select
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                            style={{ padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "14px" }}
                        >
                            <option value="ALL">All Roles</option>
                            <option value="ADMIN">Admin</option>
                            <option value="SUPERVISOR">Supervisor</option>
                            <option value="CLIENT">Client</option>
                        </select>
                    </div>

                    <div style={{ color: "#64748b", fontSize: "13px" }}>
                        Showing <strong>{filteredUsers.length}</strong> user accounts
                    </div>
                </div>
            </div>

            {/* USERS TABLE */}
            <div className="card" style={{ background: "#fff", borderRadius: "10px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
                        <thead>
                            <tr style={{ background: "#f1f5f9", borderBottom: "1px solid #cbd5e1", color: "#334155", fontWeight: "600" }}>
                                <th style={{ padding: "12px 16px" }}>#</th>
                                <th style={{ padding: "12px 16px" }}>Username</th>
                                <th style={{ padding: "12px 16px" }}>Full Name</th>
                                <th style={{ padding: "12px 16px" }}>Role</th>
                                <th style={{ padding: "12px 16px" }}>Status</th>
                                <th style={{ padding: "12px 16px" }}>Contact</th>
                                <th style={{ padding: "12px 16px" }}>Permitted Modules</th>
                                <th style={{ padding: "12px 16px", textAlign: "center" }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan="8" style={{ padding: "24px", textAlign: "center", color: "#64748b" }}>
                                        {loading ? "Loading user accounts..." : "No users found matching your search."}
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map((u, idx) => (
                                    <tr key={u.id} style={{ borderBottom: "1px solid #f1f5f9", background: !u.active ? "#fff1f2" : "transparent" }}>
                                        <td style={{ padding: "12px 16px", color: "#64748b" }}>{idx + 1}</td>
                                        <td style={{ padding: "12px 16px", fontWeight: "600", color: "#1e293b" }}>
                                            {u.username}
                                            {u.username.toLowerCase() === "admin" && (
                                                <span style={{ marginLeft: "6px", fontSize: "11px", background: "#fef3c7", color: "#92400e", padding: "2px 6px", borderRadius: "4px" }}>
                                                    Primary
                                                </span>
                                            )}
                                        </td>
                                        <td style={{ padding: "12px 16px", color: "#334155" }}>{u.fullName || "—"}</td>
                                        <td style={{ padding: "12px 16px" }}>
                                            <span style={{
                                                padding: "4px 8px",
                                                borderRadius: "4px",
                                                fontSize: "12px",
                                                fontWeight: "600",
                                                background: u.role === "ADMIN" ? "#dbeafe" : u.role === "SUPERVISOR" ? "#fef3c7" : "#ede9fe",
                                                color: u.role === "ADMIN" ? "#1e40af" : u.role === "SUPERVISOR" ? "#92400e" : "#5b21b6"
                                            }}>
                                                {u.role}
                                            </span>
                                        </td>
                                        <td style={{ padding: "12px 16px" }}>
                                            <span style={{
                                                padding: "3px 8px",
                                                borderRadius: "12px",
                                                fontSize: "12px",
                                                fontWeight: "600",
                                                background: u.active ? "#dcfce7" : "#fee2e2",
                                                color: u.active ? "#15803d" : "#b91c1c"
                                            }}>
                                                ● {u.active ? "Active" : "Deactivated"}
                                            </span>
                                        </td>
                                        <td style={{ padding: "12px 16px", color: "#475569" }}>{u.phone || "—"}</td>
                                        <td style={{ padding: "12px 16px", color: "#64748b", fontSize: "12px" }}>
                                            {u.role === "ADMIN" ? "All Modules (Full Access)" : (u.permittedModules || "Standard")}
                                        </td>
                                        <td style={{ padding: "12px 16px", textAlign: "center" }}>
                                            <div style={{ display: "inline-flex", gap: "6px" }}>
                                                <button
                                                    onClick={() => openEditModal(u)}
                                                    title="Edit user details"
                                                    style={{ padding: "5px 10px", borderRadius: "4px", border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer", fontSize: "12px" }}
                                                >
                                                    ✎ Edit
                                                </button>

                                                {u.username.toLowerCase() !== "admin" && (
                                                    <button
                                                        onClick={() => handleToggleStatus(u)}
                                                        title={u.active ? "Deactivate user" : "Activate user"}
                                                        style={{
                                                            padding: "5px 10px",
                                                            borderRadius: "4px",
                                                            border: "1px solid",
                                                            borderColor: u.active ? "#fca5a5" : "#86efac",
                                                            background: u.active ? "#fff1f2" : "#f0fdf4",
                                                            color: u.active ? "#b91c1c" : "#15803d",
                                                            cursor: "pointer",
                                                            fontSize: "12px"
                                                        }}
                                                    >
                                                        {u.active ? "Deactivate" : "Activate"}
                                                    </button>
                                                )}

                                                {u.username.toLowerCase() !== "admin" && (
                                                    <button
                                                        onClick={() => handleDeleteUser(u)}
                                                        title="Delete user account"
                                                        style={{ padding: "5px 10px", borderRadius: "4px", border: "1px solid #fecaca", background: "#fef2f2", color: "#dc2626", cursor: "pointer", fontSize: "12px" }}
                                                    >
                                                        ✕ Delete
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ADD / EDIT USER MODAL */}
            {showModal && (
                <div style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: "rgba(15, 23, 42, 0.6)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 9999,
                    padding: "20px"
                }}>
                    <div style={{
                        background: "#fff",
                        borderRadius: "12px",
                        maxWidth: "520px",
                        width: "100%",
                        padding: "24px",
                        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
                    }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                            <h2 style={{ margin: 0, fontSize: "18px", color: "#1e3a8a" }}>
                                {editingUser ? `Edit User: ${editingUser.username}` : "Create New User Account"}
                            </h2>
                            <button
                                onClick={() => setShowModal(false)}
                                style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#94a3b8" }}
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                                <div>
                                    <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px", color: "#334155" }}>
                                        Username *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        disabled={Boolean(editingUser)}
                                        value={form.username}
                                        onChange={(e) => setForm({ ...form, username: e.target.value })}
                                        placeholder="e.g. shift_supervisor"
                                        style={{ width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "14px" }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px", color: "#334155" }}>
                                        Role *
                                    </label>
                                    <select
                                        value={form.role}
                                        onChange={(e) => setForm({ ...form, role: e.target.value })}
                                        style={{ width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "14px" }}
                                    >
                                        <option value="SUPERVISOR">SUPERVISOR (Shift Weighbridge & Registers)</option>
                                        <option value="ADMIN">ADMIN (Full System Control)</option>
                                        <option value="CLIENT">CLIENT (Permitted Reports & Records Only)</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                                <div>
                                    <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px", color: "#334155" }}>
                                        Full Name
                                    </label>
                                    <input
                                        type="text"
                                        value={form.fullName}
                                        onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                                        placeholder="e.g. Rajesh Kumar"
                                        style={{ width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "14px" }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px", color: "#334155" }}>
                                        Phone Number
                                    </label>
                                    <input
                                        type="text"
                                        value={form.phone}
                                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                        placeholder="+91 9876543210"
                                        style={{ width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "14px" }}
                                    />
                                </div>
                            </div>

                            <div style={{ marginBottom: "12px" }}>
                                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px", color: "#334155" }}>
                                    {editingUser ? "Reset Password (leave blank to keep current)" : "Password *"}
                                </label>
                                <input
                                    type="password"
                                    required={!editingUser}
                                    value={form.password}
                                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                                    placeholder={editingUser ? "••••••••" : "Minimum 6 characters"}
                                    style={{ width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "14px" }}
                                />
                            </div>

                            {form.role === "CLIENT" && (
                                <div style={{ marginBottom: "16px", padding: "10px", background: "#f8fafc", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                                    <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px", color: "#334155" }}>
                                        Permitted Modules (comma separated)
                                    </label>
                                    <input
                                        type="text"
                                        value={form.permittedModules}
                                        onChange={(e) => setForm({ ...form, permittedModules: e.target.value })}
                                        placeholder="DASHBOARD,REPORTS,SALES"
                                        style={{ width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "13px" }}
                                    />
                                    <small style={{ color: "#64748b", fontSize: "11px", display: "block", marginTop: "4px" }}>
                                        Clients will only see and access navigation items specified in this list.
                                    </small>
                                </div>
                            )}

                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    style={{ padding: "8px 16px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer" }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    style={{ padding: "8px 20px", borderRadius: "6px", border: "none", background: "#2563eb", color: "#fff", fontWeight: "600", cursor: "pointer" }}
                                >
                                    {saving ? "Saving..." : editingUser ? "Save Changes" : "Create Account"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}

export default Users;
