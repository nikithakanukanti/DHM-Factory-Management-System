import { useEffect, useMemo, useState } from "react";
import api from "../api";

const emptyItem = {
    itemCode: "",
    name: "",
    category: "RAW_MATERIAL",
    unit: "KG",
    minStockAlert: "0",
    unitPrice: "0"
};

function getTodayDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function Inventory() {
    const currentUser = (() => { try { return JSON.parse(localStorage.getItem("dhmUser") || sessionStorage.getItem("dhmUser") || "{}"); } catch { return {}; } })();
    const isClient = currentUser?.role === "CLIENT";
    const [items, setItems] = useState([]);
    const [movements, setMovements] = useState([]);
    const [lowStockItems, setLowStockItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [search, setSearch] = useState("");
    const [itemModalOpen, setItemModalOpen] = useState(false);
    const [movementModalOpen, setMovementModalOpen] = useState(false);
    const [editingItemId, setEditingItemId] = useState(null);
    const [itemForm, setItemForm] = useState(emptyItem);
    const [movementForm, setMovementForm] = useState({
        itemId: "",
        movementType: "STOCK_IN",
        quantity: "",
        date: getTodayDate(),
        remarks: ""
    });

    useEffect(() => {
        loadInventory();
    }, []);

    async function loadInventory() {
        try {
            setLoading(true);
            setError("");
            const [itemsResponse, movementsResponse, lowStockResponse] = await Promise.all([
                api.get("/api/inventory/items"),
                api.get("/api/inventory/movements"),
                api.get("/api/inventory/low-stock")
            ]);
            setItems(Array.isArray(itemsResponse.data) ? itemsResponse.data : []);
            setMovements(Array.isArray(movementsResponse.data) ? movementsResponse.data : []);
            setLowStockItems(Array.isArray(lowStockResponse.data) ? lowStockResponse.data : []);
        } catch (err) {
            console.error("Inventory loading error:", err);
            setError(err.response?.data?.message || "Unable to load inventory. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    function openAddItem() {
        setEditingItemId(null);
        setItemForm({ ...emptyItem });
        setError("");
        setItemModalOpen(true);
    }

    function openEditItem(item) {
        setEditingItemId(item.id);
        setItemForm({
            itemCode: item.itemCode || "",
            name: item.name || "",
            category: item.category || "RAW_MATERIAL",
            unit: item.unit || "KG",
            minStockAlert: item.minStockAlert ?? "0",
            unitPrice: item.unitPrice ?? "0"
        });
        setError("");
        setItemModalOpen(true);
    }

    async function saveItem(event) {
        event.preventDefault();
        setError("");
        setSuccess("");

        const minimum = Number(itemForm.minStockAlert);
        const price = Number(itemForm.unitPrice);
        if (!itemForm.name.trim() || !itemForm.category || !itemForm.unit) {
            setError("Enter an item name, category, and unit.");
            return;
        }
        if (!Number.isFinite(minimum) || minimum < 0 || !Number.isFinite(price) || price < 0) {
            setError("Minimum stock and unit price must be zero or greater.");
            return;
        }

        const payload = {
            ...itemForm,
            itemCode: itemForm.itemCode.trim(),
            name: itemForm.name.trim(),
            minStockAlert: minimum,
            unitPrice: price
        };

        try {
            setSaving(true);
            if (editingItemId) {
                await api.put(`/api/inventory/items/${editingItemId}`, payload);
                setSuccess(`Item "${payload.name}" updated.`);
            } else {
                await api.post("/api/inventory/items", payload);
                setSuccess(`Item "${payload.name}" created.`);
            }
            setItemModalOpen(false);
            await loadInventory();
        } catch (err) {
            console.error("Inventory item save error:", err);
            setError(err.response?.data?.message || (typeof err.response?.data === "string" ? err.response.data : "Unable to save inventory item."));
        } finally {
            setSaving(false);
        }
    }

    async function deleteItem(item) {
        if (!window.confirm(`Delete "${item.name}" from the item master?`)) return;
        setError("");
        setSuccess("");
        try {
            await api.delete(`/api/inventory/items/${item.id}`);
            setSuccess(`Item "${item.name}" deleted.`);
            await loadInventory();
        } catch (err) {
            console.error("Inventory item delete error:", err);
            setError(err.response?.data?.message || "Unable to delete this item.");
        }
    }

    function openMovementForm() {
        setMovementForm({
            itemId: items[0] ? String(items[0].id) : "",
            movementType: "STOCK_IN",
            quantity: "",
            date: getTodayDate(),
            remarks: ""
        });
        setError("");
        setMovementModalOpen(true);
    }

    async function saveMovement(event) {
        event.preventDefault();
        setError("");
        setSuccess("");

        const quantity = Number(movementForm.quantity);
        const item = items.find((entry) => String(entry.id) === movementForm.itemId);
        if (!item || !movementForm.date || !Number.isFinite(quantity) || quantity < 0 ||
            (movementForm.movementType !== "ADJUSTMENT" && quantity <= 0)) {
            setError("Select an item, date, and valid quantity. Stock in/out quantities must be greater than zero.");
            return;
        }

        if (movementForm.movementType === "STOCK_OUT" && quantity > Number(item.currentStock || 0)) {
            setError(`Stock out exceeds available stock (${Number(item.currentStock || 0)} ${item.unit}).`);
            return;
        }

        try {
            setSaving(true);
            await api.post("/api/inventory/movements", {
                itemId: Number(movementForm.itemId),
                movementType: movementForm.movementType,
                quantity,
                date: movementForm.date,
                referenceType: "MANUAL",
                remarks: movementForm.remarks.trim()
            });
            setMovementModalOpen(false);
            setSuccess(movementForm.movementType === "ADJUSTMENT"
                ? `Stock for "${item.name}" adjusted to ${quantity} ${item.unit}.`
                : `${movementForm.movementType === "STOCK_IN" ? "Stock in" : "Stock out"} recorded for "${item.name}".`);
            await loadInventory();
        } catch (err) {
            console.error("Stock movement error:", err);
            setError(err.response?.data?.message || (typeof err.response?.data === "string" ? err.response.data : "Unable to record stock movement."));
        } finally {
            setSaving(false);
        }
    }

    const filteredItems = useMemo(() => {
        const query = search.toLowerCase().trim();
        if (!query) return items;
        return items.filter((item) =>
            [item.itemCode, item.name, item.category, item.unit]
                .some((value) => String(value || "").toLowerCase().includes(query))
        );
    }, [items, search]);

    const totalStockUnits = items.reduce((total, item) => total + Number(item.currentStock || 0), 0);

    return (
        <div className="vehicle-page">
            <div className="page-header">
                <div>
                    <h1>INVENTORY MANAGEMENT</h1>
                    <p>Product master, current stock, stock movements, and low-stock monitoring</p>
                </div>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    <button type="button" className="secondary-button" onClick={loadInventory} disabled={loading || saving}>
                        {loading ? "Loading..." : "Refresh"}
                    </button>
                    {!isClient && <button type="button" className="secondary-button" onClick={openMovementForm} disabled={!items.length || saving}>
                        + Record Movement
                    </button>}
                    {!isClient && <button type="button" className="primary-button" onClick={openAddItem}>
                        + Add Item
                    </button>}
                </div>
            </div>

            {success && <div className="success-message" style={{ marginBottom: "20px" }}>✓ {success}</div>}
            {error && <div className="error-message" style={{ marginBottom: "20px" }}>⚠ {error}</div>}

            <div className="stat-grid" style={{ marginBottom: "20px" }}>
                <div className="stat-card blue">
                    <div className="stat-icon">📦</div>
                    <div className="stat-content">
                        <span>PRODUCTS</span>
                        <strong>{loading ? "..." : items.length}</strong>
                        <small>Active inventory records</small>
                    </div>
                </div>
                <div className="stat-card green">
                    <div className="stat-icon">▤</div>
                    <div className="stat-content">
                        <span>LOW STOCK</span>
                        <strong>{loading ? "..." : lowStockItems.length}</strong>
                        <small>At or below minimum stock level</small>
                    </div>
                </div>
                <div className="stat-card purple">
                    <div className="stat-icon">↕</div>
                    <div className="stat-content">
                        <span>RECENT MOVEMENTS</span>
                        <strong>{loading ? "..." : movements.length}</strong>
                        <small>Latest stock movement records</small>
                    </div>
                </div>
                <div className="stat-card amber">
                    <div className="stat-icon">∑</div>
                    <div className="stat-content">
                        <span>STOCK QUANTITY</span>
                        <strong>{loading ? "..." : totalStockUnits.toLocaleString()}</strong>
                        <small>Sum of quantities across units</small>
                    </div>
                </div>
            </div>

            <div className="card" style={{ marginBottom: "20px" }}>
                <div className="section-header" style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
                    <div>
                        <h2>Inventory Item Master ({filteredItems.length})</h2>
                        <p>Current stock changes only through recorded stock movements</p>
                    </div>
                    <input
                        type="search"
                        aria-label="Search inventory items"
                        placeholder="Search code, name, category, or unit..."
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        style={{ minWidth: "260px", padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                    />
                </div>
                <div className="table-container" style={{ overflowX: "auto" }}>
                    <table>
                        <thead>
                            <tr>
                                <th>Item Code</th>
                                <th>Product</th>
                                <th>Category</th>
                                <th>Current Stock</th>
                                <th>Minimum</th>
                                <th>Unit Price</th>
                                <th>Stock Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredItems.length === 0 ? (
                                <tr><td colSpan="8" style={{ textAlign: "center", padding: "30px", color: "#64748b" }}>
                                    {loading ? "Loading inventory..." : "No inventory items match this search."}
                                </td></tr>
                            ) : filteredItems.map((item) => {
                                const isLow = Number(item.currentStock || 0) <= Number(item.minStockAlert || 0);
                                return (
                                    <tr key={item.id}>
                                        <td><strong>{item.itemCode}</strong></td>
                                        <td>{item.name}</td>
                                        <td>{String(item.category || "").replaceAll("_", " ")}</td>
                                        <td>{Number(item.currentStock || 0).toLocaleString()} {item.unit}</td>
                                        <td>{Number(item.minStockAlert || 0).toLocaleString()} {item.unit}</td>
                                        <td>₹{Number(item.unitPrice || 0).toLocaleString()}</td>
                                        <td>
                                            <span style={{
                                                fontSize: "11px", padding: "3px 8px", borderRadius: "6px", fontWeight: "bold",
                                                background: isLow ? "#fee2e2" : "#dcfce7",
                                                color: isLow ? "#b91c1c" : "#15803d"
                                            }}>
                                                {isLow ? "LOW STOCK" : "IN STOCK"}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: "flex", gap: "6px" }}>
                                                {!isClient && <button type="button" className="secondary-button" onClick={() => openEditItem(item)}>Edit</button>}
                                                {!isClient && <button type="button" className="secondary-button" onClick={() => deleteItem(item)}>Delete</button>}
                                                {isClient && <span style={{ fontSize: 12, color: "#64748b" }}>Read-only</span>}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="card">
                <div className="section-header">
                    <div>
                        <h2>Recent Stock Movements</h2>
                        <p>Latest 50 movement records returned by the inventory service</p>
                    </div>
                </div>
                <div className="table-container" style={{ overflowX: "auto" }}>
                    <table>
                        <thead>
                            <tr><th>Date</th><th>Product</th><th>Movement</th><th>Quantity</th><th>Reference</th><th>Recorded By</th><th>Remarks</th></tr>
                        </thead>
                        <tbody>
                            {movements.length === 0 ? (
                                <tr><td colSpan="7" style={{ textAlign: "center", padding: "24px", color: "#64748b" }}>
                                    {loading ? "Loading movements..." : "No stock movements have been recorded."}
                                </td></tr>
                            ) : movements.map((movement) => {
                                const item = items.find((entry) => entry.id === movement.itemId);
                                return (
                                    <tr key={movement.id}>
                                        <td>{movement.date || "-"}</td>
                                        <td>{movement.itemName || item?.name || "-"}</td>
                                        <td>{String(movement.movementType || "").replaceAll("_", " ")}</td>
                                        <td>{Number(movement.quantity || 0).toLocaleString()} {item?.unit || ""}</td>
                                        <td>{movement.referenceType || "MANUAL"}</td>
                                        <td>{movement.createdBy || "-"}</td>
                                        <td>{movement.remarks || "-"}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {itemModalOpen && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(10,25,41,.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: "16px" }}>
                    <div className="card" style={{ width: "100%", maxWidth: "600px", maxHeight: "90vh", overflowY: "auto" }}>
                        <h2 style={{ marginBottom: "18px" }}>{editingItemId ? "Edit Inventory Item" : "Add Inventory Item"}</h2>
                        <form onSubmit={saveItem} className="form-grid">
                            <div className="form-group">
                                <label>Item Code</label>
                                <input name="itemCode" value={itemForm.itemCode} onChange={(e) => setItemForm((prev) => ({ ...prev, itemCode: e.target.value }))} placeholder="Auto-generated if blank" />
                            </div>
                            <div className="form-group">
                                <label>Product Name *</label>
                                <input name="name" value={itemForm.name} onChange={(e) => setItemForm((prev) => ({ ...prev, name: e.target.value }))} required />
                            </div>
                            <div className="form-group">
                                <label>Category *</label>
                                <select name="category" value={itemForm.category} onChange={(e) => setItemForm((prev) => ({ ...prev, category: e.target.value }))}>
                                    <option value="RAW_MATERIAL">Raw Material</option>
                                    <option value="FINISHED_GOODS">Finished Goods</option>
                                    <option value="SPARE_PARTS">Spare Parts</option>
                                    <option value="SCRAP">Scrap</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Unit *</label>
                                <select name="unit" value={itemForm.unit} onChange={(e) => setItemForm((prev) => ({ ...prev, unit: e.target.value }))}>
                                    <option value="KG">Kilogram (KG)</option>
                                    <option value="MT">Metric Ton (MT)</option>
                                    <option value="LITRE">Litre</option>
                                    <option value="PCS">Pieces</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Minimum Stock Alert</label>
                                <input type="number" min="0" step="0.01" value={itemForm.minStockAlert} onChange={(e) => setItemForm((prev) => ({ ...prev, minStockAlert: e.target.value }))} required />
                            </div>
                            <div className="form-group">
                                <label>Unit Price (₹)</label>
                                <input type="number" min="0" step="0.01" value={itemForm.unitPrice} onChange={(e) => setItemForm((prev) => ({ ...prev, unitPrice: e.target.value }))} required />
                            </div>
                            <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                                <button type="button" className="secondary-button" onClick={() => setItemModalOpen(false)} disabled={saving}>Cancel</button>
                                <button type="submit" className="primary-button" disabled={saving || isClient}>{isClient ? "Read-only Access" : (saving ? "Saving..." : editingItemId ? "Save Changes" : "Create Item")}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {movementModalOpen && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(10,25,41,.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: "16px" }}>
                    <div className="card" style={{ width: "100%", maxWidth: "560px" }}>
                        <h2 style={{ marginBottom: "8px" }}>Record Stock Movement</h2>
                        <p style={{ marginBottom: "18px", color: "#64748b", fontSize: "13px" }}>Adjustments set the item's current stock to the entered quantity.</p>
                        <form onSubmit={saveMovement} className="form-grid">
                            <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                                <label>Product *</label>
                                <select value={movementForm.itemId} onChange={(e) => setMovementForm((prev) => ({ ...prev, itemId: e.target.value }))} required>
                                    {items.map((item) => <option key={item.id} value={item.id}>{item.itemCode} — {item.name} ({Number(item.currentStock || 0)} {item.unit})</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Movement Type *</label>
                                <select value={movementForm.movementType} onChange={(e) => setMovementForm((prev) => ({ ...prev, movementType: e.target.value, quantity: "" }))}>
                                    <option value="STOCK_IN">Stock In</option>
                                    <option value="STOCK_OUT">Stock Out</option>
                                    <option value="ADJUSTMENT">Set Current Stock</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>{movementForm.movementType === "ADJUSTMENT" ? "New Stock Total *" : "Quantity *"}</label>
                                <input type="number" min={movementForm.movementType === "ADJUSTMENT" ? "0" : "0.01"} step="0.01" value={movementForm.quantity} onChange={(e) => setMovementForm((prev) => ({ ...prev, quantity: e.target.value }))} required />
                            </div>
                            <div className="form-group">
                                <label>Movement Date *</label>
                                <input type="date" value={movementForm.date} onChange={(e) => setMovementForm((prev) => ({ ...prev, date: e.target.value }))} required />
                            </div>
                            <div className="form-group">
                                <label>Remarks</label>
                                <input value={movementForm.remarks} onChange={(e) => setMovementForm((prev) => ({ ...prev, remarks: e.target.value }))} placeholder="Optional notes" />
                            </div>
                            <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                                <button type="button" className="secondary-button" onClick={() => setMovementModalOpen(false)} disabled={saving}>Cancel</button>
                                <button type="submit" className="primary-button" disabled={saving || isClient}>{isClient ? "Read-only Access" : (saving ? "Saving..." : "Save Movement")}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Inventory;
