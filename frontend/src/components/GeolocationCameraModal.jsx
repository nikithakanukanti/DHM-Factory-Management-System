import { useState, useRef, useEffect } from "react";

const PHOTO_TYPE_LABELS = {
    vehicle: "Vehicle Photo (Camera + GPS)",
    gross: "Gross Weight Scale Photo (Camera + GPS)",
    tare: "Tare Weight Scale Photo (Camera + GPS)"
};

function GeolocationCameraModal({ vehicleNo, targetPhotoType = "vehicle", onCapture, onClose }) {
    const videoRef = useRef(null);
    const streamRef = useRef(null);

    const [activePhotoType, setActivePhotoType] = useState(targetPhotoType);
    const [cameraActive, setCameraActive] = useState(false);
    const [cameraError, setCameraError] = useState("");
    const [capturedImage, setCapturedImage] = useState(null);

    const [location, setLocation] = useState({
        latitude: null,
        longitude: null,
        accuracy: null,
        timestamp: null,
        address: ""
    });
    const [gpsLoading, setGpsLoading] = useState(false);
    const [gpsError, setGpsError] = useState("");
    const [manualGps, setManualGps] = useState(false);

    // 1. Request GPS Location with permission handling
    const fetchLocation = () => {
        if (!navigator.geolocation) {
            setGpsError("GPS Geolocation is not supported by your browser or device.");
            return;
        }

        setGpsLoading(true);
        setGpsError("");

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const lat = Number(pos.coords.latitude.toFixed(6));
                const lng = Number(pos.coords.longitude.toFixed(6));
                const acc = Math.round(pos.coords.accuracy);
                setLocation({
                    latitude: lat,
                    longitude: lng,
                    accuracy: acc,
                    timestamp: new Date().toLocaleString(),
                    address: `GPS ${lat.toFixed(5)}, ${lng.toFixed(5)} (±${acc}m)`
                });
                setGpsLoading(false);
            },
            (err) => {
                console.warn("Geolocation permission error:", err);
                let message = "Location permission was denied. You can enter factory GPS manually below.";
                if (err.code === 2) message = "Position unavailable. Network or GPS signal lost.";
                if (err.code === 3) message = "Location request timed out. Please retry or enter manually.";
                setGpsError(message);
                setGpsLoading(false);
            },
            { enableHighAccuracy: true, timeout: 12000, maximumAge: 10000 }
        );
    };

    const setFactoryPresetLocation = () => {
        setLocation({
            latitude: 18.5204,
            longitude: 73.8567,
            accuracy: 10,
            timestamp: new Date().toLocaleString(),
            address: "DHM Factory Weighbridge MIDC, Pune"
        });
        setGpsError("");
    };

    // 2. Start Device Camera
    const startCamera = async () => {
        setCameraError("");
        try {
            const constraints = {
                video: {
                    facingMode: "environment", // rear camera preferred on mobile
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            };
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
            setCameraActive(true);
        } catch (err) {
            console.error("Camera access error:", err);
            setCameraError("Camera unavailable or permission denied. You can upload an image file from your device.");
        }
    };

    // Stop Camera stream
    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
        setCameraActive(false);
    };

    useEffect(() => {
        fetchLocation();
        startCamera();
        return () => {
            stopCamera();
        };
    }, []);

    // 3. Watermark Image with Factory Header & GPS Details
    const applyWatermarkToImage = (imageSource, isVideo = false) => {
        const canvas = document.createElement("canvas");
        const width = isVideo ? (imageSource.videoWidth || 640) : (imageSource.naturalWidth || imageSource.width || 800);
        const height = isVideo ? (imageSource.videoHeight || 480) : (imageSource.naturalHeight || imageSource.height || 600);
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(imageSource, 0, 0, width, height);

        // Watermark Banner at bottom
        const bannerHeight = Math.max(Math.round(height * 0.14), 70);
        ctx.fillStyle = "rgba(15, 33, 55, 0.88)";
        ctx.fillRect(0, height - bannerHeight, width, bannerHeight);

        // Text details
        const photoLabel = PHOTO_TYPE_LABELS[activePhotoType] || "Photograph";
        ctx.fillStyle = "#ffffff";
        ctx.font = `bold ${Math.max(Math.round(bannerHeight * 0.28), 14)}px Inter, Arial, sans-serif`;
        ctx.fillText(`DHM PYROTECH ENTERPRISES | ${photoLabel.toUpperCase()}`, 16, height - bannerHeight + Math.round(bannerHeight * 0.42));

        ctx.fillStyle = "#93c5fd";
        ctx.font = `${Math.max(Math.round(bannerHeight * 0.22), 12)}px Inter, Arial, sans-serif`;
        const gpsText = location.latitude != null && location.longitude != null
            ? `Vehicle: ${vehicleNo || "N/A"} | GPS: ${Number(location.latitude).toFixed(6)}°, ${Number(location.longitude).toFixed(6)}°`
            : `Vehicle: ${vehicleNo || "N/A"} | GPS: Not available at capture`;
        const timeText = new Date().toLocaleString();
        ctx.fillText(`${gpsText} | ${timeText}`, 16, height - Math.round(bannerHeight * 0.2));

        return canvas.toDataURL("image/jpeg", 0.85);
    };

    // Capture Snapshot from active video
    const capturePhoto = () => {
        if (!videoRef.current) return;
        const watermarked = applyWatermarkToImage(videoRef.current, true);
        setCapturedImage(watermarked);
        stopCamera();
    };

    // Laptop or Mobile File Upload
    const handleFileUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const watermarked = applyWatermarkToImage(img, false);
                setCapturedImage(watermarked);
                stopCamera();
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    };

    // Retake photo
    const retake = () => {
        setCapturedImage(null);
        startCamera();
    };

    // Confirm and pass data back
    const handleConfirm = () => {
        const lat = location.latitude != null && location.latitude !== "" ? Number(location.latitude) : null;
        const lng = location.longitude != null && location.longitude !== "" ? Number(location.longitude) : null;
        const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
        const address = hasCoords
            ? (location.address && String(location.address).trim()
                ? location.address
                : `GPS ${lat.toFixed(5)}, ${lng.toFixed(5)}`)
            : (location.address || "");

        onCapture({
            photoType: activePhotoType,
            photoData: capturedImage,
            latitude: hasCoords ? lat : null,
            longitude: hasCoords ? lng : null,
            locationAddress: address
        });
        onClose();
    };

    return (
        <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(10, 25, 41, 0.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "16px"
        }}>
            <div style={{
                background: "#ffffff",
                borderRadius: "14px",
                width: "100%",
                maxWidth: "640px",
                overflow: "hidden",
                boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
                display: "flex",
                flexDirection: "column",
                maxHeight: "92vh"
            }}>
                {/* Header */}
                <div style={{
                    padding: "16px 20px",
                    background: "linear-gradient(135deg, #173f67 0%, #102e4b 100%)",
                    color: "white",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: "17px" }}>Camera with GPS Location (Security)</h3>
                        <p style={{ margin: "2px 0 0", fontSize: "12px", opacity: 0.85 }}>
                            Capture: <strong>{PHOTO_TYPE_LABELS[activePhotoType]}</strong> | Vehicle: <strong>{vehicleNo || "Pending"}</strong>
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        style={{ background: "none", border: "none", color: "white", fontSize: "20px", cursor: "pointer" }}
                    >
                        ×
                    </button>
                </div>

                {/* Content */}
                <div style={{ padding: "16px 20px", overflowY: "auto" }}>

                    {/* PHOTO TYPE SELECTOR TABS */}
                    <div style={{ display: "flex", gap: "8px", marginBottom: "14px", background: "#f1f5f9", padding: "4px", borderRadius: "8px" }}>
                        {Object.entries(PHOTO_TYPE_LABELS).map(([key, label]) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => { setActivePhotoType(key); if (capturedImage) retake(); }}
                                style={{
                                    flex: 1,
                                    padding: "6px 10px",
                                    fontSize: "12px",
                                    fontWeight: activePhotoType === key ? "700" : "500",
                                    borderRadius: "6px",
                                    border: "none",
                                    background: activePhotoType === key ? "#2563eb" : "transparent",
                                    color: activePhotoType === key ? "#ffffff" : "#475569",
                                    cursor: "pointer",
                                    transition: "all 0.15s"
                                }}
                            >
                                {label.split(" ")[0]}
                            </button>
                        ))}
                    </div>

                    {/* GPS Status Card */}
                    <div style={{
                        background: location.latitude ? "#f0fdf4" : "#f8fafc",
                        border: "1px solid " + (location.latitude ? "#bbf7d0" : "#e2e8f0"),
                        borderRadius: "8px",
                        padding: "10px 14px",
                        marginBottom: "14px",
                        fontSize: "12px"
                    }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "6px" }}>
                            <span>
                                <strong>GPS Coordinates: </strong>
                                {gpsLoading ? "Acquiring satellites..." : location.latitude ? (
                                    <span style={{ color: "#15803d", fontWeight: "bold" }}>
                                        📍 {location.latitude}° N, {location.longitude}° E (±{location.accuracy}m)
                                    </span>
                                ) : "Location pending (photo can still be captured; GPS will be noted if available)"}
                            </span>
                            <div style={{ display: "flex", gap: "10px" }}>
                                <button
                                    type="button"
                                    onClick={fetchLocation}
                                    disabled={gpsLoading}
                                    style={{ background: "none", border: "none", color: "#1e40af", cursor: "pointer", fontSize: "12px", textDecoration: "underline" }}
                                >
                                    {gpsLoading ? "Locating..." : "↻ Refresh GPS"}
                                </button>
                                <button
                                    type="button"
                                    onClick={setFactoryPresetLocation}
                                    style={{ background: "none", border: "none", color: "#0d9488", cursor: "pointer", fontSize: "12px", textDecoration: "underline" }}
                                >
                                    Factory Preset
                                </button>
                            </div>
                        </div>

                        {gpsError && (
                            <div style={{ color: "#b91c1c", marginTop: "6px" }}>
                                ⚠ {gpsError}
                                <button
                                    type="button"
                                    onClick={() => setManualGps(!manualGps)}
                                    style={{ marginLeft: "8px", color: "#0369a1", textDecoration: "underline", background: "none", border: "none", cursor: "pointer" }}
                                >
                                    {manualGps ? "Hide manual entry" : "Enter Coordinates Manually"}
                                </button>
                            </div>
                        )}

                        {manualGps && (
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "8px" }}>
                                <input
                                    type="number"
                                    step="0.000001"
                                    placeholder="Latitude (e.g. 18.5204)"
                                    value={location.latitude || ""}
                                    onChange={(e) => setLocation({ ...location, latitude: parseFloat(e.target.value) || null })}
                                    style={{ padding: "6px 8px", fontSize: "12px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                                />
                                <input
                                    type="number"
                                    step="0.000001"
                                    placeholder="Longitude (e.g. 73.8567)"
                                    value={location.longitude || ""}
                                    onChange={(e) => setLocation({ ...location, longitude: parseFloat(e.target.value) || null })}
                                    style={{ padding: "6px 8px", fontSize: "12px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                                />
                            </div>
                        )}
                    </div>

                    {/* Camera Viewport or Captured Preview */}
                    <div style={{
                        position: "relative",
                        background: "#0f172a",
                        borderRadius: "10px",
                        overflow: "hidden",
                        minHeight: "260px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                    }}>
                        {!capturedImage ? (
                            <>
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    style={{ width: "100%", maxHeight: "320px", objectFit: "cover" }}
                                />
                                {cameraError && (
                                    <div style={{
                                        position: "absolute",
                                        padding: "16px",
                                        background: "rgba(0,0,0,0.85)",
                                        color: "#fca5a5",
                                        fontSize: "12px",
                                        textAlign: "center"
                                    }}>
                                        {cameraError}
                                        <div style={{ marginTop: "10px" }}>
                                            <label style={{
                                                background: "#3b82f6",
                                                color: "white",
                                                padding: "6px 14px",
                                                borderRadius: "6px",
                                                cursor: "pointer",
                                                display: "inline-block",
                                                fontWeight: "600"
                                            }}>
                                                ðŸ“ Choose Image File from Device
                                                <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: "none" }} />
                                            </label>
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <img
                                src={capturedImage}
                                alt="Captured vehicle"
                                style={{ width: "100%", maxHeight: "320px", objectFit: "contain" }}
                            />
                        )}
                    </div>

                    {/* Camera Control Buttons */}
                    <div style={{ marginTop: "14px", display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
                        {!capturedImage ? (
                            <>
                                <button
                                    type="button"
                                    onClick={capturePhoto}
                                    disabled={!cameraActive}
                                    style={{
                                        background: "#15803d",
                                        color: "white",
                                        border: "none",
                                        padding: "10px 24px",
                                        borderRadius: "8px",
                                        fontSize: "14px",
                                        fontWeight: "600",
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px"
                                    }}
                                >
                                    ðŸ“¸ Capture & Stamp Photo
                                </button>
                                <label style={{
                                    background: "#f1f5f9",
                                    border: "1px solid #cbd5e1",
                                    color: "#334155",
                                    padding: "10px 16px",
                                    borderRadius: "8px",
                                    fontSize: "13px",
                                    fontWeight: "600",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px"
                                }}>
                                    ðŸ“ Upload from Laptop / Device
                                    <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: "none" }} />
                                </label>
                            </>
                        ) : (
                            <>
                                <button
                                    type="button"
                                    onClick={retake}
                                    style={{
                                        background: "#64748b",
                                        color: "white",
                                        border: "none",
                                        padding: "8px 18px",
                                        borderRadius: "8px",
                                        fontSize: "13px",
                                        cursor: "pointer"
                                    }}
                                >
                                    ↻ Retake
                                </button>
                                <button
                                    type="button"
                                    onClick={handleConfirm}
                                    style={{
                                        background: "#173f67",
                                        color: "white",
                                        border: "none",
                                        padding: "8px 24px",
                                        borderRadius: "8px",
                                        fontSize: "13px",
                                        fontWeight: "600",
                                        cursor: "pointer"
                                    }}
                                >
                                    ✓ Attach to Vehicle Record
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div style={{ padding: "12px 20px", background: "#f8fafc", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end" }}>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            background: "transparent",
                            border: "1px solid #cbd5e1",
                            padding: "6px 16px",
                            borderRadius: "6px",
                            fontSize: "12px",
                            cursor: "pointer"
                        }}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

export default GeolocationCameraModal;


