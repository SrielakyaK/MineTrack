const mongoose = require("mongoose");

const sparePartSchema = new mongoose.Schema(
    {
        partId: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },

        partName: {
            type: String,
            required: true,
            trim: true
        },

        category: {
            type: String,
            required: true,
            trim: true
        },

        equipmentType: {
            type: String,
            trim: true
        },

        quantity: {
            type: Number,
            required: true,
            min: 0,
            default: 0
        },

        minimumStock: {
            type: Number,
            required: true,
            min: 0,
            default: 0
        },

        unitCost: {
            type: Number,
            min: 0
        },

        supplier: {
            type: String,
            trim: true
        },

        location: {
            type: String,
            trim: true
        },

        status: {
            type: String,
            enum: ["available", "low-stock", "out-of-stock"],
            default: "available"
        },

        lastRestocked: {
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

module.exports = mongoose.model("SparePart", sparePartSchema);