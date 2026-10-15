const mongoose = require("mongoose");

const tyreSchema = new mongoose.Schema(
    {
        tyreId: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },

        tyreNumber: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },

        equipmentId: {
            type: String,
            required: true,
            trim: true
        },

        brand: {
            type: String,
            required: true,
            trim: true
        },

        size: {
            type: String,
            required: true,
            trim: true
        },

        position: {
            type: String,
            trim: true
        },

        status: {
            type: String,
            enum: ["active", "maintenance", "damaged", "replaced"],
            default: "active"
        },

        purchaseDate: {
            type: Date
        },

        installationDate: {
            type: Date
        },

        lastInspectionDate: {
            type: Date
        },

        notes: {
            type: String,
            trim: true
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Tyre", tyreSchema);