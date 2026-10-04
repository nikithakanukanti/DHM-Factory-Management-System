import { useEffect, useState } from "react";
import axios from "axios";

const API_URL = "http://localhost:8090";

function Users() {

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    async function loadUsers() {
        try {
            setLoading(true);
            setError("");

            const response = await axios.get(
                `${API_URL}/api/users`,
                {
                    withCredentials: true
                }
            );

            setUsers(
                Array.isArray(response.data)
                    ? response.data
                    : []
            );

        } catch (err) {

            console.error("Users error:", err);

            if (err.response?.status === 403) {
                setError(
                    "You do not have permission to view users."
                );
            } else {
                setError(
                    "Unable to load users."
                );
            }

            setUsers([]);

        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadUsers();
    }, []);

    return (
        <div className="users-page">

            <div className="page-header">

                <div>
                    <h1>Users</h1>
                    <p>
                        Manage application users and roles
                    </p>
                </div>

                <button
                    className="secondary-button"
                    onClick={loadUsers}
                >
                    Refresh
                </button>

            </div>

            {loading && (
                <div className="loading">
                    Loading users...
                </div>
            )}

            {!loading && error && (
                <div className="error-box">
                    {error}
                </div>
            )}

            {!loading && !error && (
                <div className="entries-card">

                    <div className="entries-header">
                        <h2>System Users</h2>
                    </div>

                    <div className="table-container">

                        <table>

                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Username</th>
                                    <th>Role</th>
                                </tr>
                            </thead>

                            <tbody>

                                {users.length === 0 ? (

                                    <tr>
                                        <td
                                            colSpan="3"
                                            style={{
                                                textAlign: "center"
                                            }}
                                        >
                                            No users found.
                                        </td>
                                    </tr>

                                ) : (

                                    users.map(user => (

                                        <tr key={user.id}>

                                            <td>
                                                {user.id}
                                            </td>

                                            <td>
                                                {user.username}
                                            </td>

                                            <td>
                                                <span
                                                    className={
                                                        user.role === "ADMIN"
                                                            ? "role-admin"
                                                            : "role-supervisor"
                                                    }
                                                >
                                                    {user.role}
                                                </span>
                                            </td>

                                        </tr>

                                    ))

                                )}

                            </tbody>

                        </table>

                    </div>

                </div>
            )}

        </div>
    );
}

export default Users;