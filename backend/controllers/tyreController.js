const Tyre = require("../models/Tyre");

const createTyre = async (req, res) => {
    try {
        const tyre = await Tyre.create(req.body);

        res.status(201).json({
            message: "Tyre created successfully",
            tyre
        });
    } catch (error) {
        res.status(500).json({
            message: "Error creating tyre",
            error: error.message
        });
    }
};

const getAllTyres = async (req, res) => {
    try {
        const tyres = await Tyre.find();

        res.status(200).json(tyres);
    } catch (error) {
        res.status(500).json({
            message: "Error fetching tyres",
            error: error.message
        });
    }
};

const updateTyre = async (req, res) => {
    try {
        const tyre = await Tyre.findByIdAndUpdate(
            req.params.id,
            req.body,
            { returnDocument: "after", runValidators: true }
        );

        if (!tyre) {
            return res.status(404).json({
                message: "Tyre not found"
            });
        }

        res.status(200).json({
            message: "Tyre updated successfully",
            tyre
        });
    } catch (error) {
        res.status(500).json({
            message: "Error updating tyre",
            error: error.message
        });
    }
};

const deleteTyre = async (req, res) => {
    try {
        const tyre = await Tyre.findByIdAndDelete(req.params.id);

        if (!tyre) {
            return res.status(404).json({
                message: "Tyre not found"
            });
        }

        res.status(200).json({
            message: "Tyre deleted successfully"
        });
    } catch (error) {
        res.status(500).json({
            message: "Error deleting tyre",
            error: error.message
        });
    }
};

module.exports = {
    createTyre,
    getAllTyres,
    updateTyre,
    deleteTyre
};