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
    vehicleNo: "",
    grossWeight: "",
    tareWeight: "",
    commodity: "",
    remarks: ""
};

function SalesRegister() {

    const [sales, setSales] = useState([]);
    const [form, setForm] = useState(emptyForm);
    const [search, setSearch] = useState("");
    const [editingId, setEditingId] = useState(null);
    const [loading, setLoading] = useState(false);

    async function loadSales() {
        try {
            setLoading(true);

            const response = await axios.get(
                `${API_URL}/api/sales`,
                {
                    withCredentials: true
                }
            );

            setSales(
                Array.isArray(response.data)
                    ? response.data
                    : []
            );

        } catch (error) {
            console.error("Sales loading error:", error);
            setSales([]);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadSales();
    }, []);

    function handleChange(event) {
        const { name, value } = event.target;

        setForm(prev => ({
            ...prev,
            [name]: value
        }));
    }

    const gross = Number(form.grossWeight) || 0;
    const tare = Number(form.tareWeight) || 0;
    const netWeight = Math.max(gross - tare, 0);

    async function handleSubmit(event) {
        event.preventDefault();

        if (!form.date) {
            alert("Please select a date.");
            return;
        }

        if (!form.vehicleNo.trim()) {
            alert("Please enter vehicle number.");
            return;
        }

        if (gross <= 0) {
            alert("Please enter gross weight.");
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

        const payload = {
            date: form.date,
            vehicleNo: form.vehicleNo.trim(),
            grossWeight: gross,
            tareWeight: tare,
            commodity: form.commodity,
            remarks: form.remarks.trim()
        };

        try {

            if (editingId) {

                await axios.put(
                    `${API_URL}/api/sales/${editingId}`,
                    payload,
                    {
                        withCredentials: true
                    }
                );

                alert("Sales entry updated successfully.");

            } else {

                await axios.post(
                    `${API_URL}/api/sales`,
                    payload,
                    {
                        withCredentials: true
                    }
                );

                alert("Sales entry saved successfully.");
            }

            clearForm();
            loadSales();

        } catch (error) {

            console.error("Sales save error:", error);

            alert(
                error.response?.data?.message ||
                "Unable to save sales entry."
            );
        }
    }

    function startEdit(sale) {

        setEditingId(sale.id);

        setForm({
            date: sale.date || "",
            vehicleNo: sale.vehicleNo || "",
            grossWeight: sale.grossWeight || "",
            tareWeight: sale.tareWeight || "",
            commodity: sale.commodity || "",
            remarks: sale.remarks || ""
        });

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    }

    async function deleteSale(id) {

        const confirmed = window.confirm(
            "Are you sure you want to delete this sales entry?"
        );

        if (!confirmed) {
            return;
        }

        try {

            await axios.delete(
                `${API_URL}/api/sales/${id}`,
                {
                    withCredentials: true
                }
            );

            loadSales();

        } catch (error) {

            console.error("Delete sales error:", error);

            alert("Unable to delete sales entry.");
        }
    }

    function clearForm() {

        setForm({
            ...emptyForm,
            date: new Date().toISOString().split("T")[0]
        });

        setEditingId(null);
    }

    const filteredSales = useMemo(() => {

        const query = search.toLowerCase().trim();

        if (!query) {
            return sales;
        }

        return sales.filter(sale =>
            String(sale.vehicleNo || "")
                .toLowerCase()
                .includes(query) ||

            String(sale.commodity || "")
                .toLowerCase()
                .includes(query) ||

            String(sale.date || "")
                .toLowerCase()
                .includes(query) ||

            String(sale.remarks || "")
                .toLowerCase()
                .includes(query)
        );

    }, [sales, search]);

    return (
        <div className="vehicle-page">

            {/* PAGE HEADER */}

            <div className="vehicle-page-header">

                <div>
                    <h1>Sales Register</h1>

                    <p>
                        Record and manage sales vehicle entries
                    </p>
                </div>

                <button
                    className="secondary-button"
                    onClick={loadSales}
                >
                    Refresh
                </button>

            </div>


            {/* FORM */}

            <div className="register-card">

                <div className="register-card-header">

                    <h2>
                        {editingId
                            ? "Edit Sales Entry"
                            : "New Sales Entry"}
                    </h2>

                    <p>
                        Enter vehicle, weight and commodity details
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


                        {/* VEHICLE */}

                        <div className="form-group">

                            <label>Vehicle No.</label>

                            <input
                                type="text"
                                name="vehicleNo"
                                placeholder="Enter vehicle number"
                                value={form.vehicleNo}
                                onChange={handleChange}
                            />

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


                        {/* GROSS */}

                        <div className="form-group">

                            <label>Gross Weight</label>

                            <div className="weight-field">

                                <input
                                    type="number"
                                    name="grossWeight"
                                    min="0"
                                    step="0.01"
                                    placeholder="0"
                                    value={form.grossWeight}
                                    onChange={handleChange}
                                />

                                <span className="weight-unit">
                                    KG
                                </span>

                            </div>

                        </div>


                        {/* TARE */}

                        <div className="form-group">

                            <label>Tare Weight</label>

                            <div className="weight-field">

                                <input
                                    type="number"
                                    name="tareWeight"
                                    min="0"
                                    step="0.01"
                                    placeholder="0"
                                    value={form.tareWeight}
                                    onChange={handleChange}
                                />

                                <span className="weight-unit">
                                    KG
                                </span>

                            </div>

                        </div>


                        {/* NET */}

                        <div className="form-group">

                            <label>Net Weight</label>

                            <div className="net-weight-box">

                                <span className="net-weight-label">
                                    Gross Weight − Tare Weight
                                </span>

                                <span className="net-weight-value">
                                    {netWeight.toFixed(2)} KG
                                </span>

                            </div>

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
                        }}
                        >

                        <button
                            type="submit"
                            className="primary-button"
                        >
                            {editingId
                                ? "Update Sale"
                                : "Save Sale"}
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


            {/* TABLE */}

            <div className="entries-card">

                <div className="entries-header">

                    <div>
                        <h2>Sales Entries</h2>

                        <p style={{
                            color: "#6b7280",
                            fontSize: "14px",
                            marginTop: "5px"
                        }}>
                            {filteredSales.length} entries
                        </p>
                    </div>

                    <input
                        className="search-box"
                        type="text"
                        placeholder="Search vehicle, commodity, date..."
                        value={search}
                        onChange={event =>
                            setSearch(event.target.value)
                        }
                    />

                </div>


                {loading ? (

                    <div className="loading">
                        Loading sales entries...
                    </div>

                ) : filteredSales.length === 0 ? (

                    <div className="empty-state">
                        No sales entries found.
                    </div>

                ) : (

                    <div className="table-container">

                        <table>

                            <thead>

                                <tr>
                                    <th>Date</th>
                                    <th>Vehicle No.</th>
                                    <th>Gross Wt.</th>
                                    <th>Tare Wt.</th>
                                    <th>Net Wt.</th>
                                    <th>Commodity</th>
                                    <th>Remarks</th>
                                    <th>Actions</th>
                                </tr>

                            </thead>

                            <tbody>

                                {filteredSales.map(sale => (

                                    <tr key={sale.id}>

                                        <td>
                                            {sale.date || "-"}
                                        </td>

                                        <td>
                                            <strong>
                                                {sale.vehicleNo || "-"}
                                            </strong>
                                        </td>

                                        <td>
                                            {sale.grossWeight || 0}
                                        </td>

                                        <td>
                                            {sale.tareWeight || 0}
                                        </td>

                                        <td>
                                            <strong>
                                                {sale.netWeight ||
                                                    (
                                                        Number(
                                                            sale.grossWeight || 0
                                                        ) -
                                                        Number(
                                                            sale.tareWeight || 0
                                                        )
                                                    ).toFixed(2)}
                                            </strong>
                                        </td>

                                        <td>
                                            {sale.commodity || "-"}
                                        </td>

                                        <td>
                                            {sale.remarks || "-"}
                                        </td>

                                        <td>

                                            <div className="action-buttons">

                                                <button
                                                    className="btn-edit"
                                                    onClick={() =>
                                                        startEdit(sale)
                                                    }
                                                >
                                                    Edit
                                                </button>

                                                <button
                                                    className="btn-delete"
                                                    onClick={() =>
                                                        deleteSale(sale.id)
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

export default SalesRegister;