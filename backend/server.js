const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const equipmentRoutes = require("./routes/equipmentRoutes");
const tyreRoutes = require("./routes/tyreRoutes");
const maintenanceRoutes = require("./routes/maintenanceRoutes");
const sparePartRoutes = require("./routes/sparePartRoutes");
const alertRoutes = require("./routes/alertRoutes");

require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/equipment", equipmentRoutes);
app.use("/api/tyre", tyreRoutes);
app.use("/api/maintenance", maintenanceRoutes);
app.use("/api/spare-parts", sparePartRoutes);
app.use("/api/alerts", alertRoutes);

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log("MongoDB connected successfully");

        app.listen(process.env.PORT || 5000, () => {
            console.log(`Server running on port ${process.env.PORT || 5000}`);
        });
    })
    .catch((error) => {
        console.error("MongoDB connection failed:", error.message);
    });

app.get("/", (req, res) => {
    res.json({
        message: "Mining Equipment & Tyre Maintenance API is running"
    });
});