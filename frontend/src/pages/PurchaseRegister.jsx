import { useEffect, useMemo, useState } from "react";
import axios from "axios";

const API_URL = "http://localhost:8090";

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
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function getEmptyForm() {
    return {
        date: getTodayDate(),
        netWeight: "",
        commodity: "",
        remarks: ""
    };
}

function PurchaseRegister() {

    const [purchases, setPurchases] = useState([]);
    const [form, setForm] = useState(getEmptyForm());
    const [search, setSearch] = useState("");
    const [editingId, setEditingId] = useState(null);

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    // =========================
    // LOAD PURCHASES
    // =========================

    async function loadPurchases() {

        try {

            setLoading(true);
            setError("");

            const response = await axios.get(
                `${API_URL}/api/purchases`,
                {
                    withCredentials: true
                }
            );

            if (Array.isArray(response.data)) {

                setPurchases(response.data);

            } else {

                setPurchases([]);

                setError(
                    "Unable to load purchase records."
                );
            }

        } catch (error) {

            console.error(
                "Purchase loading error:",
                error
            );

            setPurchases([]);

            if (error.response?.status === 401) {

                setError(
                    "Your login session has expired. Please login again."
                );

            } else if (error.response?.status === 403) {

                setError(
                    "You do not have permission to view purchase records."
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

    useEffect(() => {
        loadPurchases();
    }, []);

    // =========================
    // HANDLE INPUT
    // =========================

    function handleChange(event) {

        const {
            name,
            value
        } = event.target;

        setForm(previous => ({
            ...previous,
            [name]: value
        }));

    }

    // =========================
    // CLEAR FORM
    // =========================

    function clearForm() {

        setForm(getEmptyForm());

        setEditingId(null);

        setError("");
        setSuccess("");
    }

    // =========================
    // SAVE / UPDATE
    // =========================

    async function handleSubmit(event) {

        event.preventDefault();

        setError("");
        setSuccess("");

        const weight = Number(form.netWeight);

        if (!form.date) {

            setError("Please select a date.");
            return;
        }

        if (!weight || weight <= 0) {

            setError("Please enter a valid net weight.");
            return;
        }

        if (!form.commodity) {

            setError("Please select a commodity.");
            return;
        }

        const payload = {
            date: form.date,
            netWeight: weight,
            commodity: form.commodity,
            remarks: form.remarks.trim()
        };

        try {

            setSaving(true);

            if (editingId) {

                await axios.put(
                    `${API_URL}/api/purchases/${editingId}`,
                    payload,
                    {
                        withCredentials: true
                    }
                );

                setSuccess(
                    "Purchase entry updated successfully."
                );

            } else {

                await axios.post(
                    `${API_URL}/api/purchases`,
                    payload,
                    {
                        withCredentials: true
                    }
                );

                setSuccess(
                    "Purchase entry saved successfully."
                );
            }

            clearForm();

            await loadPurchases();

        } catch (error) {

            console.error(
                "Purchase save error:",
                error
            );

            if (error.response?.status === 401) {

                setError(
                    "Your login session has expired. Please login again."
                );

            } else if (error.response?.status === 403) {

                setError(
                    "You do not have permission to save purchase entries."
                );

            } else {

                setError(
                    error.response?.data?.message ||
                    "Unable to save purchase entry."
                );
            }

        } finally {

            setSaving(false);

        }
    }

    // =========================
    // EDIT
    // =========================

    function startEdit(purchase) {

        setEditingId(purchase.id);

        setForm({
            date: purchase.date || getTodayDate(),
            netWeight: purchase.netWeight ?? "",
            commodity: purchase.commodity || "",
            remarks: purchase.remarks || ""
        });

        setError("");
        setSuccess("");

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    }

    // =========================
    // DELETE
    // =========================

    async function deletePurchase(id) {

        const confirmed = window.confirm(
            "Are you sure you want to delete this purchase entry?"
        );

        if (!confirmed) {
            return;
        }

        try {

            setLoading(true);
            setError("");
            setSuccess("");

            await axios.delete(
                `${API_URL}/api/purchases/${id}`,
                {
                    withCredentials: true
                }
            );

            setSuccess(
                "Purchase entry deleted successfully."
            );

            await loadPurchases();

        } catch (error) {

            console.error(
                "Delete purchase error:",
                error
            );

            if (error.response?.status === 403) {

                setError(
                    "You do not have permission to delete purchase entries."
                );

            } else {

                setError(
                    "Unable to delete purchase entry."
                );
            }

        } finally {

            setLoading(false);

        }
    }

    // =========================
    // SEARCH
    // =========================

    const filteredPurchases = useMemo(() => {

        const query = search
            .toLowerCase()
            .trim();

        if (!query) {
            return purchases;
        }

        return purchases.filter(purchase => {

            return (

                String(
                    purchase.date || ""
                )
                    .toLowerCase()
                    .includes(query)

                ||

                String(
                    purchase.netWeight || ""
                )
                    .toLowerCase()
                    .includes(query)

                ||

                String(
                    purchase.commodity || ""
                )
                    .toLowerCase()
                    .includes(query)

                ||

                String(
                    purchase.remarks || ""
                )
                    .toLowerCase()
                    .includes(query)

            );

        });

    }, [purchases, search]);

    // =========================
    // SUMMARY
    // =========================

    const totalPurchaseWeight =
        filteredPurchases.reduce(
            (sum, purchase) =>
                sum +
                Number(
                    purchase.netWeight || 0
                ),
            0
        );

    // =========================
    // RENDER
    // =========================

    return (

        <div className="vehicle-page">

            {/* =========================
                PAGE HEADER
            ========================= */}

            <div className="page-header">

                <div>

                    <h1>
                        PURCHASE REGISTER
                    </h1>

                    <p>
                        Record and manage purchase entries
                    </p>

                </div>

                <button
                    type="button"
                    className="secondary-button"
                    onClick={loadPurchases}
                    disabled={loading || saving}
                >
                    {loading
                        ? "Loading..."
                        : "Refresh"}
                </button>

            </div>


            {/* =========================
                SUCCESS
            ========================= */}

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


            {/* =========================
                ERROR
            ========================= */}

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


            {/* =========================
                FORM CARD
            ========================= */}

            <div className="card">

                <div className="section-header">

                    <div>

                        <h2>
                            {editingId
                                ? "Edit Purchase Entry"
                                : "New Purchase Entry"}
                        </h2>

                        <p>
                            Enter purchase weight and commodity details
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


                    {/* NET WEIGHT */}

                    <div className="form-group">

                        <label>
                            Net Weight
                        </label>

                        <div
                            style={{
                                position: "relative"
                            }}
                        >

                            <input
                                type="number"
                                name="netWeight"
                                value={form.netWeight}
                                onChange={handleChange}
                                placeholder="Enter net weight"
                                min="0"
                                step="0.01"
                                required
                                style={{
                                    paddingRight: "55px"
                                }}
                            />

                            <span
                                style={{
                                    position: "absolute",
                                    right: "14px",
                                    top: "50%",
                                    transform: "translateY(-50%)",
                                    color: "#6b7280",
                                    fontSize: "12px",
                                    fontWeight: "600",
                                    pointerEvents: "none"
                                }}
                            >
                                KG
                            </span>

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
                                commodity => (

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
                            disabled={saving}
                        >

                            {saving
                                ? "Saving..."
                                : editingId
                                ? "Update Purchase"
                                : "Save Purchase"}

                        </button>


                        <button
                            type="button"
                            className="secondary-button"
                            onClick={clearForm}
                            disabled={saving}
                        >
                            Clear
                        </button>

                    </div>

                </form>

            </div>


            {/* =========================
                SUMMARY CARDS
            ========================= */}

            <div
                className="card"
                style={{
                    marginTop: "25px"
                }}
            >

                <div className="section-header">

                    <div>

                        <h2>
                            Purchase Summary
                        </h2>

                        <p>
                            Overview of the currently displayed purchase entries
                        </p>

                    </div>

                </div>


                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns:
                            "repeat(auto-fit, minmax(200px, 1fr))",
                        gap: "16px"
                    }}
                >

                    <div
                        style={{
                            padding: "20px",
                            border: "1px solid #e5e7eb",
                            borderRadius: "10px",
                            background: "#f8fafc"
                        }}
                    >

                        <div
                            style={{
                                color: "#6b7280",
                                fontSize: "13px",
                                marginBottom: "8px"
                            }}
                        >
                            Total Entries
                        </div>

                        <strong
                            style={{
                                fontSize: "26px",
                                color: "#1f2937"
                            }}
                        >
                            {filteredPurchases.length}
                        </strong>

                    </div>


                    <div
                        style={{
                            padding: "20px",
                            border: "1px solid #e5e7eb",
                            borderRadius: "10px",
                            background: "#f8fafc"
                        }}
                    >

                        <div
                            style={{
                                color: "#6b7280",
                                fontSize: "13px",
                                marginBottom: "8px"
                            }}
                        >
                            Total Net Weight
                        </div>

                        <strong
                            style={{
                                fontSize: "26px",
                                color: "#1f2937"
                            }}
                        >
                            {totalPurchaseWeight.toFixed(2)}
                            {" "}
                            <span
                                style={{
                                    fontSize: "14px",
                                    fontWeight: "600"
                                }}
                            >
                                KG
                            </span>
                        </strong>

                    </div>

                </div>

            </div>


            {/* =========================
                PURCHASE ENTRIES
            ========================= */}

            <div
                className="card"
                style={{
                    marginTop: "25px"
                }}
            >

                <div className="section-header">

                    <div>

                        <h2>
                            Purchase Entries
                        </h2>

                        <p>
                            {filteredPurchases.length} entries
                        </p>

                    </div>

                    <input
                        type="text"
                        value={search}
                        onChange={event =>
                            setSearch(event.target.value)
                        }
                        placeholder="Search purchase entries..."
                        style={{
                            width: "280px",
                            maxWidth: "100%",
                            padding: "10px 13px",
                            border: "1px solid #d5d9df",
                            borderRadius: "8px",
                            outline: "none",
                            boxSizing: "border-box"
                        }}
                    />

                </div>


                {loading ? (

                    <div
                        style={{
                            textAlign: "center",
                            padding: "35px",
                            color: "#6b7280"
                        }}
                    >
                        Loading purchase entries...
                    </div>

                ) : filteredPurchases.length === 0 ? (

                    <div
                        style={{
                            textAlign: "center",
                            padding: "35px",
                            color: "#6b7280"
                        }}
                    >
                        No purchase entries found.
                    </div>

                ) : (

                    <div className="table-container">

                        <table>

                            <thead>

                                <tr>

                                    <th>
                                        Date
                                    </th>

                                    <th>
                                        Net Weight
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

                                {filteredPurchases
                                    .slice()
                                    .reverse()
                                    .map(purchase => (

                                        <tr
                                            key={purchase.id}
                                        >

                                            <td>
                                                {purchase.date || "-"}
                                            </td>

                                            <td>

                                                <strong>
                                                    {Number(
                                                        purchase.netWeight || 0
                                                    ).toFixed(2)}
                                                    {" "}KG
                                                </strong>

                                            </td>

                                            <td>
                                                {purchase.commodity || "-"}
                                            </td>

                                            <td>
                                                {purchase.remarks || "-"}
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
                                                            startEdit(
                                                                purchase
                                                            )
                                                        }
                                                    >
                                                        Edit
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className="danger-button"
                                                        onClick={() =>
                                                            deletePurchase(
                                                                purchase.id
                                                            )
                                                        }
                                                    >
                                                        Delete
                                                    </button>

                                                </div>

                                            </td>

                                        </tr>

                                    ))}

                            </tbody>

                        </table>

                    </div>

                )}

            </div>

        </div>
    );
}

export default PurchaseRegister;