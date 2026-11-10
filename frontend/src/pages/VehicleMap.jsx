import { useEffect, useState } from "react";
import api from "../api";
import InteractiveMap from "../components/InteractiveMap";

function VehicleMap() {
    const [mapData, setMapData] = useState({
        factoryLatitude: 18.5204,
        factoryLongitude: 73.8567,
        geofenceRadiusMeters: 500,
        vehicles: []
    });
    const [loading, setLoading] = useState(true);
    const [selectedVehicle, setSelectedVehicle] = useState(null);

    useEffect(() => {
        loadMapData();
    }, []);

    async function loadMapData() {
        try {
            setLoading(true);
            const res = await api.get("/api/vehicles/map");
            if (res.data) {
                setMapData(res.data);
                if (res.data.vehicles && res.data.vehicles.length > 0) {
                    setSelectedVehicle(res.data.vehicles[0]);
                }
            }
        } catch (err) {
            console.error("Map data error:", err);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="vehicle-page">

            <div className="page-header">
                <div>
                    <h1>GPS VEHICLE LOCATION MAP & GEOFENCE</h1>
                    <p>Live satellite tracking of vehicle weighbridge entries & factory boundary compliance</p>
                </div>

                <button
                    type="button"
                    className="secondary-button"
                    onClick={loadMapData}
                    disabled={loading}
                >
                    {loading ? "Loading Map..." : "Refresh Location Data"}
                </button>
            </div>

            {/* MAP + SIDEBAR GRID */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "20px", alignItems: "start" }}>

                {/* INTERACTIVE MAP CONTAINER */}
                <div className="card" style={{ padding: "12px", minHeight: "520px" }}>
                    <div style={{ marginBottom: "10px", display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#64748b" }}>
                        <span>🏭 Factory: <strong>{mapData.factoryLatitude}, {mapData.factoryLongitude}</strong></span>
                        <span>Boundary: <strong>{mapData.geofenceRadiusMeters} meters radius</strong></span>
                    </div>

                    <InteractiveMap
                        factoryLatitude={mapData.factoryLatitude}
                        factoryLongitude={mapData.factoryLongitude}
                        geofenceRadiusMeters={mapData.geofenceRadiusMeters}
                        vehicles={mapData.vehicles}
                        selectedVehicle={selectedVehicle}
                    />
                </div>

                {/* VEHICLE LIST & DETAILS PANE */}
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

                    {/* SELECTED VEHICLE CARD */}
                    {selectedVehicle && (
                        <div className="card" style={{ border: "2px solid #173f67" }}>
                            <div className="section-header" style={{ marginBottom: "10px" }}>
                                <div>
                                    <h3 style={{ fontSize: "16px", margin: 0 }}>Selected Vehicle</h3>
                                    <p style={{ margin: "2px 0 0", fontSize: "12px" }}>{selectedVehicle.vehicleNo}</p>
                                </div>
                                <span style={{
                                    fontSize: "10px",
                                    fontWeight: "bold",
                                    padding: "3px 8px",
                                    borderRadius: "4px",
                                    background: selectedVehicle.insideGeofence ? "#dcfce7" : "#ffedd5",
                                    color: selectedVehicle.insideGeofence ? "#15803d" : "#c2410c"
                                }}>
                                    {selectedVehicle.insideGeofence ? "INSIDE GEOFENCE" : "OUTSIDE GEOFENCE"}
                                </span>
                            </div>

                            {selectedVehicle.photoData && (
                                <img
                                    src={selectedVehicle.photoData}
                                    alt="Vehicle stamped"
                                    style={{ width: "100%", height: "140px", objectFit: "cover", borderRadius: "8px", marginBottom: "10px" }}
                                />
                            )}

                            <div style={{ fontSize: "12px", lineHeight: "1.8", color: "#334155" }}>
                                <div><strong>Driver:</strong> {selectedVehicle.driverName || "N/A"}</div>
                                <div><strong>Contact:</strong> {selectedVehicle.driverContact || "N/A"}</div>
                                <div><strong>Commodity:</strong> {selectedVehicle.commodity}</div>
                                <div><strong>Net Weight:</strong> {selectedVehicle.grossWeight && selectedVehicle.tareWeight ? (selectedVehicle.grossWeight - selectedVehicle.tareWeight) : 0} KG</div>
                                <div><strong>Recorded:</strong> {selectedVehicle.date} {selectedVehicle.entryTime || ""}</div>
                                <div><strong>Coordinates:</strong> {selectedVehicle.latitude}, {selectedVehicle.longitude}</div>
                            </div>

                            <div style={{ marginTop: "12px" }}>
                                <a
                                    href={`https://www.google.com/maps?q=${selectedVehicle.latitude},${selectedVehicle.longitude}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="primary-button"
                                    style={{ display: "block", textAlign: "center", textDecoration: "none", fontSize: "12px", padding: "8px" }}
                                >
                                    Open in Google Maps ↗
                                </a>
                            </div>
                        </div>
                    )}

                    {/* VEHICLES WITH GPS LOGS */}
                    <div className="card">
                        <div className="section-header" style={{ marginBottom: "12px" }}>
                            <div>
                                <h3 style={{ fontSize: "15px", margin: 0 }}>GPS Vehicles ({mapData.vehicles?.length || 0})</h3>
                                <p style={{ margin: "2px 0 0", fontSize: "11px" }}>Click to focus on map</p>
                            </div>
                        </div>

                        <div style={{ maxHeight: "300px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
                            {(!mapData.vehicles || mapData.vehicles.length === 0) ? (
                                <div style={{ fontSize: "12px", color: "#64748b", textAlign: "center", padding: "16px" }}>
                                    No GPS-enabled vehicle records found yet. Use the Geolocation Camera on the Vehicle Register page to attach GPS.
                                </div>
                            ) : (
                                mapData.vehicles.map((v) => (
                                    <div
                                        key={v.id}
                                        onClick={() => setSelectedVehicle(v)}
                                        style={{
                                            padding: "10px 12px",
                                            borderRadius: "8px",
                                            border: "1px solid",
                                            borderColor: selectedVehicle?.id === v.id ? "#2563eb" : "#e2e8f0",
                                            background: selectedVehicle?.id === v.id ? "#eff6ff" : "#f8fafc",
                                            cursor: "pointer",
                                            fontSize: "12px"
                                        }}
                                    >
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                            <strong>🚛 {v.vehicleNo}</strong>
                                            <span style={{
                                                fontSize: "10px",
                                                fontWeight: "bold",
                                                color: v.insideGeofence ? "#15803d" : "#c2410c"
                                            }}>
                                                {v.insideGeofence ? "● Inside" : "● Outside"}
                                            </span>
                                        </div>
                                        <div style={{ color: "#64748b", marginTop: "2px", fontSize: "11px" }}>
                                            {v.date} | {v.commodity}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                </div>

            </div>

        </div>
    );
}

export default VehicleMap;
