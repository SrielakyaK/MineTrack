const express = require("express");
const {
    createEquipment,
    getAllEquipment,
    updateEquipment,
    deleteEquipment
} = require("../controllers/equipmentController");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");

router.post("/", protect, authorize("admin"), createEquipment);

router.get("/", protect, getAllEquipment);

router.put("/:id", protect, authorize("admin", "maintenance"), updateEquipment);

router.delete("/:id", protect, authorize("admin"), deleteEquipment);
module.exports = router;