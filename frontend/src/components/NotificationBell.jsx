import { useState, useEffect, useRef } from "react";
import api from "../api";

function NotificationBell() {
    const [unreadCount, setUnreadCount] = useState(0);
    const [notifications, setNotifications] = useState([]);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef(null);

    const loadUnreadCount = async () => {
        try {
            const res = await api.get("/api/notifications/unread-count");
            if (res.data && res.data.unreadCount !== undefined) {
                setUnreadCount(res.data.unreadCount);
            }
        } catch (e) {
            // Ignore if unauthorized
        }
    };

    const loadNotifications = async () => {
        try {
            setLoading(true);
            const res = await api.get("/api/notifications");
            if (Array.isArray(res.data)) {
                setNotifications(res.data);
            }
        } catch (e) {
            console.error("Notifications error:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUnreadCount();
        const interval = setInterval(loadUnreadCount, 30000); // 30s polling
        return () => clearInterval(interval);
    }, []);

    const toggleOpen = () => {
        if (!open) {
            loadNotifications();
        }
        setOpen(!open);
    };

    const markAllRead = async () => {
        try {
            await api.put("/api/notifications/read-all");
            setUnreadCount(0);
            setNotifications(notifications.map(n => ({ ...n, read: true })));
        } catch (e) {
            console.error("Mark read error:", e);
        }
    };

    // Close on outside click
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div ref={dropdownRef} style={{ position: "relative", display: "inline-block" }}>
            <button
                type="button"
                onClick={toggleOpen}
                aria-label="Notifications"
                style={{
                    background: "rgba(255, 255, 255, 0.15)",
                    border: "1px solid rgba(255, 255, 255, 0.25)",
                    borderRadius: "50%",
                    width: "38px",
                    height: "38px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    position: "relative",
                    color: "white",
                    fontSize: "16px"
                }}
            >
                🔔
                {unreadCount > 0 && (
                    <span style={{
                        position: "absolute",
                        top: "-4px",
                        right: "-4px",
                        background: "#ef4444",
                        color: "white",
                        borderRadius: "10px",
                        padding: "1px 6px",
                        fontSize: "10px",
                        fontWeight: "bold",
                        lineHeight: "14px"
                    }}>
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <div style={{
                    position: "absolute",
                    right: 0,
                    top: "46px",
                    width: "340px",
                    background: "#ffffff",
                    borderRadius: "12px",
                    boxShadow: "0 12px 30px rgba(0, 0, 0, 0.2)",
                    border: "1px solid #e2e8f0",
                    zIndex: 2000,
                    overflow: "hidden"
                }}>
                    <div style={{
                        padding: "12px 16px",
                        background: "#173f67",
                        color: "white",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                    }}>
                        <strong style={{ fontSize: "14px" }}>Notifications ({unreadCount} new)</strong>
                        {unreadCount > 0 && (
                            <button
                                type="button"
                                onClick={markAllRead}
                                style={{
                                    background: "none",
                                    border: "none",
                                    color: "#93c5fd",
                                    fontSize: "11px",
                                    cursor: "pointer",
                                    textDecoration: "underline"
                                }}
                            >
                                Mark all as read
                            </button>
                        )}
                    </div>

                    <div style={{ maxHeight: "320px", overflowY: "auto", padding: "8px 0" }}>
                        {loading ? (
                            <div style={{ padding: "20px", textAlign: "center", color: "#64748b", fontSize: "12px" }}>
                                Loading notifications...
                            </div>
                        ) : notifications.length === 0 ? (
                            <div style={{ padding: "20px", textAlign: "center", color: "#64748b", fontSize: "12px" }}>
                                No recent notifications.
                            </div>
                        ) : (
                            notifications.map((n) => (
                                <div
                                    key={n.id}
                                    style={{
                                        padding: "10px 16px",
                                        borderBottom: "1px solid #f1f5f9",
                                        background: n.read ? "#ffffff" : "#f0f9ff",
                                        display: "flex",
                                        gap: "10px",
                                        alignItems: "flex-start"
                                    }}
                                >
                                    <span style={{ fontSize: "16px", marginTop: "2px" }}>
                                        {n.type === "WARNING" ? "⚠" : n.type === "SUCCESS" ? "✓" : "ℹ"}
                                    </span>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: "12px", fontWeight: "600", color: "#1e293b" }}>
                                            {n.title}
                                        </div>
                                        <div style={{ fontSize: "11px", color: "#475569", marginTop: "2px" }}>
                                            {n.message}
                                        </div>
                                        <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "4px" }}>
                                            {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default NotificationBell;
