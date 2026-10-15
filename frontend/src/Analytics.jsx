import { useEffect, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from "recharts";

const API = "https://minetrack-wl9n.onrender.com/api";

function Analytics() {
  const [equipment, setEquipment] = useState([]);
  const [tyres, setTyres] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [spareParts, setSpareParts] = useState([]);

  const getToken = () => localStorage.getItem("token");

  const fetchData = async (endpoint, setter) => {
    try {
      const response = await fetch(`${API}/${endpoint}`, {
        headers: {
          Authorization: `Bearer ${getToken()}`
        }
      });

      const data = await response.json();

      if (Array.isArray(data)) {
        setter(data);
      } else if (Array.isArray(data.equipment)) {
        setter(data.equipment);
      } else if (Array.isArray(data.tyres)) {
        setter(data.tyres);
      } else if (Array.isArray(data.tyre)) {
        setter(data.tyre);
      } else if (Array.isArray(data.maintenance)) {
        setter(data.maintenance);
      } else if (Array.isArray(data.spareParts)) {
        setter(data.spareParts);
      } else if (Array.isArray(data.data)) {
        setter(data.data);
      }
    } catch (error) {
      console.error(`Error fetching ${endpoint}:`, error);
    }
  };

  useEffect(() => {
    fetchData("equipment", setEquipment);
    fetchData("tyre", setTyres);
    fetchData("maintenance", setMaintenance);
    fetchData("spare-parts", setSpareParts);
  }, []);

  const getStatusData = (items, field = "status") => {
    const counts = {};

    items.forEach((item) => {
      const status = item[field] || "unknown";
      counts[status] = (counts[status] || 0) + 1;
    });

    return Object.entries(counts).map(([name, value]) => ({
      name,
      value
    }));
  };

  const equipmentStatus = getStatusData(equipment);
  const tyreStatus = getStatusData(tyres);
  const maintenanceStatus = getStatusData(maintenance);

  const equipmentTypes = {};

  equipment.forEach((item) => {
    const type = item.type || "Unknown";
    equipmentTypes[type] = (equipmentTypes[type] || 0) + 1;
  });

  const equipmentTypeData = Object.entries(equipmentTypes).map(
    ([name, count]) => ({
      name,
      count
    })
  );

  const inventoryData = spareParts.map((part) => ({
    name: part.partName || part.name || part.partId || "Part",
    quantity: Number(part.quantity || 0),
    minimum: Number(part.minimumStock || 0)
  }));

  const totalEquipment = equipment.length;
  const totalTyres = tyres.length;
  const totalMaintenance = maintenance.length;
  const totalParts = spareParts.length;

  const totalMaintenanceCost = maintenance.reduce(
    (total, item) =>
      total +
      Number(
        item.cost ||
        item.maintenanceCost ||
        item.totalCost ||
        0
      ),
    0
  );

  const COLORS = [
    "#A61C3C",
    "#1B1B52",
    "#D97706",
    "#15803D",
    "#7C3AED",
    "#0891B2"
  ];

  return (
    <div className="analytics-page">
      <div className="analytics-header">
        <div>
          <h1>Reports & Analytics</h1>
          <p>
            Monitor equipment, tyre, maintenance and inventory performance.
          </p>
        </div>
      </div>

      <div className="analytics-cards">
        <div className="analytics-card">
          <span>Total Equipment</span>
          <strong>{totalEquipment}</strong>
        </div>

        <div className="analytics-card">
          <span>Total Tyres</span>
          <strong>{totalTyres}</strong>
        </div>

        <div className="analytics-card">
          <span>Maintenance Records</span>
          <strong>{totalMaintenance}</strong>
        </div>

        <div className="analytics-card">
          <span>Spare Parts</span>
          <strong>{totalParts}</strong>
        </div>

        <div className="analytics-card">
          <span>Maintenance Cost</span>
          <strong>
            ₹{totalMaintenanceCost.toLocaleString("en-IN")}
          </strong>
        </div>
      </div>

      <div className="analytics-grid">

        <div className="chart-card">
          <h2>Equipment Status</h2>

          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={equipmentStatus}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label
              >
                {equipmentStatus.map((entry, index) => (
                  <Cell
                    key={`equipment-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>

              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h2>Tyre Status</h2>

          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={tyreStatus}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label
              >
                {tyreStatus.map((entry, index) => (
                  <Cell
                    key={`tyre-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>

              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h2>Equipment by Type</h2>

          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={equipmentTypeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />

              <Bar
                dataKey="count"
                fill="#A61C3C"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h2>Maintenance Status</h2>

          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={maintenanceStatus}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label
              >
                {maintenanceStatus.map((entry, index) => (
                  <Cell
                    key={`maintenance-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>

              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card inventory-chart">
          <h2>Spare Parts Stock</h2>

          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={inventoryData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />

              <Bar
                dataKey="quantity"
                name="Current Stock"
                fill="#1B1B52"
              />

              <Bar
                dataKey="minimum"
                name="Minimum Required"
                fill="#D97706"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

      </div>
    </div>
  );
}

export default Analytics;