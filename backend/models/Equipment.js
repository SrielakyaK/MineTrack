const mongoose = require("mongoose");

const equipmentSchema = new mongoose.Schema(
    {
        equipmentId: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },

        name: {
            type: String,
            required: true,
            trim: true
        },

        type: {
            type: String,
            required: true,
            trim: true
        },

        manufacturer: {
            type: String,
            trim: true
        },

        model: {
            type: String,
            trim: true
        },

        year: {
            type: Number
        },

        location: {
            type: String,
            trim: true
        },

        status: {
            type: String,
            enum: ["active", "maintenance", "inactive"],
            default: "active"
        },

        purchaseDate: {
            type: Date
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Equipment", equipmentSchema);