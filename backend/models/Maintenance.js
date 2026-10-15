const mongoose = require("mongoose");

const maintenanceSchema = new mongoose.Schema(
    {
        maintenanceId: {
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

        tyreId: {
            type: String,
            trim: true
        },

        maintenanceType: {
            type: String,
            required: true,
            enum: ["routine", "repair", "inspection", "replacement"]
        },

        issue: {
            type: String,
            trim: true
        },

        serviceDate: {
            type: Date,
            required: true
        },

        technician: {
            type: String,
            trim: true
        },

        cost: {
            type: Number,
            default: 0
        },

        status: {
            type: String,
            enum: ["scheduled", "in-progress", "completed"],
            default: "scheduled"
        },

        nextServiceDate: {
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

module.exports = mongoose.model("Maintenance", maintenanceSchema);