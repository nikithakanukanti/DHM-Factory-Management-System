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

const emptyForm = {
    date: new Date().toISOString().split("T")[0],
    netWeight: "",
    commodity: "",
    remarks: ""
};

function PurchaseRegister() {

    const [purchases, setPurchases] = useState([]);
    const [form, setForm] = useState(emptyForm);
    const [search, setSearch] = useState("");
    const [editingId, setEditingId] = useState(null);
    const [loading, setLoading] = useState(false);

    async function loadPurchases() {
        try {
            setLoading(true);

            const response = await axios.get(
                `${API_URL}/api/purchases`,
                {
                    withCredentials: true
                }
            );

            setPurchases(
                Array.isArray(response.data)
                    ? response.data
                    : []
            );

        } catch (error) {
            console.error("Purchase loading error:", error);
            setPurchases([]);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadPurchases();
    }, []);

    function handleChange(event) {
        const { name, value } = event.target;

        setForm(prev => ({
            ...prev,
            [name]: value
        }));
    }

    async function handleSubmit(event) {
        event.preventDefault();

        const weight = Number(form.netWeight);

        if (!form.date) {
            alert("Please select a date.");
            return;
        }

        if (!weight || weight <= 0) {
            alert("Please enter a valid net weight.");
            return;
        }

        if (!form.commodity) {
            alert("Please select a commodity.");
            return;
        }

        const payload = {
            date: form.date,
            netWeight: weight,
            commodity: form.commodity,
            remarks: form.remarks.trim()
        };

        try {

            if (editingId) {

                await axios.put(
                    `${API_URL}/api/purchases/${editingId}`,
                    payload,
                    {
                        withCredentials: true
                    }
                );

                alert("Purchase entry updated successfully.");

            } else {

                await axios.post(
                    `${API_URL}/api/purchases`,
                    payload,
                    {
                        withCredentials: true
                    }
                );

                alert("Purchase entry saved successfully.");
            }

            clearForm();
            loadPurchases();

        } catch (error) {

            console.error("Purchase save error:", error);

            alert(
                error.response?.data?.message ||
                "Unable to save purchase entry."
            );
        }
    }

    function startEdit(purchase) {

        setEditingId(purchase.id);

        setForm({
            date: purchase.date || "",
            netWeight: purchase.netWeight || "",
            commodity: purchase.commodity || "",
            remarks: purchase.remarks || ""
        });

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    }

    async function deletePurchase(id) {

        const confirmed = window.confirm(
            "Are you sure you want to delete this purchase entry?"
        );

        if (!confirmed) {
            return;
        }

        try {

            await axios.delete(
                `${API_URL}/api/purchases/${id}`,
                {
                    withCredentials: true
                }
            );

            loadPurchases();

        } catch (error) {

            console.error("Delete purchase error:", error);

            alert("Unable to delete purchase entry.");
        }
    }

    function clearForm() {

        setForm({
            ...emptyForm,
            date: new Date().toISOString().split("T")[0]
        });

        setEditingId(null);
    }

    const filteredPurchases = useMemo(() => {

        const query = search.toLowerCase().trim();

        if (!query) {
            return purchases;
        }

        return purchases.filter(purchase =>
            String(purchase.date || "")
                .toLowerCase()
                .includes(query) ||

            String(purchase.commodity || "")
                .toLowerCase()
                .includes(query) ||

            String(purchase.remarks || "")
                .toLowerCase()
                .includes(query)
        );

    }, [purchases, search]);

    const totalPurchaseWeight = filteredPurchases.reduce(
        (sum, purchase) =>
            sum + Number(purchase.netWeight || 0),
        0
    );

    return (
        <div className="vehicle-page">

            {/* PAGE HEADER */}

            <div className="vehicle-page-header">

                <div>
                    <h1>Purchase Register</h1>

                    <p>
                        Record and manage purchase entries
                    </p>
                </div>

                <button
                    className="secondary-button"
                    onClick={loadPurchases}
                >
                    Refresh
                </button>

            </div>


            {/* FORM */}

            <div className="register-card">

                <div className="register-card-header">

                    <h2>
                        {editingId
                            ? "Edit Purchase Entry"
                            : "New Purchase Entry"}
                    </h2>

                    <p>
                        Enter purchase weight and commodity details
                    </p>

                </div>


                <form
                    className="vehicle-form"
                    onSubmit={handleSubmit}
                >

                    <div className="form-grid">

                        {/* DATE */}

                        <div className="form-group">

                            <label>Date</label>

                            <input
                                type="date"
                                name="date"
                                value={form.date}
                                onChange={handleChange}
                            />

                        </div>


                        {/* NET WEIGHT */}

                        <div className="form-group">

                            <label>Net Weight</label>

                            <div className="weight-field">

                                <input
                                    type="number"
                                    name="netWeight"
                                    min="0"
                                    step="0.01"
                                    placeholder="Enter net weight"
                                    value={form.netWeight}
                                    onChange={handleChange}
                                />

                                <span className="weight-unit">
                                    KG
                                </span>

                            </div>

                        </div>


                        {/* COMMODITY */}

                        <div className="form-group">

                            <label>Commodity</label>

                            <select
                                name="commodity"
                                value={form.commodity}
                                onChange={handleChange}
                            >

                                <option value="">
                                    Select commodity
                                </option>

                                {commodities.map(item => (
                                    <option
                                        key={item}
                                        value={item}
                                    >
                                        {item}
                                    </option>
                                ))}

                            </select>

                        </div>


                        {/* REMARKS */}

                        <div className="form-group full-width">

                            <label>Remarks</label>

                            <textarea
                                name="remarks"
                                placeholder="Enter remarks"
                                value={form.remarks}
                                onChange={handleChange}
                            />

                        </div>

                    </div>


                    {/* BUTTONS */}

                    <div 
                    style={{
                            gridColumn: "1 / -1",
                            display: "flex",
                            gap: "10px",
                            flexWrap: "wrap"
                        }}>

                        <button
                            type="submit"
                            className="primary-button"
                        >
                            {editingId
                                ? "Update Purchase"
                                : "Save Purchase"}
                        </button>

                        <button
                            type="button"
                            className="secondary-button"
                            onClick={clearForm}
                        >
                            Clear
                        </button>

                    </div>

                </form>

            </div>


            {/* SUMMARY */}

            <div className="dashboard-section">

                <h2>Purchase Summary</h2>

                <div className="summary-grid">

                    <div className="summary-box">

                        <span>
                            Total Entries
                        </span>

                        <strong>
                            {filteredPurchases.length}
                        </strong>

                    </div>


                    <div className="summary-box">

                        <span>
                            Total Net Weight
                        </span>

                        <strong>
                            {totalPurchaseWeight.toFixed(2)} KG
                        </strong>

                    </div>

                </div>

            </div>


            {/* TABLE */}

            <div className="entries-card">

                <div className="entries-header">

                    <div>

                        <h2>
                            Purchase Entries
                        </h2>

                        <p
                            style={{
                                color: "#6b7280",
                                fontSize: "14px",
                                marginTop: "5px"
                            }}
                        >
                            {filteredPurchases.length} entries
                        </p>

                    </div>

                    <input
                        className="search-box"
                        type="text"
                        placeholder="Search commodity, date, remarks..."
                        value={search}
                        onChange={event =>
                            setSearch(event.target.value)
                        }
                    />

                </div>


                {loading ? (

                    <div className="loading">
                        Loading purchase entries...
                    </div>

                ) : filteredPurchases.length === 0 ? (

                    <div className="empty-state">
                        No purchase entries found.
                    </div>

                ) : (

                    <div className="table-container">

                        <table>

                            <thead>

                                <tr>
                                    <th>Date</th>
                                    <th>Net Weight</th>
                                    <th>Commodity</th>
                                    <th>Remarks</th>
                                    <th>Actions</th>
                                </tr>

                            </thead>

                            <tbody>

                                {filteredPurchases.map(purchase => (

                                    <tr key={purchase.id}>

                                        <td>
                                            {purchase.date || "-"}
                                        </td>

                                        <td>
                                            <strong>
                                                {purchase.netWeight || 0} KG
                                            </strong>
                                        </td>

                                        <td>
                                            {purchase.commodity || "-"}
                                        </td>

                                        <td>
                                            {purchase.remarks || "-"}
                                        </td>

                                        <td>

                                            <div className="action-buttons">

                                                <button
                                                    className="btn-edit"
                                                    onClick={() =>
                                                        startEdit(purchase)
                                                    }
                                                >
                                                    Edit
                                                </button>

                                                <button
                                                    className="btn-delete"
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