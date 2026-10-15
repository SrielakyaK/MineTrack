const mongoose = require("mongoose");

const alertSchema = new mongoose.Schema(
    {
        alertId: {
            type: String,
            default: () => `ALT-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
        },

        title: {
            type: String,
            required: true,
            trim: true
        },

        message: {
            type: String,
            required: true,
            trim: true
        },

        type: {
            type: String,
            enum: [
                "maintenance",
                "tyre",
                "inventory",
                "equipment"
            ],
            required: true
        },

        severity: {
            type: String,
            enum: ["low", "medium", "high", "critical"],
            default: "medium"
        },

        referenceId: {
            type: String,
            trim: true
        },

        // eventKey: unique key to prevent duplicate alerts for same condition
        // e.g. "low-stock:PART-001" or "overdue-maintenance:MAINT-042"
        eventKey: {
            type: String,
            trim: true
        },

        // Which roles should receive this alert
        recipientRoles: {
            type: [String],
            enum: ["admin", "maintenance", "management"],
            default: ["admin", "maintenance"]
        },

        status: {
            type: String,
            enum: ["unread", "read"],
            default: "unread"
        },

        // Track read state per user (userId -> true)
        readBy: {
            type: Map,
            of: Boolean,
            default: {}
        },

        // Track lifecycle state: unresolved (active) vs resolved
        isResolved: {
            type: Boolean,
            default: false
        },

        resolvedAt: {
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

// Compound index to allow efficient eventKey + active lookups
alertSchema.index({ eventKey: 1, isResolved: 1 });

module.exports = mongoose.model("Alert", alertSchema);