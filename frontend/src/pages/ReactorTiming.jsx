import { useEffect, useState } from "react";
import axios from "axios";

function getTodayDate() {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function ReactorTiming() {

  const [timings, setTimings] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    date: getTodayDate(),
    reactor1Time: "",
    reactor2Time: ""
  });

  useEffect(() => {
    fetchTimings();
  }, []);

  async function fetchTimings() {
    try {
      setLoading(true);

      const response = await axios.get(
        "http://localhost:8090/api/reactor-timings",
        {
          withCredentials: true
        }
      );

      console.log("REACTOR API STATUS:", response.status);
      console.log("REACTOR API RESPONSE:", response.data);

      if (Array.isArray(response.data)) {
        setTimings(response.data);
      } else {
        console.error(
          "Expected an array but received:",
          response.data
        );
        setTimings([]);
      }

    } catch (error) {
      console.error("REACTOR API ERROR:", error);

      if (error.response) {
        console.error("STATUS:", error.response.status);
        console.error("DATA:", error.response.data);
      }

      setTimings([]);

      alert("Unable to load reactor timings.");

    } finally {
      setLoading(false);
    }
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value
    }));
  }

  function openAddForm() {
    setEditingId(null);

    setFormData({
      date: getTodayDate(),
      reactor1Time: "",
      reactor2Time: ""
    });

    setShowForm(true);
  }

  function openEditForm(timing) {

    setEditingId(timing.id);

    setFormData({
      date: timing.date,
      reactor1Time: timing.reactor1Time || "",
      reactor2Time: timing.reactor2Time || ""
    });

    setShowForm(true);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {

      const data = {
        date: formData.date,

        reactor1Time:
          formData.reactor1Time || null,

        reactor2Time:
          formData.reactor2Time || null
      };

      if (editingId) {

        await axios.put(
          `http://localhost:8090/api/reactor-timings/${editingId}`,
          data
        );

        alert("Reactor timing updated successfully!");

      } else {

        await axios.post(
          "http://localhost:8090/api/reactor-timings",
          data
        );

        alert("Reactor timing saved successfully!");
      }

      setShowForm(false);
      setEditingId(null);

      fetchTimings();

    } catch (error) {

      console.error(error);

      alert("Failed to save reactor timing.");
    }
  }

  async function deleteTiming(id) {

    const confirmed = window.confirm(
      "Are you sure you want to delete this reactor timing?"
    );

    if (!confirmed) {
      return;
    }

    try {

      await axios.delete(
        `http://localhost:8090/api/reactor-timings/${id}`
      );

      alert("Reactor timing deleted successfully!");

      fetchTimings();

    } catch (error) {

      console.error(error);

      alert("Failed to delete reactor timing.");
    }
  }

  return (
    <div className="vehicle-page">

      <div className="page-header">

        <div>
          <h1>Reactor Timing Register</h1>
          <p>Manage reactor timing records</p>
        </div>

        <button
          className="primary-button"
          onClick={openAddForm}
        >
          + Add Timing
        </button>

      </div>

      {showForm && (

        <div className="vehicle-form-container">

          <div className="form-header">

            <div>
              <h2>
                {editingId
                  ? "Edit Reactor Timing"
                  : "Add Reactor Timing"}
              </h2>

              <p>
                Enter reactor timing details
              </p>
            </div>

            <button
              type="button"
              className="close-button"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
              }}
            >
              ×
            </button>

          </div>

          <form onSubmit={handleSubmit}>

            <div className="form-grid">

              <div className="form-group">

                <label>Date</label>

                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  required
                />

              </div>

              <div className="form-group">

                <label>Reactor 1 Time</label>

                <input
                  type="time"
                  name="reactor1Time"
                  value={formData.reactor1Time}
                  onChange={handleChange}
                />

              </div>

              <div className="form-group">

                <label>Reactor 2 Time</label>

                <input
                  type="time"
                  name="reactor2Time"
                  value={formData.reactor2Time}
                  onChange={handleChange}
                />

              </div>

            </div>

            <div className="form-actions">

              <button
                type="button"
                className="cancel-button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="save-button"
              >
                {editingId
                  ? "Update Timing"
                  : "Save Timing"}
              </button>

            </div>

          </form>

        </div>
      )}

      {loading ? (

        <div className="loading-message">
          Loading reactor timings...
        </div>

      ) : (

        <div className="table-container">

          <table>

            <thead>

              <tr>
                <th>Date</th>
                <th>Reactor 1 Time</th>
                <th>Reactor 2 Time</th>
                <th>Actions</th>
              </tr>

            </thead>

            <tbody>

              {timings.length === 0 ? (

                <tr>

                  <td
                    colSpan="4"
                    style={{
                      textAlign: "center",
                      padding: "30px"
                    }}
                  >
                    No reactor timing records found.
                  </td>

                </tr>

              ) : (

                timings.map((timing) => (

                  <tr key={timing.id}>

                    <td>
                      {timing.date}
                    </td>

                    <td>
                      {timing.reactor1Time || "-"}
                    </td>

                    <td>
                      {timing.reactor2Time || "-"}
                    </td>

                    <td>

                      <button
                        type="button"
                        className="edit-button"
                        onClick={() =>
                          openEditForm(timing)
                        }
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        className="delete-button"
                        onClick={() =>
                          deleteTiming(timing.id)
                        }
                      >
                        Delete
                      </button>

                    </td>

                  </tr>

                ))

              )}

            </tbody>

          </table>

        </div>

      )}

    </div>
  );
}

export default ReactorTiming;