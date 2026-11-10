import { useEffect, useRef, useState } from "react";

function InteractiveMap({ factoryLatitude, factoryLongitude, geofenceRadiusMeters, vehicles, selectedVehicle }) {
    const mapContainerRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const [leafletReady, setLeafletReady] = useState(false);

    const fLat = factoryLatitude || 18.5204;
    const fLon = factoryLongitude || 73.8567;
    const radius = geofenceRadiusMeters || 500;

    // Dynamically load Leaflet from CDN
    useEffect(() => {
        if (window.L) {
            setLeafletReady(true);
            return;
        }

        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);

        const script = document.createElement("script");
        script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        script.onload = () => setLeafletReady(true);
        document.body.appendChild(script);
    }, []);

    // Initialize & update map
    useEffect(() => {
        if (!leafletReady || !mapContainerRef.current) return;
        const L = window.L;

        if (!mapInstanceRef.current) {
            const map = L.map(mapContainerRef.current).setView([fLat, fLon], 14);
            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            }).addTo(map);

            mapInstanceRef.current = map;
        }

        const map = mapInstanceRef.current;

        // Clear existing markers/layers (except tiles)
        map.eachLayer((layer) => {
            if (layer instanceof L.Marker || layer instanceof L.Circle) {
                map.removeLayer(layer);
            }
        });

        // 1. Factory Pin & Geofence Boundary
        const factoryIcon = L.divIcon({
            className: "custom-factory-pin",
            html: `<div style="background:#173f67;color:white;padding:6px;border-radius:50%;border:2px solid white;box-shadow:0 3px 8px rgba(0,0,0,0.4);font-size:14px;text-align:center;">🏭</div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 16]
        });

        L.marker([fLat, fLon], { icon: factoryIcon })
            .addTo(map)
            .bindPopup(`<strong>🏭 DHM Pyrotech Enterprises</strong><br/>Factory Main Gate<br/>GPS: ${fLat}, ${fLon}`);

        L.circle([fLat, fLon], {
            radius: radius,
            color: "#0284c7",
            weight: 2,
            fillColor: "#38bdf8",
            fillOpacity: 0.15
        }).addTo(map);

        // 2. Vehicle Markers
        if (vehicles && vehicles.length > 0) {
            vehicles.forEach((v) => {
                if (!v.latitude || !v.longitude) return;

                const isInside = v.insideGeofence !== false;
                const markerColor = isInside ? "#16a34a" : "#ea580c";

                const vehicleIcon = L.divIcon({
                    className: "custom-vehicle-pin",
                    html: `<div style="background:${markerColor};color:white;padding:5px 8px;border-radius:12px;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.35);font-size:11px;font-weight:bold;white-space:nowrap;">🚛 ${v.vehicleNo}</div>`,
                    iconSize: [80, 26],
                    iconAnchor: [40, 13]
                });

                const popupHtml = `
                    <div style="font-family:Inter,sans-serif;font-size:12px;min-width:180px;">
                        <strong style="font-size:14px;color:#1e293b;">🚛 ${v.vehicleNo}</strong>
                        <div style="margin-top:4px;color:#64748b;">${v.date} | ${v.entryTime || "Weighbridge"}</div>
                        <div style="margin:4px 0;"><strong>Driver:</strong> ${v.driverName || "N/A"}</div>
                        <div><strong>Net Weight:</strong> ${v.grossWeight && v.tareWeight ? (v.grossWeight - v.tareWeight) : (v.netWeight || 0)} KG</div>
                        <div style="margin:4px 0;"><strong>Commodity:</strong> ${v.commodity || "-"}</div>
                        <div style="margin:6px 0;">
                            <span style="background:${isInside ? '#dcfce7' : '#ffedd5'};color:${isInside ? '#15803d' : '#c2410c'};padding:2px 6px;border-radius:4px;font-size:10px;font-weight:bold;">
                                ${isInside ? 'INSIDE GEOFENCE' : 'OUTSIDE FACTORY BOUNDARY'}
                            </span>
                        </div>
                        <a href="https://www.google.com/maps?q=${v.latitude},${v.longitude}" target="_blank" rel="noreferrer" style="display:inline-block;margin-top:4px;color:#2563eb;text-decoration:underline;">
                            Open in Google Maps ↗
                        </a>
                    </div>
                `;

                L.marker([v.latitude, v.longitude], { icon: vehicleIcon })
                    .addTo(map)
                    .bindPopup(popupHtml);
            });
        }

        // If a specific vehicle is selected, pan to it
        if (selectedVehicle && selectedVehicle.latitude && selectedVehicle.longitude) {
            map.flyTo([selectedVehicle.latitude, selectedVehicle.longitude], 16);
        }

    }, [leafletReady, fLat, fLon, radius, vehicles, selectedVehicle]);

    return (
        <div style={{ position: "relative", width: "100%", height: "100%", minHeight: "450px" }}>
            <div ref={mapContainerRef} style={{ width: "100%", height: "100%", minHeight: "450px", borderRadius: "12px" }}></div>
            {!leafletReady && (
                <div style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: "#f1f5f9",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#64748b",
                    fontSize: "13px"
                }}>
                    Connecting to Map Satellite Services...
                </div>
            )}
        </div>
    );
}

export default InteractiveMap;
