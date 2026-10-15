const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const {
    generateAlerts,
    getAlerts,
    markRead,
    markAllRead,
    deleteAlert,
    getUnreadCount
} = require("../controllers/alertController");

// Generate/refresh all system alerts (all authenticated users)
router.post("/generate", protect, generateAlerts);

// Get all alerts for the current user's role
router.get("/", protect, getAlerts);

// Get unread count only (lightweight)
router.get("/unread-count", protect, getUnreadCount);

// Mark a single alert as read
router.patch("/:id/read", protect, markRead);

// Mark all alerts as read for current user
router.patch("/mark-all-read", protect, markAllRead);

// Delete an alert (admin only)
router.delete("/:id", protect, authorize("admin"), deleteAlert);

module.exports = router;