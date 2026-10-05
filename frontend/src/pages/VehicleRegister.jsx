import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
const API_URL = "http://localhost:8090";

function VehicleRegister() {

    const navigate = useNavigate();
    const [vehicles, setVehicles] = useState([]);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const [search, setSearch] = useState("");

    const [editingId, setEditingId] = useState(null);

    const [form, setForm] = useState({
        date: getTodayDate(),
        vehicleNo: "",
        grossWeight: "",
        tareWeight: "",
        local: false,
        imported: false,
        commodity: "",
        remarks: "",
        registerType: "SALES"
    });


    const commodities = [
        "Local Waste Rubber Tyre",
        "Imported Waste Rubber Tyre",
        "Metal Steel Scrap",
        "Carbon Black Powder",
        "Fuel Oil"
    ];


    function getTodayDate() {
        const today = new Date();

        const year = today.getFullYear();

        const month = String(
            today.getMonth() + 1
        ).padStart(2, "0");

        const day = String(
            today.getDate()
        ).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }


    useEffect(() => {
        loadVehicles();
    }, []);


    // =========================
    // LOAD VEHICLES
    // =========================

    async function loadVehicles() {

        try {

            setLoading(true);
            setError("");

            const response = await axios.get(
                `${API_URL}/api/vehicles`,
                {
                    withCredentials: true
                }
            );

            /*
             * Make sure vehicles is ALWAYS an array.
             * This prevents:
             *
             * vehicles.map is not a function
             */

            if (Array.isArray(response.data)) {
                console.log("vehicle api response:", response.data);
                setVehicles(response.data);

            } else {

                console.error(
                    "Unexpected vehicle response:",
                    response.data
                );

                setVehicles([]);

                setError(
                    "Unable to load vehicle records."
                );
            }

        } catch (err) {

            console.error(
                "Vehicle loading error:",
                err
            );

            setVehicles([]);

            if (err.response?.status === 401) {

                setError(
                    "Your login session has expired. Please login again."
                );

            } else if (err.response?.status === 403) {

                setError(
                    "You do not have permission to view vehicles."
                );

            } else {

                setError(
                    "Unable to connect to the backend."
                );
            }

        } finally {

            setLoading(false);

        }
    }


    // =========================
    // HANDLE INPUT
    // =========================

    function handleChange(e) {

        const {
            name,
            value,
            type,
            checked
        } = e.target;

        setForm((previous) => ({
            ...previous,
            [name]: type === "checkbox"
                ? checked
                : value
        }));

    }


    // =========================
    // HANDLE LOCAL / IMPORTED
    // =========================

    function handleLocalChange(e) {

        const checked = e.target.checked;

        setForm((previous) => ({
            ...previous,
            local: checked,
            imported: checked
                ? false
                : previous.imported
        }));

    }


    function handleImportedChange(e) {

        const checked = e.target.checked;

        setForm((previous) => ({
            ...previous,
            imported: checked,
            local: checked
                ? false
                : previous.local
        }));

    }


    // =========================
    // CALCULATE NET WEIGHT
    // =========================

    function getNetWeight() {

        const gross = Number(
            form.grossWeight
        ) || 0;

        const tare = Number(
            form.tareWeight
        ) || 0;

        return gross - tare;
    }


    // =========================
    // RESET FORM
    // =========================

    function resetForm() {

        setForm({
            date: getTodayDate(),
            vehicleNo: "",
            grossWeight: "",
            tareWeight: "",
            local: false,
            imported: false,
            commodity: "",
            remarks: "",
            registerType: "SALES"
        });

        setEditingId(null);

    }


    // =========================
    // SAVE VEHICLE
    // =========================

     async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (!form.date) {
        alert("Please select a date.");
        return;
    }

    if (!form.vehicleNo.trim()) {
        alert("Please enter vehicle number.");
        return;
    }

    const gross = Number(form.grossWeight);
    const tare = Number(form.tareWeight);

    if (!gross || gross <= 0) {
        alert("Please enter a valid gross weight.");
        return;
    }

    if (tare < 0 || tare >= gross) {
        alert("Tare weight must be less than gross weight.");
        return;
    }

    if (!form.commodity) {
        alert("Please select a commodity.");
        return;
    }

    if (!form.registerType) {
        alert("Please select Sales Register or Purchase Register.");
        return;
    }

    const netWeight = gross - tare;

    const vehiclePayload = {
        date: form.date,
        vehicleNo: form.vehicleNo.trim(),
        grossWeight: gross,
        tareWeight: tare,
        local: Boolean(form.local),
        imported: Boolean(form.imported),
        commodity: form.commodity,
        remarks: form.remarks.trim()
    };

    try {

        let savedVehicle;

        /* ==========================================
           SAVE / UPDATE VEHICLE
        ========================================== */

        if (editingId) {

            const response = await axios.put(
                `${API_URL}/api/vehicles/${editingId}`,
                vehiclePayload,
                {
                    withCredentials: true
                }
            );

            savedVehicle = response.data;

        } else {

            const response = await axios.post(
                `${API_URL}/api/vehicles`,
                vehiclePayload,
                {
                    withCredentials: true
                }
            );

            savedVehicle = response.data;
        }


        /* ==========================================
           SEND TO SALES REGISTER
        ========================================== */

        if (!editingId && form.registerType === "SALES") {

            const salesPayload = {
                date: form.date,
                vehicleNo: form.vehicleNo.trim(),
                grossWeight: gross,
                tareWeight: tare,
                commodity: form.commodity,
                remarks: form.remarks.trim()
            };

            await axios.post(
                `${API_URL}/api/sales`,
                salesPayload,
                {
                    withCredentials: true
                }
            );

            alert(
                "Vehicle saved successfully and added to Sales Register."
            );

            resetForm();
            await loadVehicles();

            navigate("/sales-register");

            return;
        }


        /* ==========================================
           SEND TO PURCHASE REGISTER
        ========================================== */

        if (!editingId && form.registerType === "PURCHASE") {

            const purchasePayload = {
                date: form.date,
                netWeight: netWeight,
                commodity: form.commodity,
                remarks: form.remarks.trim()
            };

            await axios.post(
                `${API_URL}/api/purchases`,
                purchasePayload,
                {
                    withCredentials: true
                }
            );

            alert(
                "Vehicle saved successfully and added to Purchase Register."
            );

            resetForm();
            await loadVehicles();

            navigate("/purchase-register");

            return;
        }


        /* ==========================================
           EDIT EXISTING VEHICLE
        ========================================== */

        alert("Vehicle entry updated successfully.");

        resetForm();
        await loadVehicles();

    } catch (error) {

        console.error(
            "Vehicle / Register save error:",
            error
        );

        alert(
            error.response?.data?.message ||
            "Supervisor cannot edit vehicle entries. Please contact the administrator."
        );
    }finally {
        setLoading(false);
    }
}

    // =========================
    // EDIT
    // =========================

    function handleEdit(vehicle) {

        setEditingId(vehicle.id);

        setForm({

            date:
                vehicle.date ||
                getTodayDate(),

            vehicleNo:
                vehicle.vehicleNo || "",

            grossWeight:
                vehicle.grossWeight ?? "",

            tareWeight:
                vehicle.tareWeight ?? "",

            local:
                Boolean(vehicle.local),

            imported:
                Boolean(vehicle.imported),

            commodity:
                vehicle.commodity || "",

            remarks:
                vehicle.remarks || "",

            registerType:
                "SALES"

        });

        setSuccess("");
        setError("");

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

    }


    // =========================
    // DELETE
    // =========================

    async function handleDelete(id) {

        const confirmed =
            window.confirm(
                "Are you sure you want to delete this vehicle entry?"
            );

        if (!confirmed) {
            return;
        }


        try {

            setLoading(true);
            setError("");
            setSuccess("");


            await axios.delete(
                `${API_URL}/api/vehicles/${id}`,
                {
                    withCredentials: true
                }
            );


            setSuccess(
                "Vehicle entry deleted successfully."
            );


            await loadVehicles();


        } catch (err) {

            console.error(
                "Vehicle delete error:",
                err
            );


            if (err.response?.status === 401) {

                setError(
                    "Your login session has expired."
                );

            } else if (err.response?.status === 403) {

                setError(
                    "You do not have permission to delete vehicles."
                );

            } else {

                setError(
                    "Unable to delete vehicle."
                );

            }

        } finally {

            setLoading(false);

        }
    }


    // =========================
    // SEARCH
    // =========================

    const filteredVehicles =
        Array.isArray(vehicles)
            ? vehicles.filter((vehicle) => {

                const searchText =
                    search.toLowerCase().trim();

                if (!searchText) {
                    return true;
                }


                return (

                    String(
                        vehicle.vehicleNo || ""
                    )
                        .toLowerCase()
                        .includes(searchText)

                    ||

                    String(
                        vehicle.commodity || ""
                    )
                        .toLowerCase()
                        .includes(searchText)

                    ||

                    String(
                        vehicle.date || ""
                    )
                        .toLowerCase()
                        .includes(searchText)

                    ||

                    String(
                        vehicle.remarks || ""
                    )
                        .toLowerCase()
                        .includes(searchText)

                );

            })
            : [];


    // =========================
    // RENDER
    // =========================

    return (

        <div className="register-page">


            {/* PAGE HEADER */}

            <div className="page-header">

                <div>

                    <h1>
                        DHM VEHICLE DETAILS REGISTER
                    </h1>

                    <p>
                        Record and manage vehicle entries
                    </p>

                </div>

                <button
                    className="secondary-button"
                    onClick={loadVehicles}
                    disabled={loading}
                >
                    {loading
                        ? "Loading..."
                        : "Refresh"}
                </button>

            </div>


            {/* SUCCESS */}

            {success && (

                <div
                    className="success-message"
                    style={{
                        marginBottom: "20px"
                    }}
                >
                    {success}
                </div>

            )}


            {/* ERROR */}

            {error && (

                <div
                    className="error-message"
                    style={{
                        marginBottom: "20px"
                    }}
                >
                    {error}
                </div>

            )}


            {/* FORM */}

            <div className="card">

                <div className="section-header">

                    <div>

                        <h2>
                            {editingId
                                ? "Edit Vehicle Entry"
                                : "New Vehicle Entry"}
                        </h2>

                        <p>
                            Enter vehicle and weight details
                        </p>

                    </div>

                </div>


                <form
                    onSubmit={handleSubmit}
                    className="form-grid"
                >


                    {/* DATE */}

                    <div className="form-group">

                        <label>
                            Date
                        </label>

                        <input
                            type="date"
                            name="date"
                            value={form.date}
                            onChange={handleChange}
                            required
                        />

                    </div>


                    {/* VEHICLE NUMBER */}

                    <div className="form-group">

                        <label>
                            Vehicle No.
                        </label>

                        <input
                            type="text"
                            name="vehicleNo"
                            value={form.vehicleNo}
                            onChange={handleChange}
                            placeholder="Enter vehicle number"
                            required
                        />

                    </div>


                    {/* GROSS */}

                    <div className="form-group">

                        <label>
                            Gross Weight
                        </label>

                        <input
                            type="number"
                            name="grossWeight"
                            value={form.grossWeight}
                            onChange={handleChange}
                            placeholder="0"
                            min="0"
                            step="0.01"
                            required
                        />

                    </div>


                    {/* TARE */}

                    <div className="form-group">

                        <label>
                            Tare Weight
                        </label>

                        <input
                            type="number"
                            name="tareWeight"
                            value={form.tareWeight}
                            onChange={handleChange}
                            placeholder="0"
                            min="0"
                            step="0.01"
                            required
                        />

                    </div>


                    {/* NET */}

                    <div className="form-group">

                        <label>
                            Net Weight
                        </label>

                        <input
                            type="number"
                            value={getNetWeight()}
                            readOnly
                            disabled
                        />

                        <small>
                            Net Weight = Gross Weight - Tare Weight
                        </small>

                    </div>


                    {/* LOCAL / IMPORTED */}

                    <div className="form-group">

                        <label>
                            Origin
                        </label>

                        <div
                            style={{
                                display: "flex",
                                gap: "20px",
                                alignItems: "center",
                                marginTop: "10px"
                            }}
                        >

                            <label
                                style={{
                                    display: "flex",
                                    gap: "7px",
                                    alignItems: "center"
                                }}
                            >

                                <input
                                    type="checkbox"
                                    name="local"
                                    checked={form.local}
                                    onChange={
                                        handleLocalChange
                                    }
                                />

                                Local

                            </label>


                            <label
                                style={{
                                    display: "flex",
                                    gap: "7px",
                                    alignItems: "center"
                                }}
                            >

                                <input
                                    type="checkbox"
                                    name="imported"
                                    checked={form.imported}
                                    onChange={
                                        handleImportedChange
                                    }
                                />

                                Imported

                            </label>

                        </div>

                    </div>


                    {/* COMMODITY */}

                    <div className="form-group">

                        <label>
                            Commodity
                        </label>

                        <select
                            name="commodity"
                            value={form.commodity}
                            onChange={handleChange}
                            required
                        >

                            <option value="">
                                Select commodity
                            </option>

                            {commodities.map(
                                (commodity) => (

                                    <option
                                        key={commodity}
                                        value={commodity}
                                    >
                                        {commodity}
                                    </option>

                                )
                            )}

                        </select>

                    </div>


                    {/* REGISTER TYPE */}

                    <div className="form-group">

                        <label>
                            Send Entry To
                        </label>

                        <select
                            name="registerType"
                            value={form.registerType}
                            onChange={handleChange}
                            disabled={Boolean(editingId)}
                        >

                            <option value="SALES">
                                Sales Register
                            </option>

                            <option value="PURCHASE">
                                Purchase Register
                            </option>

                        </select>

                        {!editingId && (

                            <small>
                                Vehicle details will also be
                                added to the selected register.
                            </small>

                        )}

                    </div>


                    {/* REMARKS */}

                    <div
                        className="form-group"
                        style={{
                            gridColumn: "1 / -1"
                        }}
                    >

                        <label>
                            Remarks
                        </label>

                        <textarea
                            name="remarks"
                            value={form.remarks}
                            onChange={handleChange}
                            placeholder="Enter remarks"
                            rows="3"
                        />

                    </div>


                    {/* BUTTONS */}

                    <div
                        style={{
                            gridColumn: "1 / -1",
                            display: "flex",
                            gap: "10px",
                            flexWrap: "wrap"
                        }}
                    >

                        <button
                            type="submit"
                            className="primary-button"
                            disabled={loading}
                        >

                            {loading
                                ? "Saving..."
                                : editingId
                                ? "Update Vehicle"
                                : "Save Vehicle"}

                        </button>


                        <button
                            type="button"
                            className="secondary-button"
                            onClick={resetForm}
                            disabled={loading}
                        >
                            Clear
                        </button>

                    </div>

                </form>

            </div>


            {/* VEHICLE TABLE */}

            <div
                className="card"
                style={{
                    marginTop: "25px"
                }}
            >

                <div className="section-header">

                    <div>

                        <h2>
                            Vehicle Entries
                        </h2>

                        <p>
                            All recorded vehicle entries
                        </p>

                    </div>

                </div>


                {/* SEARCH */}

                <div
                    style={{
                        marginBottom: "20px"
                    }}
                >

                    <input
                        type="text"
                        value={search}
                        onChange={(e) =>
                            setSearch(e.target.value)
                        }
                        placeholder="Search vehicle number, commodity, date..."
                        style={{
                            width: "100%",
                            maxWidth: "450px",
                            padding: "11px 14px",
                            border:
                                "1px solid #d5d9df",
                            borderRadius: "8px",
                            boxSizing: "border-box"
                        }}
                    />

                </div>


                {/* TABLE */}

                <div className="table-container">

                    <table>

                        <thead>

                            <tr>

                                <th>
                                    Date
                                </th>

                                <th>
                                    Vehicle No.
                                </th>

                                <th>
                                    Gross Wt.
                                </th>

                                <th>
                                    Tare Wt.
                                </th>

                                <th>
                                    Net Wt.
                                </th>

                                <th>
                                    Origin
                                </th>

                                <th>
                                    Commodity
                                </th>

                                <th>
                                    Remarks
                                </th>

                                <th>
                                    Actions
                                </th>

                            </tr>

                        </thead>


                        <tbody>

                            {loading &&
                            filteredVehicles.length === 0 ? (

                                <tr>

                                    <td
                                        colSpan="9"
                                        style={{
                                            textAlign: "center",
                                            padding: "30px"
                                        }}
                                    >
                                        Loading vehicle entries...
                                    </td>

                                </tr>

                            ) : filteredVehicles.length === 0 ? (

                                <tr>

                                    <td
                                        colSpan="9"
                                        style={{
                                            textAlign: "center",
                                            padding: "30px"
                                        }}
                                    >
                                        No vehicle entries found.
                                    </td>

                                </tr>

                            ) : (

                                filteredVehicles
                                    .slice()
                                    .reverse()
                                    .map((vehicle) => (

                                        <tr
                                            key={vehicle.id}
                                        >

                                            <td>
                                                {vehicle.date}
                                            </td>

                                            <td>

                                                <strong>
                                                    {
                                                        vehicle.vehicleNo
                                                    }
                                                </strong>

                                            </td>

                                            <td>
                                                {
                                                    vehicle.grossWeight
                                                }
                                            </td>

                                            <td>
                                                {
                                                    vehicle.tareWeight
                                                }
                                            </td>

                                            <td>

                                                <strong>
                                                    {
                                                        vehicle.netWeight ??
                                                        (
                                                            Number(
                                                                vehicle.grossWeight
                                                            ) -
                                                            Number(
                                                                vehicle.tareWeight
                                                            )
                                                        )
                                                    }
                                                </strong>

                                            </td>

                                            <td>

                                                {vehicle.local
                                                    ? "Local"
                                                    : vehicle.imported
                                                    ? "Imported"
                                                    : "-"}

                                            </td>

                                            <td>
                                                {
                                                    vehicle.commodity || "-"
                                                }
                                            </td>
                                            

                                            <td>
                                                {
                                                    vehicle.remarks || "-"
                                                }
                                            </td>

                                            <td>

                                                <div
                                                    style={{
                                                        display: "flex",
                                                        gap: "7px",
                                                        flexWrap: "wrap"
                                                    }}
                                                >

                                                    <button
                                                        type="button"
                                                        className="secondary-button"
                                                        onClick={() =>
                                                            handleEdit(
                                                                vehicle
                                                            )
                                                        }
                                                    >
                                                        Edit
                                                    </button>


                                                    <button
                                                        type="button"
                                                        className="danger-button"
                                                        onClick={() =>
                                                            handleDelete(
                                                                vehicle.id
                                                            )
                                                        }
                                                    >
                                                        Delete
                                                    </button>

                                                </div>

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

export default VehicleRegister;