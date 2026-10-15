const express = require("express");

const {
    createTyre,
    getAllTyres,
    updateTyre,
    deleteTyre
} = require("../controllers/tyreController");

const { protect, authorize } = require("../middleware/authMiddleware");
const router = express.Router();

router.post("/", protect, authorize("admin", "maintenance"), createTyre);
router.get("/", protect, getAllTyres);
router.put("/:id", protect, authorize("admin", "maintenance"), updateTyre);
router.delete("/:id", protect, authorize("admin"), deleteTyre);

module.exports = router;