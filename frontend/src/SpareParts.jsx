
import React, { useEffect, useState } from "react";

const API_URL = "http://localhost:5000/api/spare-parts";

function SpareParts() {
    const [spareParts, setSpareParts] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [search, setSearch] = useState("");

    const [formData, setFormData] = useState({
        partId: "",
        partName: "",
        category: "",
        equipmentType: "",
        quantity: "",
        minimumStock: "",
        unitCost: "",
        supplier: "",
        location: "",
        status: "available",
        lastRestocked: "",
        notes: ""
    });

    const getAuthHeaders = () => {
        const token = localStorage.getItem("token");
        return {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        };
    };

    const fetchSpareParts = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(API_URL, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            const data = await response.json();
            setSpareParts(data.spareParts || []);
        } catch (error) {
            console.error("Error fetching spare parts:", error);
        }
    };

    useEffect(() => {
        fetchSpareParts();
    }, []);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const data = {
            ...formData,
            quantity: Number(formData.quantity),
            minimumStock: Number(formData.minimumStock),
            unitCost: formData.unitCost !== "" && formData.unitCost !== undefined ? Number(formData.unitCost) : undefined
        };

        try {
            const url = editingId ? `${API_URL}/${editingId}` : API_URL;
            const method = editingId ? "PUT" : "POST";
            const response = await fetch(url, {
                method,
                headers: getAuthHeaders(),
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const errData = await response.json();
                alert(errData.message || "Failed to save spare part");
                return;
            }

            resetForm();
            fetchSpareParts();
        } catch (error) {
            console.error("Error saving spare part:", error);
            alert("Network error saving spare part");
        }
    };

    const handleEdit = (part) => {
        setEditingId(part._id);

        setFormData({
            partId: part.partId || "",
            partName: part.partName || "",
            category: part.category || "",
            equipmentType: part.equipmentType || "",
            quantity: part.quantity ?? "",
            minimumStock: part.minimumStock ?? "",
            unitCost: part.unitCost ?? "",
            supplier: part.supplier || "",
            location: part.location || "",
            status: part.status || "available",
            lastRestocked: part.lastRestocked
                ? part.lastRestocked.substring(0, 10)
                : "",
            notes: part.notes || ""
        });

        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this spare part?")) {
            return;
        }

        try {
            const response = await fetch(`${API_URL}/${id}`, {
                method: "DELETE",
                headers: getAuthHeaders()
            });

            if (!response.ok) {
                const errData = await response.json();
                alert(errData.message || "Failed to delete spare part");
                return;
            }

            fetchSpareParts();
        } catch (error) {
            console.error("Error deleting spare part:", error);
            alert("Network error deleting spare part");
        }
    };

    const resetForm = () => {
        setFormData({
            partId: "",
            partName: "",
            category: "",
            equipmentType: "",
            quantity: "",
            minimumStock: "",
            unitCost: "",
            supplier: "",
            location: "",
            status: "available",
            lastRestocked: "",
            notes: ""
        });

        setEditingId(null);
        setShowForm(false);
    };

    const filteredParts = spareParts.filter((part) =>
        `${part.partId} ${part.partName} ${part.category} ${part.equipmentType}`
            .toLowerCase()
            .includes(search.toLowerCase())
    );

    return (
        <div className="spare-parts-page">
            <div className="spare-parts-header">
                <div>
                    <h1>Spare Parts Management</h1>
                    <p>Manage spare parts inventory and stock levels</p>
                </div>

                <button
                    className="add-part-btn"
                    onClick={() => setShowForm(true)}
                >
                    + Add Spare Part
                </button>
            </div>

            <div className="spare-parts-stats">
                <div className="stat-card">
                    <h3>{spareParts.length}</h3>
                    <p>Total Parts</p>
                </div>

                <div className="stat-card">
                    <h3>
                        {
                            spareParts.filter(
                                (part) => part.status === "available"
                            ).length
                        }
                    </h3>
                    <p>Available</p>
                </div>

                <div className="stat-card">
                    <h3>
                        {
                            spareParts.filter(
                                (part) => part.status === "low-stock"
                            ).length
                        }
                    </h3>
                    <p>Low Stock</p>
                </div>

                <div className="stat-card">
                    <h3>
                        {
                            spareParts.filter(
                                (part) => part.status === "out-of-stock"
                            ).length
                        }
                    </h3>
                    <p>Out of Stock</p>
                </div>
            </div>

            <div className="spare-parts-toolbar">
                <input
                    type="text"
                    placeholder="Search spare parts..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Part ID</th>
                            <th>Part Name</th>
                            <th>Category</th>
                            <th>Equipment</th>
                            <th>Quantity</th>
                            <th>Min Stock</th>
                            <th>Supplier</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>

                    <tbody>
                        {filteredParts.length > 0 ? (
                            filteredParts.map((part) => (
                                <tr key={part._id}>
                                    <td>{part.partId}</td>
                                    <td>{part.partName}</td>
                                    <td>{part.category}</td>
                                    <td>{part.equipmentType || "-"}</td>
                                    <td>{part.quantity}</td>
                                    <td>{part.minimumStock}</td>
                                    <td>{part.supplier || "-"}</td>

                                    <td>
                                        <span
                                            className={`status ${part.status}`}
                                        >
                                            {part.status}
                                        </span>
                                    </td>

                                    <td>
                                        <button
                                            className="edit-btn"
                                            onClick={() => handleEdit(part)}
                                        >
                                            Edit
                                        </button>

                                        <button
                                            className="delete-btn"
                                            onClick={() =>
                                                handleDelete(part._id)
                                            }
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="9" className="no-data">
                                    No spare parts found
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {showForm && (
                <div className="modal-overlay">
                    <div className="spare-part-modal">
                        <div className="modal-header">
                            <h2>
                                {editingId
                                    ? "Edit Spare Part"
                                    : "Add Spare Part"}
                            </h2>

                            <button onClick={resetForm}>×</button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="form-grid">
                                <div>
                                    <label>Part ID</label>
                                    <input
                                        name="partId"
                                        value={formData.partId}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>

                                <div>
                                    <label>Part Name</label>
                                    <input
                                        name="partName"
                                        value={formData.partName}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>

                                <div>
                                    <label>Category</label>
                                    <input
                                        name="category"
                                        value={formData.category}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>

                                <div>
                                    <label>Equipment Type</label>
                                    <input
                                        name="equipmentType"
                                        value={formData.equipmentType}
                                        onChange={handleChange}
                                    />
                                </div>

                                <div>
                                    <label>Quantity</label>
                                    <input
                                        type="number"
                                        name="quantity"
                                        value={formData.quantity}
                                        onChange={handleChange}
                                        min="0"
                                        required
                                    />
                                </div>

                                <div>
                                    <label>Minimum Stock</label>
                                    <input
                                        type="number"
                                        name="minimumStock"
                                        value={formData.minimumStock}
                                        onChange={handleChange}
                                        min="0"
                                        required
                                    />
                                </div>

                                <div>
                                    <label>Unit Cost</label>
                                    <input
                                        type="number"
                                        name="unitCost"
                                        value={formData.unitCost}
                                        onChange={handleChange}
                                        min="0"
                                    />
                                </div>

                                <div>
                                    <label>Supplier</label>
                                    <input
                                        name="supplier"
                                        value={formData.supplier}
                                        onChange={handleChange}
                                    />
                                </div>

                                <div>
                                    <label>Location</label>
                                    <input
                                        name="location"
                                        value={formData.location}
                                        onChange={handleChange}
                                    />
                                </div>

                                <div>
                                    <label>Status</label>
                                    <select
                                        name="status"
                                        value={formData.status}
                                        onChange={handleChange}
                                    >
                                        <option value="available">
                                            Available
                                        </option>
                                        <option value="low-stock">
                                            Low Stock
                                        </option>
                                        <option value="out-of-stock">
                                            Out of Stock
                                        </option>
                                    </select>
                                </div>

                                <div>
                                    <label>Last Restocked</label>
                                    <input
                                        type="date"
                                        name="lastRestocked"
                                        value={formData.lastRestocked}
                                        onChange={handleChange}
                                    />
                                </div>

                                <div>
                                    <label>Notes</label>
                                    <input
                                        name="notes"
                                        value={formData.notes}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>

                            <div className="form-actions">
                                <button
                                    type="button"
                                    className="cancel-btn"
                                    onClick={resetForm}
                                >
                                    Cancel
                                </button>

                                <button type="submit" className="save-btn">
                                    {editingId
                                        ? "Update Part"
                                        : "Save Part"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default SpareParts;

