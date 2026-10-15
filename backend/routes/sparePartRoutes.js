const express = require("express");
const router = express.Router();
const SparePart = require("../models/sparePart");
const { protect, authorize } = require("../middleware/authMiddleware");

/**
 * Determine stock status from quantity and minimumStock.
 * - quantity <= 0  → "out-of-stock"
 * - quantity > 0 && quantity <= minimumStock → "low-stock"
 * - otherwise → "available"
 */
function computeStatus(quantity, minimumStock) {
    const qty = Number(quantity);
    const min = Number(minimumStock);
    if (isNaN(qty) || qty <= 0) return "out-of-stock";
    if (!isNaN(min) && min > 0 && qty <= min) return "low-stock";
    return "available";
}

// Create a spare part (admin and maintenance)
router.post("/", protect, authorize("admin", "maintenance"), async (req, res) => {
    try {
        const body = req.body;

        if (!body.partId || !String(body.partId).trim()) {
            return res.status(400).json({ message: "Part ID is required" });
        }
        if (!body.partName || !String(body.partName).trim()) {
            return res.status(400).json({ message: "Part Name is required" });
        }
        if (!body.category || !String(body.category).trim()) {
            return res.status(400).json({ message: "Category is required" });
        }

        const qty = Number(body.quantity ?? 0);
        const min = Number(body.minimumStock ?? 0);

        if (isNaN(qty) || qty < 0) {
            return res.status(400).json({ message: "Quantity must be a non-negative number" });
        }
        if (isNaN(min) || min < 0) {
            return res.status(400).json({ message: "Minimum stock must be a non-negative number" });
        }
        if (body.unitCost !== undefined && body.unitCost !== null && body.unitCost !== "") {
            const cost = Number(body.unitCost);
            if (isNaN(cost) || cost < 0) {
                return res.status(400).json({ message: "Unit cost must be a non-negative number" });
            }
            body.unitCost = cost;
        }

        const trimmedPartId = String(body.partId).trim();
        const existingPart = await SparePart.findOne({
            partId: { $regex: new RegExp(`^${trimmedPartId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i") }
        });
        if (existingPart) {
            return res.status(400).json({
                message: `A spare part with Part ID "${trimmedPartId}" already exists`
            });
        }

        body.partId = trimmedPartId;
        body.partName = String(body.partName).trim();
        body.category = String(body.category).trim();
        body.quantity = qty;
        body.minimumStock = min;
        body.status = computeStatus(qty, min);

        const sparePart = new SparePart(body);
        const savedPart = await sparePart.save();

        res.status(201).json({
            message: "Spare part created successfully",
            sparePart: savedPart
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({
                message: "A spare part with this Part ID already exists",
                error: error.message
            });
        }
        res.status(400).json({
            message: "Failed to create spare part",
            error: error.message
        });
    }
});

// Get all spare parts (any authenticated user)
router.get("/", protect, async (req, res) => {
    try {
        const { category, equipmentType, status, search } = req.query;
        const filter = {};

        if (category && category !== "all") filter.category = { $regex: category, $options: "i" };
        if (equipmentType && equipmentType !== "all") filter.equipmentType = { $regex: equipmentType, $options: "i" };
        if (status && status !== "all") filter.status = status;
        if (search) {
            filter.$or = [
                { partId: { $regex: search, $options: "i" } },
                { partName: { $regex: search, $options: "i" } },
                { category: { $regex: search, $options: "i" } },
                { supplier: { $regex: search, $options: "i" } },
                { equipmentType: { $regex: search, $options: "i" } },
                { location: { $regex: search, $options: "i" } }
            ];
        }

        const spareParts = await SparePart.find(filter).sort({ createdAt: -1 });

        res.status(200).json({
            count: spareParts.length,
            spareParts
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch spare parts",
            error: error.message
        });
    }
});

// Get a single spare part
router.get("/:id", protect, async (req, res) => {
    try {
        const sparePart = await SparePart.findById(req.params.id);

        if (!sparePart) {
            return res.status(404).json({
                message: "Spare part not found"
            });
        }

        res.status(200).json(sparePart);
    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch spare part",
            error: error.message
        });
    }
});

// Update a spare part (admin and maintenance)
router.put("/:id", protect, authorize("admin", "maintenance"), async (req, res) => {
    try {
        const body = req.body;
        const existing = await SparePart.findById(req.params.id);
        if (!existing) {
            return res.status(404).json({ message: "Spare part not found" });
        }

        if (body.quantity !== undefined && body.quantity !== null && body.quantity !== "") {
            const qty = Number(body.quantity);
            if (isNaN(qty) || qty < 0) {
                return res.status(400).json({ message: "Quantity must be a non-negative number" });
            }
            body.quantity = qty;
        }

        if (body.minimumStock !== undefined && body.minimumStock !== null && body.minimumStock !== "") {
            const min = Number(body.minimumStock);
            if (isNaN(min) || min < 0) {
                return res.status(400).json({ message: "Minimum stock must be a non-negative number" });
            }
            body.minimumStock = min;
        }

        if (body.unitCost !== undefined && body.unitCost !== null && body.unitCost !== "") {
            const cost = Number(body.unitCost);
            if (isNaN(cost) || cost < 0) {
                return res.status(400).json({ message: "Unit cost must be a non-negative number" });
            }
            body.unitCost = cost;
        }

        if (body.partId) {
            const trimmed = String(body.partId).trim();
            const clash = await SparePart.findOne({
                _id: { $ne: req.params.id },
                partId: { $regex: new RegExp(`^${trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i") }
            });
            if (clash) {
                return res.status(400).json({
                    message: `A spare part with Part ID "${trimmed}" already exists`
                });
            }
            body.partId = trimmed;
        }

        const finalQty = body.quantity !== undefined ? Number(body.quantity) : existing.quantity;
        const finalMin = body.minimumStock !== undefined ? Number(body.minimumStock) : existing.minimumStock;
        body.status = computeStatus(finalQty, finalMin);

        const sparePart = await SparePart.findByIdAndUpdate(
            req.params.id,
            body,
            {
                returnDocument: "after",
                runValidators: true
            }
        );

        res.status(200).json({
            message: "Spare part updated successfully",
            sparePart
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({
                message: "A spare part with this Part ID already exists",
                error: error.message
            });
        }
        res.status(400).json({
            message: "Failed to update spare part",
            error: error.message
        });
    }
});

// Delete a spare part (admin only)
router.delete("/:id", protect, authorize("admin"), async (req, res) => {
    try {
        const sparePart = await SparePart.findByIdAndDelete(req.params.id);

        if (!sparePart) {
            return res.status(404).json({
                message: "Spare part not found"
            });
        }

        res.status(200).json({
            message: "Spare part deleted successfully"
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to delete spare part",
            error: error.message
        });
    }
});

module.exports = router;