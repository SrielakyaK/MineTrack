const Equipment = require("../models/Equipment");

const createEquipment = async (req, res) => {
    try {
        const equipment = await Equipment.create(req.body);

        res.status(201).json({
            message: "Equipment created successfully",
            equipment
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to create equipment",
            error: error.message
        });
    }
};

const getAllEquipment = async (req, res) => {
    try {
        const equipment = await Equipment.find().sort({ createdAt: -1 });

        res.status(200).json({
            count: equipment.length,
            equipment
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch equipment",
            error: error.message
        });
    }
};

const updateEquipment = async (req, res) => {
    try {
        const equipment = await Equipment.findByIdAndUpdate(
            req.params.id,
            req.body,
            {
                returnDocument: "after",
                runValidators: true
            }
        );

        if (!equipment) {
            return res.status(404).json({
                message: "Equipment not found"
            });
        }

        res.status(200).json({
            message: "Equipment updated successfully",
            equipment
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to update equipment",
            error: error.message
        });
    }
};

const deleteEquipment = async (req, res) => {
    try {
        const equipment = await Equipment.findByIdAndDelete(req.params.id);

        if (!equipment) {
            return res.status(404).json({
                message: "Equipment not found"
            });
        }

        res.status(200).json({
            message: "Equipment deleted successfully"
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to delete equipment",
            error: error.message
        });
    }
};

module.exports = {
    createEquipment,
    getAllEquipment,
    updateEquipment,
    deleteEquipment
};