const Maintenance = require("../models/Maintenance");

const createMaintenance = async (req, res) => {
    try {
        const maintenance = await Maintenance.create(req.body);

        res.status(201).json({
            message: "Maintenance record created successfully",
            maintenance
        });
    } catch (error) {
    console.error("CREATE MAINTENANCE ERROR:", error);
    res.status(500).json({
        message: "Error creating maintenance record",
        error: error.message
    });
}
};

const getAllMaintenance = async (req, res) => {
    try {
        const maintenance = await Maintenance.find();

        res.status(200).json(maintenance);
    } catch (error) {
        res.status(500).json({
            message: "Error fetching maintenance records",
            error: error.message
        });
    }
};

const getMaintenanceById = async (req, res) => {
    try {
        const maintenance = await Maintenance.findById(req.params.id);

        if (!maintenance) {
            return res.status(404).json({
                message: "Maintenance record not found"
            });
        }

        res.status(200).json(maintenance);
    } catch (error) {
        res.status(500).json({
            message: "Error fetching maintenance record",
            error: error.message
        });
    }
};

const updateMaintenance = async (req, res) => {
    try {
        const maintenance = await Maintenance.findByIdAndUpdate(
            req.params.id,
            req.body,
            { returnDocument: "after", runValidators: true }
        );

        if (!maintenance) {
            return res.status(404).json({
                message: "Maintenance record not found"
            });
        }

        res.status(200).json({
            message: "Maintenance record updated successfully",
            maintenance
        });
    } catch (error) {
        res.status(500).json({
            message: "Error updating maintenance record",
            error: error.message
        });
    }
};

const deleteMaintenance = async (req, res) => {
    try {
        const maintenance = await Maintenance.findByIdAndDelete(req.params.id);

        if (!maintenance) {
            return res.status(404).json({
                message: "Maintenance record not found"
            });
        }

        res.status(200).json({
            message: "Maintenance record deleted successfully"
        });
    } catch (error) {
        res.status(500).json({
            message: "Error deleting maintenance record",
            error: error.message
        });
    }
};

module.exports = {
    createMaintenance,
    getAllMaintenance,
    getMaintenanceById,
    updateMaintenance,
    deleteMaintenance
};