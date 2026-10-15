const express = require("express");

const {
    createMaintenance,
    getAllMaintenance,
    getMaintenanceById,
    updateMaintenance,
    deleteMaintenance
} = require("../controllers/maintenanceController");

const { protect, authorize } = require("../middleware/authMiddleware");
const router = express.Router();

router.post("/", protect, authorize("admin", "maintenance"), createMaintenance);
router.get("/", protect, getAllMaintenance);
router.get("/:id", protect, getMaintenanceById);
router.put("/:id", protect, authorize("admin", "maintenance"), updateMaintenance);
router.delete("/:id", protect, authorize("admin"), deleteMaintenance);

module.exports = router;