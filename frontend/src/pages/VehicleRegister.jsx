import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api";
import GeolocationCameraModal from "../components/GeolocationCameraModal";

function getTodayDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function getCurrentTime() {
    const now = new Date();
    return now.toTimeString().substring(0, 5);
}

const commodities = [
    "Local Waste Rubber Tyre",
    "Imported Waste Rubber Tyre",
    "Metal Steel Scrap",
    "Carbon Black Powder",
    "Fuel Oil"
];

const vehicleTypes = ["Truck", "Trailer", "Tanker", "Tractor", "Pickup", "Other"];

const purposes = [
    "Raw Material Delivery",
    "Finished Goods Dispatch",
    "Scrap Pickup",
    "Plant Equipment / Spares",
    "Maintenance / Service",
    "Other"
];

function VehicleRegister() {
    const navigate = useNavigate();
    const currentUser = (() => { try { return JSON.parse(localStorage.getItem("dhmUser") || sessionStorage.getItem("dhmUser") || "{}"); } catch { return {}; } })();
    const isClient = currentUser?.role === "CLIENT";

    const [vehicles, setVehicles] = useState([]);
    const [sales, setSales] = useState([]);
    const [purchases, setPurchases] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [lastSavedType, setLastSavedType] = useState(null);

    // Filters & Search
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [registerFilter, setRegisterFilter] = useState("ALL");
    const [dateFilter, setDateFilter] = useState("");

    const [editingId, setEditingId] = useState(null);
    const [showCameraModal, setShowCameraModal] = useState(false);
    const [targetPhotoType, setTargetPhotoType] = useState("vehicle");

    // History Modal
    const [historyVehicleNo, setHistoryVehicleNo] = useState(null);

    // Photo Preview Modal
    const [viewPhotoUrl, setViewPhotoUrl] = useState(null);
    const [viewPhotoTitle, setViewPhotoTitle] = useState("");

    // Form state
    const [form, setForm] = useState({
        date: getTodayDate(),
        entryTime: getCurrentTime(),
        exitDate: "",
        exitTime: "",
        vehicleNo: "",
        driverName: "",
        driverContact: "",
        vehicleType: "Truck",
        inwardOutward: "INWARD",
        purpose: "Raw Material Delivery",
        partyName: "",
        grossWeight: "",
        tareWeight: "",
        local: false,
        imported: false,
        commodity: "",
        remarks: "",
        registerType: "SALES",
        latitude: null,
        longitude: null,
        locationAddress: "",
        vehiclePhoto: null,
        grossWeightPhoto: null,
        tareWeightPhoto: null
    });

    useEffect(() => {
        loadVehicles();
    }, []);

    async function loadVehicles() {
        try {
            setLoading(true);
            setError("");
            const [vehiclesRes, salesRes, purchasesRes] = await Promise.allSettled([
                api.get("/api/vehicles"),
                api.get("/api/sales"),
                api.get("/api/purchases")
            ]);

            if (vehiclesRes.status === "fulfilled" && Array.isArray(vehiclesRes.value.data)) {
                setVehicles(vehiclesRes.value.data);
            } else {
                setVehicles([]);
            }
            setSales(salesRes.status === "fulfilled" && Array.isArray(salesRes.value.data) ? salesRes.value.data : []);
            setPurchases(purchasesRes.status === "fulfilled" && Array.isArray(purchasesRes.value.data) ? purchasesRes.value.data : []);
        } catch (err) {
            console.error("Vehicle loading error:", err);
            setError("Unable to connect to backend server.");
        } finally {
            setLoading(false);
        }
    }

    function handleChange(e) {
        const { name, value, type, checked } = e.target;
        setForm((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value
        }));
    }

    const calculatedNetWeight = useMemo(() => {
        const gross = Number(form.grossWeight) || 0;
        const tare = Number(form.tareWeight) || 0;
        if (gross > 0 && tare >= 0 && gross > tare) {
            return gross - tare;
        }
        return 0;
    }, [form.grossWeight, form.tareWeight]);

    function openCameraFor(photoType) {
        setTargetPhotoType(photoType);
        setShowCameraModal(true);
    }

    function handleCameraCapture(data) {
        setForm((prev) => {
            const next = { ...prev };
            if (data.photoType === "vehicle") next.vehiclePhoto = data.photoData;
            else if (data.photoType === "gross") next.grossWeightPhoto = data.photoData;
            else if (data.photoType === "tare") next.tareWeightPhoto = data.photoData;
            else next.vehiclePhoto = data.photoData;

            if (data.latitude && data.longitude) {
                next.latitude = data.latitude;
                next.longitude = data.longitude;
                next.locationAddress = data.locationAddress || prev.locationAddress;
            }
            return next;
        });

        const hasGps = data.latitude != null && data.longitude != null;
        setSuccess(
            hasGps
                ? `Photo (${data.photoType.toUpperCase()}) captured and attached with GPS location recorded for security.`
                : `Photo (${data.photoType.toUpperCase()}) captured and attached. GPS location was not available at capture time.`
        );
    }

    function removePhoto(photoField) {
        setForm(prev => ({
            ...prev,
            [photoField]: null
        }));
    }

    function resetForm() {
        setForm({
            date: getTodayDate(),
            entryTime: getCurrentTime(),
            exitDate: "",
            exitTime: "",
            vehicleNo: "",
            driverName: "",
            driverContact: "",
            vehicleType: "Truck",
            inwardOutward: "INWARD",
            purpose: "Raw Material Delivery",
            partyName: "",
            grossWeight: "",
            tareWeight: "",
            local: false,
            imported: false,
            commodity: "",
            remarks: "",
            registerType: "SALES",
            latitude: null,
            longitude: null,
            locationAddress: "",
            vehiclePhoto: null,
            grossWeightPhoto: null,
            tareWeightPhoto: null
        });
        setEditingId(null);
    }

    async function handleSubmit(event) {
        event.preventDefault();
        setError("");
        setSuccess("");
        setLastSavedType(null);

        if (!form.date) {
            setError("Please select entry date.");
            return;
        }

        const cleanVehicleNo = form.vehicleNo.trim().toUpperCase();
        if (!cleanVehicleNo) {
            setError("Please enter vehicle registration number (e.g. MH-12-AB-1234).");
            return;
        }

        const gross = Number(form.grossWeight);
        const tare = Number(form.tareWeight);

        if (!gross || gross <= 0) {
            setError("Gross weight must be greater than zero.");
            return;
        }

        if (tare < 0) {
            setError("Tare weight cannot be negative.");
            return;
        }

        if (tare >= gross) {
            setError("Tare weight must be strictly less than Gross weight.");
            return;
        }

        if (!form.commodity) {
            setError("Please select commodity / material.");
            return;
        }

        // Duplicate submission client safeguard
        if (!editingId) {
            const alreadyInside = vehicles.find(
                v => v.vehicleNo?.toUpperCase() === cleanVehicleNo && v.status === "INSIDE"
            );
            if (alreadyInside) {
                if (!window.confirm(`Vehicle ${cleanVehicleNo} is already recorded as INSIDE the plant (Record #${alreadyInside.id}). Proceed anyway?`)) {
                    return;
                }
            }
        }

        const vehiclePayload = {
            date: form.date,
            entryTime: form.entryTime || getCurrentTime(),
            exitDate: form.exitDate || null,
            exitTime: form.exitTime || null,
            vehicleNo: cleanVehicleNo,
            driverName: form.driverName.trim(),
            driverContact: form.driverContact.trim(),
            vehicleType: form.vehicleType,
            inwardOutward: form.inwardOutward,
            purpose: form.purpose,
            partyName: form.partyName.trim(),
            grossWeight: gross,
            tareWeight: tare,
            local: Boolean(form.local),
            imported: Boolean(form.imported),
            commodity: form.commodity,
            remarks: form.remarks.trim(),
            registerType: form.registerType,
            latitude: form.latitude,
            longitude: form.longitude,
            locationAddress: form.locationAddress,
            vehiclePhoto: form.vehiclePhoto,
            grossWeightPhoto: form.grossWeightPhoto,
            tareWeightPhoto: form.tareWeightPhoto,
            photoData: form.vehiclePhoto // alias
        };

        try {
            setSaving(true);
            if (editingId) {
                await api.put(`/api/vehicles/${editingId}`, vehiclePayload);
                setSuccess(`Vehicle ${cleanVehicleNo} updated and synchronized with ${form.registerType} Register.`);
            } else {
                await api.post("/api/vehicles", vehiclePayload);
                setSuccess(`Vehicle ${cleanVehicleNo} logged at weighbridge and synchronized with ${form.registerType} Register.`);
                setLastSavedType(form.registerType);
            }

            resetForm();
            await loadVehicles();
        } catch (err) {
            console.error("Vehicle save error:", err);
            setError(err.response?.data?.message || (typeof err.response?.data === "string" ? err.response.data : "Unable to save vehicle entry."));
        } finally {
            setSaving(false);
        }
    }

    function startEdit(v) {
        setEditingId(v.id);
        setForm({
            date: v.date || getTodayDate(),
            entryTime: v.entryTime || getCurrentTime(),
            exitDate: v.exitDate || "",
            exitTime: v.exitTime || "",
            vehicleNo: v.vehicleNo || "",
            driverName: v.driverName || "",
            driverContact: v.driverContact || "",
            vehicleType: v.vehicleType || "Truck",
            inwardOutward: v.inwardOutward || "INWARD",
            purpose: v.purpose || "Raw Material Delivery",
            partyName: v.partyName || "",
            grossWeight: v.grossWeight ?? "",
            tareWeight: v.tareWeight ?? "",
            local: Boolean(v.local),
            imported: Boolean(v.imported),
            commodity: v.commodity || "",
            remarks: v.remarks || "",
            registerType: v.registerType || "SALES",
            latitude: v.latitude,
            longitude: v.longitude,
            locationAddress: v.locationAddress || "",
            vehiclePhoto: v.vehiclePhoto || v.photoData || null,
            grossWeightPhoto: v.grossWeightPhoto || null,
            tareWeightPhoto: v.tareWeightPhoto || null
        });

        setError("");
        setSuccess("");
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    async function markExit(id, vehicleNo) {
        if (!window.confirm(`Mark Vehicle "${vehicleNo}" as EXITED from the weighbridge?`)) {
            return;
        }

        try {
            await api.put(`/api/vehicles/${id}/exit`);
            setSuccess(`Vehicle ${vehicleNo} exit recorded at ${getCurrentTime()}.`);
            await loadVehicles();
        } catch (err) {
            setError(err.response?.data || "Unable to mark vehicle exit.");
        }
    }

    async function deleteVehicle(id, vehicleNo) {
        if (!window.confirm(`Delete vehicle record "${vehicleNo}"? Any linked Sales or Purchase records will also be removed.`)) {
            return;
        }

        try {
            setLoading(true);
            await api.delete(`/api/vehicles/${id}`);
            setSuccess(`Vehicle ${vehicleNo} deleted successfully.`);
            await loadVehicles();
        } catch (err) {
            setError(err.response?.data || "Unable to delete vehicle entry.");
        } finally {
            setLoading(false);
        }
    }

    // Filtered list
    const filteredVehicles = useMemo(() => {
        const q = search.toLowerCase().trim();
        return vehicles.filter(v => {
            const matchesQuery = !q ||
                String(v.vehicleNo || "").toLowerCase().includes(q) ||
                String(v.driverName || "").toLowerCase().includes(q) ||
                String(v.partyName || "").toLowerCase().includes(q) ||
                String(v.commodity || "").toLowerCase().includes(q);

            const matchesStatus = statusFilter === "ALL" || v.status === statusFilter;
            const matchesRegister = registerFilter === "ALL" || v.registerType === registerFilter;
            const matchesDate = !dateFilter || v.date === dateFilter;

            return matchesQuery && matchesStatus && matchesRegister && matchesDate;
        });
    }, [vehicles, search, statusFilter, registerFilter, dateFilter]);

    const linkedSaleByVehicleId = useMemo(() => {
        const map = new Map();
        sales.forEach(s => { if (s.vehicleId != null) map.set(String(s.vehicleId), s); });
        return map;
    }, [sales]);

    const linkedPurchaseByVehicleId = useMemo(() => {
        const map = new Map();
        purchases.forEach(p => { if (p.vehicleId != null) map.set(String(p.vehicleId), p); });
        return map;
    }, [purchases]);

    // History for specific vehicle number
    const historyEntries = useMemo(() => {
        if (!historyVehicleNo) return [];
        return vehicles.filter(v => v.vehicleNo?.toUpperCase() === historyVehicleNo.toUpperCase());
    }, [vehicles, historyVehicleNo]);

    return (
        <div className="vehicle-page" style={{ paddingBottom: "40px" }}>

            {/* HEADER */}
            <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: "24px", color: "#1e3a8a", fontWeight: "800" }}>
                        VEHICLE WEIGHBRIDGE REGISTER
                    </h1>
                    <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "14px" }}>
                        Digital weighbridge gate operations, Gross/Tare/Net calculations, 3-photo proof, and GPS tracking.
                    </p>
                </div>

                <div style={{ display: "flex", gap: "10px" }}>
                    <Link to="/vehicle-map" style={{ padding: "8px 14px", background: "#0284c7", color: "white", borderRadius: "6px", textDecoration: "none", fontSize: "13px", fontWeight: "600", display: "flex", alignItems: "center", gap: "6px" }}>
                        Live GPS Map
                    </Link>
                    <button type="button" onClick={loadVehicles} disabled={loading || saving} style={{ padding: "8px 14px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "6px", cursor: "pointer", fontSize: "13px" }}>
                        {loading ? "Loading..." : "↻ Refresh"}
                    </button>
                </div>
            </div>

            {/* NOTIFICATIONS */}
            {success && (
                <div style={{ padding: "12px 16px", background: "#ecfdf5", border: "1px solid #a7f3d0", color: "#065f46", borderRadius: "8px", marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>✓ {success}</span>
                    {lastSavedType && (
                        <Link to={lastSavedType === "SALES" ? "/sales-register" : "/purchase-register"} style={{ color: "#047857", fontWeight: "bold", textDecoration: "underline" }}>
                            Open in {lastSavedType === "SALES" ? "Sales" : "Purchase"} Register →
                        </Link>
                    )}
                </div>
            )}
            {error && (
                <div style={{ padding: "12px 16px", background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", borderRadius: "8px", marginBottom: "16px" }}>
                    ⚠ {error}
                </div>
            )}

            {/* WEIGHBRIDGE GATE ENTRY FORM */}
            <div className="card" style={{ padding: "20px", background: "#fff", borderRadius: "10px", border: "1px solid #e2e8f0", marginBottom: "25px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", borderBottom: "1px solid #f1f5f9", paddingBottom: "12px" }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: "18px", color: "#0f172a", fontWeight: "700" }}>
                            {editingId ? `Edit Weighbridge Entry #${editingId}` : "Weighbridge Gate Entry (Inward / Outward)"}
                        </h2>
                        <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748b" }}>
                            Weights auto-calculate Net Weight (Gross - Tare) and carry forward to transaction registers
                        </p>
                    </div>

                    <div style={{ display: "flex", gap: "8px" }}>
                        {editingId && (
                            <button
                                type="button"
                                onClick={resetForm}
                                style={{ padding: "6px 12px", background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: "6px", cursor: "pointer", fontSize: "12px" }}
                            >
                                Cancel Edit
                            </button>
                        )}
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    {/* SECTION 1: VEHICLE & DRIVER PARTICULARS */}
                    <div style={{ fontSize: "12px", fontWeight: "700", textTransform: "uppercase", color: "#2563eb", marginBottom: "10px", letterSpacing: "0.5px" }}>
                        1. Vehicle & Driver Particulars
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginBottom: "16px" }}>
                        <div>
                            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px", color: "#334155" }}>
                                Vehicle Reg Number *
                            </label>
                            <input
                                type="text"
                                name="vehicleNo"
                                required
                                placeholder="e.g. MH12AB1234"
                                value={form.vehicleNo}
                                onChange={handleChange}
                                style={{ width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "14px", fontWeight: "600", textTransform: "uppercase" }}
                            />
                        </div>

                        <div>
                            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px", color: "#334155" }}>
                                Vehicle Type
                            </label>
                            <select
                                name="vehicleType"
                                value={form.vehicleType}
                                onChange={handleChange}
                                style={{ width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "14px" }}
                            >
                                {vehicleTypes.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>

                        <div>
                            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px", color: "#334155" }}>
                                Driver Name
                            </label>
                            <input
                                type="text"
                                name="driverName"
                                placeholder="Driver's full name"
                                value={form.driverName}
                                onChange={handleChange}
                                style={{ width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "14px" }}
                            />
                        </div>

                        <div>
                            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px", color: "#334155" }}>
                                Driver Contact (Phone)
                            </label>
                            <input
                                type="text"
                                name="driverContact"
                                placeholder="+91 9876543210"
                                value={form.driverContact}
                                onChange={handleChange}
                                style={{ width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "14px" }}
                            />
                        </div>
                    </div>

                    {/* SECTION 2: ENTRY DATE, TIME & PURPOSE */}
                    <div style={{ fontSize: "12px", fontWeight: "700", textTransform: "uppercase", color: "#2563eb", marginBottom: "10px", letterSpacing: "0.5px" }}>
                        2. Movement & Purpose
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginBottom: "16px" }}>
                        <div>
                            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px", color: "#334155" }}>
                                Entry Date *
                            </label>
                            <input
                                type="date"
                                name="date"
                                required
                                value={form.date}
                                onChange={handleChange}
                                style={{ width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "14px" }}
                            />
                        </div>

                        <div>
                            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px", color: "#334155" }}>
                                Entry Time (HH:mm)
                            </label>
                            <input
                                type="time"
                                name="entryTime"
                                value={form.entryTime}
                                onChange={handleChange}
                                style={{ width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "14px" }}
                            />
                        </div>

                        <div>
                            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px", color: "#334155" }}>
                                Purpose of Visit
                            </label>
                            <select
                                name="purpose"
                                value={form.purpose}
                                onChange={handleChange}
                                style={{ width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "14px" }}
                            >
                                {purposes.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>

                        <div>
                            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px", color: "#334155" }}>
                                Party Name (Customer / Supplier)
                            </label>
                            <input
                                type="text"
                                name="partyName"
                                placeholder="Customer or Supplier firm"
                                value={form.partyName}
                                onChange={handleChange}
                                style={{ width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "14px" }}
                            />
                        </div>
                    </div>

                    {/* SECTION 3: WEIGHBRIDGE WEIGHTS & NET CALCULATION */}
                    <div style={{ fontSize: "12px", fontWeight: "700", textTransform: "uppercase", color: "#2563eb", marginBottom: "10px", letterSpacing: "0.5px" }}>
                        3. Digital Weighbridge Scale Measurements (KG)
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginBottom: "16px", background: "#f8fafc", padding: "14px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                        <div>
                            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px", color: "#334155" }}>
                                Gross Weight (KG) *
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                name="grossWeight"
                                required
                                placeholder="Total loaded weight"
                                value={form.grossWeight}
                                onChange={handleChange}
                                style={{ width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "14px", fontWeight: "600" }}
                            />
                        </div>

                        <div>
                            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px", color: "#334155" }}>
                                Tare Weight (Empty Truck KG) *
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                name="tareWeight"
                                required
                                placeholder="Empty tare weight"
                                value={form.tareWeight}
                                onChange={handleChange}
                                style={{ width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "14px", fontWeight: "600" }}
                            />
                        </div>

                        <div>
                            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px", color: "#334155" }}>
                                Calculated Net Weight (KG)
                            </label>
                            <div style={{
                                padding: "8px 12px",
                                background: calculatedNetWeight > 0 ? "#dcfce7" : "#f1f5f9",
                                border: "1px solid " + (calculatedNetWeight > 0 ? "#86efac" : "#cbd5e1"),
                                borderRadius: "6px",
                                fontSize: "16px",
                                fontWeight: "800",
                                color: calculatedNetWeight > 0 ? "#15803d" : "#64748b"
                            }}>
                                {calculatedNetWeight > 0 ? `${calculatedNetWeight.toLocaleString()} KG (${(calculatedNetWeight / 1000).toFixed(2)} MT)` : "0.00 KG"}
                            </div>
                        </div>

                        <div>
                            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px", color: "#334155" }}>
                                Commodity / Material *
                            </label>
                            <select
                                name="commodity"
                                required
                                value={form.commodity}
                                onChange={handleChange}
                                style={{ width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "14px" }}
                            >
                                <option value="">-- Select Commodity --</option>
                                {commodities.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* SECTION 4: 3 PHOTOGRAPHS (VEHICLE, GROSS SCALE, TARE SCALE) */}
                    <div style={{ fontSize: "12px", fontWeight: "700", textTransform: "uppercase", color: "#2563eb", marginBottom: "10px", letterSpacing: "0.5px" }}>
                        4. Vehicle & Weighbridge Photos with GPS Location (Security Proof)
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px", marginBottom: "16px" }}>

                        {/* PHOTO 1: VEHICLE PHOTOGRAPH */}
                        <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px", background: "#f8fafc" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                                <strong style={{ fontSize: "13px", color: "#1e293b" }}>1. Vehicle Photo (with GPS)</strong>
                                {form.vehiclePhoto && (
                                    <button type="button" onClick={() => removePhoto("vehiclePhoto")} style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: "11px" }}>
                                        ✕ Remove
                                    </button>
                                )}
                            </div>
                            {form.vehiclePhoto ? (
                                <div>
                                    <img
                                        src={form.vehiclePhoto}
                                        alt="Vehicle"
                                        onClick={() => { setViewPhotoUrl(form.vehiclePhoto); setViewPhotoTitle("Vehicle Photograph"); }}
                                        style={{ width: "100%", height: "110px", objectFit: "cover", borderRadius: "6px", cursor: "pointer" }}
                                    />
                                    <span style={{ fontSize: "11px", color: "#15803d", display: "block", marginTop: "4px" }}>✓ Photo Attached</span>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => openCameraFor("vehicle")}
                                    style={{ width: "100%", height: "90px", border: "1px dashed #94a3b8", borderRadius: "6px", background: "#fff", cursor: "pointer", fontSize: "12px", color: "#475569" }}
                                >
                                    📷 Snap / Upload Vehicle Photo
                                </button>
                            )}
                        </div>

                        {/* PHOTO 2: GROSS WEIGHT SCALE PHOTOGRAPH */}
                        <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px", background: "#f8fafc" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                                <strong style={{ fontSize: "13px", color: "#1e293b" }}>2. Gross Weight Scale Photo (with GPS)</strong>
                                {form.grossWeightPhoto && (
                                    <button type="button" onClick={() => removePhoto("grossWeightPhoto")} style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: "11px" }}>
                                        ✕ Remove
                                    </button>
                                )}
                            </div>
                            {form.grossWeightPhoto ? (
                                <div>
                                    <img
                                        src={form.grossWeightPhoto}
                                        alt="Gross Scale"
                                        onClick={() => { setViewPhotoUrl(form.grossWeightPhoto); setViewPhotoTitle("Gross Weight Scale Photo"); }}
                                        style={{ width: "100%", height: "110px", objectFit: "cover", borderRadius: "6px", cursor: "pointer" }}
                                    />
                                    <span style={{ fontSize: "11px", color: "#15803d", display: "block", marginTop: "4px" }}>✓ Scale Photo Attached</span>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => openCameraFor("gross")}
                                    style={{ width: "100%", height: "90px", border: "1px dashed #94a3b8", borderRadius: "6px", background: "#fff", cursor: "pointer", fontSize: "12px", color: "#475569" }}
                                >
                                    📷 Snap / Upload Gross Scale
                                </button>
                            )}
                        </div>

                        {/* PHOTO 3: TARE WEIGHT SCALE PHOTOGRAPH */}
                        <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px", background: "#f8fafc" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                                <strong style={{ fontSize: "13px", color: "#1e293b" }}>3. Tare Weight Scale Photo (with GPS)</strong>
                                {form.tareWeightPhoto && (
                                    <button type="button" onClick={() => removePhoto("tareWeightPhoto")} style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: "11px" }}>
                                        ✕ Remove
                                    </button>
                                )}
                            </div>
                            {form.tareWeightPhoto ? (
                                <div>
                                    <img
                                        src={form.tareWeightPhoto}
                                        alt="Tare Scale"
                                        onClick={() => { setViewPhotoUrl(form.tareWeightPhoto); setViewPhotoTitle("Tare Weight Scale Photo"); }}
                                        style={{ width: "100%", height: "110px", objectFit: "cover", borderRadius: "6px", cursor: "pointer" }}
                                    />
                                    <span style={{ fontSize: "11px", color: "#15803d", display: "block", marginTop: "4px" }}>✓ Tare Scale Attached</span>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => openCameraFor("tare")}
                                    style={{ width: "100%", height: "90px", border: "1px dashed #94a3b8", borderRadius: "6px", background: "#fff", cursor: "pointer", fontSize: "12px", color: "#475569" }}
                                >
                                    📷 Snap / Upload Tare Scale
                                </button>
                            )}
                        </div>

                    </div>

                    {/* GPS COORDINATES STRIP */}
                    <div style={{ padding: "10px 14px", background: form.latitude ? "#f0fdf4" : "#fefce8", border: "1px solid " + (form.latitude ? "#bbf7d0" : "#fef08a"), borderRadius: "8px", marginBottom: "18px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px", fontSize: "12px" }}>
                        <div>
                            <strong>GPS Coordinates: </strong>
                            {form.latitude && form.longitude ? (
                                <span style={{ color: "#166534", fontWeight: "600" }}>
                                    {form.latitude}° N, {form.longitude}° E ({form.locationAddress || "Weighbridge Gate"})
                                </span>
                            ) : (
                                <span style={{ color: "#854d0e" }}>No GPS attached. Click any photo button to acquire device coordinates.</span>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={() => openCameraFor("vehicle")}
                            style={{ background: "#2563eb", color: "#fff", border: "none", padding: "4px 10px", borderRadius: "4px", cursor: "pointer", fontSize: "11px", fontWeight: "600" }}
                        >
                            📍 Update Coordinates
                        </button>
                    </div>

                    {/* SECTION 5: REGISTER ROUTING & SUBMISSION */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
                        <div>
                            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px", color: "#334155" }}>
                                Connect to Business Register *
                            </label>
                            <select
                                name="registerType"
                                value={form.registerType}
                                onChange={handleChange}
                                style={{ width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "14px", fontWeight: "600" }}
                            >
                                <option value="SALES">SALES REGISTER (Finished Goods Outward Dispatch)</option>
                                <option value="PURCHASE">PURCHASE REGISTER (Raw Material Inward Receipt)</option>
                                <option value="NONE">GATE LOG ONLY (No Ledger Synchronization)</option>
                            </select>
                        </div>

                        <div>
                            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px", color: "#334155" }}>
                                Remarks / Notes
                            </label>
                            <input
                                type="text"
                                name="remarks"
                                placeholder="Inspection or seal notes"
                                value={form.remarks}
                                onChange={handleChange}
                                style={{ width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "14px" }}
                            />
                        </div>
                    </div>

                    {/* BUTTONS */}
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                        <button
                            type="button"
                            onClick={resetForm}
                            style={{ padding: "8px 16px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer" }}
                        >
                            Reset Form
                        </button>

                        <button
                            type="submit"
                            disabled={saving || isClient}
                            style={{
                                padding: "8px 24px",
                                borderRadius: "6px",
                                border: "none",
                                background: isClient ? "#94a3b8" : "#2563eb",
                                color: "#fff",
                                fontWeight: "700",
                                cursor: isClient ? "not-allowed" : "pointer",
                                fontSize: "14px"
                            }}
                            title={isClient ? "Client accounts have read-only access" : ""}
                        >
                            {isClient ? "Read-only Access" : (saving ? "Saving Record..." : editingId ? "Update Weighbridge Record" : "Save Gate & Weighbridge Entry")}
                        </button>
                    </div>
                </form>
            </div>

            {/* SEARCH & FILTERS BAR */}
            <div className="card" style={{ padding: "16px", background: "#fff", borderRadius: "10px", border: "1px solid #e2e8f0", marginBottom: "20px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", alignItems: "center" }}>
                    <div>
                        <input
                            type="text"
                            placeholder="ðŸ” Search vehicle, driver, party..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "13px" }}
                        />
                    </div>

                    <div>
                        <input
                            type="date"
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                            style={{ width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "13px" }}
                        />
                    </div>

                    <div>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            style={{ width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "13px" }}
                        >
                            <option value="ALL">All Statuses</option>
                            <option value="INSIDE">● Inside Factory</option>
                            <option value="EXITED">✓ Exited</option>
                        </select>
                    </div>

                    <div>
                        <select
                            value={registerFilter}
                            onChange={(e) => setRegisterFilter(e.target.value)}
                            style={{ width: "100%", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "13px" }}
                        >
                            <option value="ALL">All Registers</option>
                            <option value="SALES">Sales Dispatches</option>
                            <option value="PURCHASE">Purchase Receipts</option>
                        </select>
                    </div>

                    {dateFilter && (
                        <button
                            type="button"
                            onClick={() => setDateFilter("")}
                            style={{ padding: "6px 10px", background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "12px", cursor: "pointer" }}
                        >
                            Clear Date
                        </button>
                    )}
                </div>
            </div>

            {/* VEHICLES DATA TABLE */}
            <div className="card" style={{ background: "#fff", borderRadius: "10px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
                        <thead>
                            <tr style={{ background: "#f8fafc", borderBottom: "1px solid #cbd5e1", color: "#334155", fontWeight: "700" }}>
                                <th style={{ padding: "12px 14px" }}>Date & Time</th>
                                <th style={{ padding: "12px 14px" }}>Vehicle Reg No</th>
                                <th style={{ padding: "12px 14px" }}>Party / Customer</th>
                                <th style={{ padding: "12px 14px" }}>Commodity</th>
                                <th style={{ padding: "12px 14px" }}>Gross / Tare / Net</th>
                                <th style={{ padding: "12px 14px" }}>Proofs & GPS</th>
                                <th style={{ padding: "12px 14px" }}>Register</th>
                                <th style={{ padding: "12px 14px" }}>Status</th>
                                <th style={{ padding: "12px 14px", textAlign: "center" }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredVehicles.length === 0 ? (
                                <tr>
                                    <td colSpan="9" style={{ padding: "28px", textAlign: "center", color: "#64748b" }}>
                                        {loading ? "Loading vehicle entries..." : "No vehicle records found."}
                                    </td>
                                </tr>
                            ) : (
                                filteredVehicles.map((v) => {
                                    const net = v.netWeight ? Number(v.netWeight) : Math.max((Number(v.grossWeight) || 0) - (Number(v.tareWeight) || 0), 0);
                                    return (
                                        <tr key={v.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                            <td style={{ padding: "10px 14px", color: "#475569" }}>
                                                <strong>{v.date}</strong>
                                                <div style={{ fontSize: "11px", color: "#94a3b8" }}>In: {v.entryTime || "—"} {v.exitTime ? `| Out: ${v.exitTime}` : ""}</div>
                                            </td>
                                            <td style={{ padding: "10px 14px" }}>
                                                <button
                                                    type="button"
                                                    onClick={() => setHistoryVehicleNo(v.vehicleNo)}
                                                    title="View vehicle history"
                                                    style={{ background: "none", border: "none", padding: 0, color: "#1e40af", fontWeight: "700", fontSize: "14px", cursor: "pointer", textDecoration: "underline" }}
                                                >
                                                    {v.vehicleNo}
                                                </button>
                                                <div style={{ fontSize: "11px", color: "#64748b" }}>{v.driverName ? `Driver: ${v.driverName}` : v.vehicleType}</div>
                                            </td>
                                            <td style={{ padding: "10px 14px", color: "#334155" }}>
                                                {v.partyName || "—"}
                                                <div style={{ fontSize: "11px", color: "#94a3b8" }}>{v.purpose || ""}</div>
                                            </td>
                                            <td style={{ padding: "10px 14px", color: "#334155" }}>
                                                {v.commodity}
                                            </td>
                                            <td style={{ padding: "10px 14px" }}>
                                                <strong style={{ color: "#0f172a", fontSize: "14px" }}>{net.toLocaleString()} KG</strong>
                                                <div style={{ fontSize: "11px", color: "#64748b" }}>
                                                    G: {Number(v.grossWeight || 0).toLocaleString()} | T: {Number(v.tareWeight || 0).toLocaleString()}
                                                </div>
                                            </td>
                                            <td style={{ padding: "10px 14px" }}>
                                                <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                                                    {v.vehiclePhoto || v.photoData ? (
                                                        <span
                                                            onClick={() => { setViewPhotoUrl(v.vehiclePhoto || v.photoData); setViewPhotoTitle(`Vehicle Photo - ${v.vehicleNo}`); }}
                                                            title="View Vehicle Photo"
                                                            style={{ cursor: "pointer", fontSize: "16px" }}
                                                        >
                                                            ðŸš›
                                                        </span>
                                                    ) : null}
                                                    {v.grossWeightPhoto && (
                                                        <span
                                                            onClick={() => { setViewPhotoUrl(v.grossWeightPhoto); setViewPhotoTitle(`Gross Scale - ${v.vehicleNo}`); }}
                                                            title="View Gross Scale Photo"
                                                            style={{ cursor: "pointer", fontSize: "16px" }}
                                                        >
                                                            📷
                                                        </span>
                                                    )}
                                                    {v.tareWeightPhoto && (
                                                        <span
                                                            onClick={() => { setViewPhotoUrl(v.tareWeightPhoto); setViewPhotoTitle(`Tare Scale - ${v.vehicleNo}`); }}
                                                            title="View Tare Scale Photo"
                                                            style={{ cursor: "pointer", fontSize: "16px" }}
                                                        >
                                                            ðŸ“
                                                        </span>
                                                    )}
                                                    {v.latitude && v.longitude ? (
                                                        <span title={`GPS: ${v.latitude}, ${v.longitude}`} style={{ fontSize: "14px" }}>GPS</span>
                                                    ) : null}
                                                </div>
                                            </td>
                                            <td style={{ padding: "10px 14px" }}>
                                                <span style={{
                                                    padding: "3px 8px",
                                                    borderRadius: "4px",
                                                    fontSize: "11px",
                                                    fontWeight: "700",
                                                    background: v.registerType === "SALES" ? "#dcfce7" : v.registerType === "PURCHASE" ? "#ede9fe" : "#f1f5f9",
                                                    color: v.registerType === "SALES" ? "#15803d" : v.registerType === "PURCHASE" ? "#6b21a8" : "#475569"
                                                }}>
                                                    {v.registerType}
                                                </span>
                                                <div style={{ marginTop: "4px", fontSize: "10px", color: "#64748b", lineHeight: 1.3 }}>
                                                    {linkedSaleByVehicleId.get(String(v.id)) ? (
                                                        <div>
                                                            Linked Sale:{" "}
                                                            <button type="button" onClick={() => navigate(`/sales-register?search=${encodeURIComponent(linkedSaleByVehicleId.get(String(v.id)).invoiceNo || String(linkedSaleByVehicleId.get(String(v.id)).id))}`)} style={{ background: "none", border: "none", color: "#166534", textDecoration: "underline", cursor: "pointer", padding: 0, fontSize: "10px", fontWeight: 700 }}>
                                                                {linkedSaleByVehicleId.get(String(v.id)).invoiceNo || "#" + linkedSaleByVehicleId.get(String(v.id)).id}
                                                            </button>
                                                        </div>
                                                    ) : null}
                                                    {linkedPurchaseByVehicleId.get(String(v.id)) ? (
                                                        <div>
                                                            Linked Purchase:{" "}
                                                            <button type="button" onClick={() => navigate(`/purchase-register?search=${encodeURIComponent(linkedPurchaseByVehicleId.get(String(v.id)).purchaseOrderNo || String(linkedPurchaseByVehicleId.get(String(v.id)).id))}`)} style={{ background: "none", border: "none", color: "#6b21a8", textDecoration: "underline", cursor: "pointer", padding: 0, fontSize: "10px", fontWeight: 700 }}>
                                                                {linkedPurchaseByVehicleId.get(String(v.id)).purchaseOrderNo || "#" + linkedPurchaseByVehicleId.get(String(v.id)).id}
                                                            </button>
                                                        </div>
                                                    ) : null}
                                                    {!linkedSaleByVehicleId.get(String(v.id)) && !linkedPurchaseByVehicleId.get(String(v.id)) ? "No linked transaction" : ""}
                                                </div>
                                            </td>
                                            <td style={{ padding: "10px 14px" }}>
                                                <span style={{
                                                    padding: "3px 8px",
                                                    borderRadius: "10px",
                                                    fontSize: "11px",
                                                    fontWeight: "600",
                                                    background: v.status === "INSIDE" ? "#fef3c7" : "#e2e8f0",
                                                    color: v.status === "INSIDE" ? "#92400e" : "#475569"
                                                }}>
                                                    ● {v.status}
                                                </span>
                                            </td>
                                            <td style={{ padding: "10px 14px", textAlign: "center" }}>
                                                <div style={{ display: "inline-flex", gap: "6px", flexWrap: "wrap", justifyContent: "center" }}>
                                                    {!isClient && v.status === "INSIDE" && (
                                                        <button
                                                            onClick={() => markExit(v.id, v.vehicleNo)}
                                                            title="Record Exit from Factory"
                                                            style={{ padding: "4px 8px", background: "#fef3c7", border: "1px solid #fde68a", color: "#92400e", borderRadius: "4px", cursor: "pointer", fontSize: "11px", fontWeight: "600" }}
                                                        >
                                                            Exit
                                                        </button>
                                                    )}

                                                    {!isClient && v.registerType !== "SALES" && !linkedSaleByVehicleId.get(String(v.id)) && (
                                                        <button
                                                            onClick={() => navigate(`/sales-register?vehicleId=${v.id}&vehicleNo=${encodeURIComponent(v.vehicleNo || "")}&date=${encodeURIComponent(v.date || "")}&partyName=${encodeURIComponent(v.partyName || "")}&commodity=${encodeURIComponent(v.commodity || "")}&grossWeight=${encodeURIComponent(v.grossWeight ?? "")}&tareWeight=${encodeURIComponent(v.tareWeight ?? "")}`)}
                                                            title="Create/Link Sales from this vehicle"
                                                            style={{ padding: "4px 8px", background: "#dcfce7", border: "1px solid #86efac", color: "#166534", borderRadius: "4px", cursor: "pointer", fontSize: "11px", fontWeight: "600" }}
                                                        >
                                                            Sale
                                                        </button>
                                                    )}

                                                    {!isClient && v.registerType !== "PURCHASE" && !linkedPurchaseByVehicleId.get(String(v.id)) && (
                                                        <button
                                                            onClick={() => navigate(`/purchase-register?vehicleId=${v.id}&vehicleNo=${encodeURIComponent(v.vehicleNo || "")}&date=${encodeURIComponent(v.date || "")}&partyName=${encodeURIComponent(v.partyName || "")}&commodity=${encodeURIComponent(v.commodity || "")}&grossWeight=${encodeURIComponent(v.grossWeight ?? "")}&tareWeight=${encodeURIComponent(v.tareWeight ?? "")}`)}
                                                            title="Create/Link Purchase from this vehicle"
                                                            style={{ padding: "4px 8px", background: "#ede9fe", border: "1px solid #c4b5fd", color: "#6b21a8", borderRadius: "4px", cursor: "pointer", fontSize: "11px", fontWeight: "600" }}
                                                        >
                                                            Purchase
                                                        </button>
                                                    )}

                                                    {!isClient && (
                                                        <button
                                                            onClick={() => startEdit(v)}
                                                            title="Edit vehicle record"
                                                            style={{ padding: "4px 8px", background: "#fff", border: "1px solid #cbd5e1", borderRadius: "4px", cursor: "pointer", fontSize: "11px" }}
                                                        >
                                                            Edit
                                                        </button>
                                                    )}

                                                    {!isClient && (
                                                        <button
                                                            onClick={() => deleteVehicle(v.id, v.vehicleNo)}
                                                            title="Delete record"
                                                            style={{ padding: "4px 8px", background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", borderRadius: "4px", cursor: "pointer", fontSize: "11px" }}
                                                        >
                                                            Delete
                                                        </button>
                                                    )}
                                                    {isClient && <span style={{ fontSize: "11px", color: "#64748b" }}>Read-only</span>}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* VEHICLE HISTORY MODAL */}
            {historyVehicleNo && (
                <div style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: "rgba(15, 23, 42, 0.7)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 9999,
                    padding: "20px"
                }}>
                    <div style={{
                        background: "#fff",
                        borderRadius: "12px",
                        maxWidth: "800px",
                        width: "100%",
                        padding: "24px",
                        maxHeight: "85vh",
                        overflowY: "auto"
                    }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", borderBottom: "1px solid #e2e8f0", paddingBottom: "10px" }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: "18px", color: "#1e3a8a" }}>
                                    Weighbridge History: {historyVehicleNo}
                                </h2>
                                <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748b" }}>
                                    Complete chronological log of {historyEntries.length} visits to DHM Pyrotech plant
                                </p>
                            </div>
                            <button
                                onClick={() => setHistoryVehicleNo(null)}
                                style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#94a3b8" }}
                            >
                                ✕
                            </button>
                        </div>

                        <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
                                <thead>
                                    <tr style={{ background: "#f8fafc", borderBottom: "1px solid #cbd5e1" }}>
                                        <th style={{ padding: "8px" }}>Date</th>
                                        <th style={{ padding: "8px" }}>In / Out</th>
                                        <th style={{ padding: "8px" }}>Party</th>
                                        <th style={{ padding: "8px" }}>Commodity</th>
                                        <th style={{ padding: "8px" }}>Net Weight</th>
                                        <th style={{ padding: "8px" }}>Register</th>
                                        <th style={{ padding: "8px" }}>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {historyEntries.map(h => (
                                        <tr key={h.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                            <td style={{ padding: "8px" }}>{h.date}</td>
                                            <td style={{ padding: "8px" }}>{h.entryTime || "—"} / {h.exitTime || "—"}</td>
                                            <td style={{ padding: "8px" }}>{h.partyName || "—"}</td>
                                            <td style={{ padding: "8px" }}>{h.commodity}</td>
                                            <td style={{ padding: "8px", fontWeight: "600" }}>{h.netWeight ? `${Number(h.netWeight).toLocaleString()} KG` : "—"}</td>
                                            <td style={{ padding: "8px" }}>{h.registerType}</td>
                                            <td style={{ padding: "8px" }}>{h.status}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div style={{ marginTop: "20px", textAlign: "right" }}>
                            <button
                                onClick={() => setHistoryVehicleNo(null)}
                                style={{ padding: "6px 16px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer" }}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* FULL PHOTO VIEW MODAL */}
            {viewPhotoUrl && (
                <div style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: "rgba(0, 0, 0, 0.85)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 10000,
                    padding: "20px"
                }}>
                    <div style={{ maxWidth: "850px", width: "100%", background: "#fff", borderRadius: "10px", overflow: "hidden" }}>
                        <div style={{ padding: "12px 16px", background: "#0f172a", color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <strong style={{ fontSize: "14px" }}>{viewPhotoTitle}</strong>
                            <button
                                onClick={() => setViewPhotoUrl(null)}
                                style={{ background: "none", border: "none", color: "#fff", fontSize: "20px", cursor: "pointer" }}
                            >
                                ✕
                            </button>
                        </div>
                        <div style={{ padding: "12px", textAlign: "center", background: "#0f172a" }}>
                            <img src={viewPhotoUrl} alt="Inspection" style={{ maxWidth: "100%", maxHeight: "75vh", objectFit: "contain" }} />
                        </div>
                    </div>
                </div>
            )}

            {/* CAMERA & GEOLOCATION MODAL */}
            {showCameraModal && (
                <GeolocationCameraModal
                    vehicleNo={form.vehicleNo}
                    targetPhotoType={targetPhotoType}
                    onCapture={handleCameraCapture}
                    onClose={() => setShowCameraModal(false)}
                />
            )}

        </div>
    );
}

export default VehicleRegister;


