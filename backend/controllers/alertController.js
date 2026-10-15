const Alert = require("../models/alert");
const SparePart = require("../models/sparePart");
const Maintenance = require("../models/Maintenance");
const Tyre = require("../models/Tyre");

/* ------------------------------------------------------------------
   Helpers
------------------------------------------------------------------ */
const INSPECTION_INTERVAL_DAYS = 90; // treat tyre inspection overdue if > 90 days

function inspectionDue(tyre) {
    if (!tyre.lastInspectionDate && !tyre.installationDate) return false;
    const base = tyre.lastInspectionDate || tyre.installationDate;
    const daysSince = (Date.now() - new Date(base)) / 86_400_000;
    return daysSince > INSPECTION_INTERVAL_DAYS;
}

/**
 * Deduplicated alert creation:
 * - If an active (unresolved) alert with this eventKey already exists → do nothing.
 * - If it doesn't → create a new alert.
 */
async function ensureAlert(payload) {
    if (payload.eventKey) {
        const existing = await Alert.findOne({ eventKey: payload.eventKey, isResolved: false });
        if (existing) return null; // already active, skip duplicate
    }
    return Alert.create(payload);
}

/**
 * Lifecycle resolution:
 * When an underlying condition clears, mark active alerts for that eventKey as resolved.
 * History is retained in MongoDB for auditing.
 */
async function resolveAlert(eventKey) {
    if (!eventKey) return;
    await Alert.updateMany(
        { eventKey, isResolved: false },
        { $set: { isResolved: true, resolvedAt: new Date() } }
    );
}

/* ------------------------------------------------------------------
   Generate / refresh all system alerts
   Called on login or explicit refresh. Request-driven approach.
   Limitation: overdue conditions detected only when this runs.
------------------------------------------------------------------ */
const generateAlerts = async (req, res) => {
    try {
        const created = [];

        /* ---- Spare Parts: low-stock / out-of-stock ---- */
        const parts = await SparePart.find();
        for (const part of parts) {
            const qty = Number(part.quantity ?? 0);
            const min = Number(part.minimumStock ?? 0);

            if (qty === 0) {
                // Out of stock
                await resolveAlert(`low-stock:${part.partId}`);
                const a = await ensureAlert({
                    title: "Out of Stock",
                    message: `Spare part "${part.partName}" (${part.partId}) is out of stock (0 units remaining).`,
                    type: "inventory",
                    severity: "critical",
                    referenceId: part.partId,
                    eventKey: `out-of-stock:${part.partId}`,
                    recipientRoles: ["admin", "maintenance", "management"],
                    status: "unread"
                });
                if (a) created.push(a);
            } else if (min > 0 && qty <= min) {
                // Low stock (positive quantity at or below threshold)
                await resolveAlert(`out-of-stock:${part.partId}`);
                const a = await ensureAlert({
                    title: "Low Stock Warning",
                    message: `Spare part "${part.partName}" (${part.partId}) has only ${qty} unit(s) remaining (minimum: ${min}).`,
                    type: "inventory",
                    severity: "high",
                    referenceId: part.partId,
                    eventKey: `low-stock:${part.partId}`,
                    recipientRoles: ["admin", "maintenance"],
                    status: "unread"
                });
                if (a) created.push(a);
            } else {
                // Healthy stock level: resolve any active low/out-of-stock alerts
                await resolveAlert(`low-stock:${part.partId}`);
                await resolveAlert(`out-of-stock:${part.partId}`);
            }
        }

        /* ---- Maintenance: overdue & due soon ---- */
        const now = new Date();
        const in7 = new Date(Date.now() + 7 * 86_400_000);

        const allMaintenance = await Maintenance.find();
        for (const m of allMaintenance) {
            // If completed, resolve all operational alerts for this record
            if (m.status === "completed") {
                await resolveAlert(`overdue-maintenance:${m.maintenanceId}`);
                await resolveAlert(`due-soon-maintenance:${m.maintenanceId}`);
                await resolveAlert(`next-service:${m.maintenanceId}`);
                continue;
            }

            // Check service date for active records
            if (m.serviceDate) {
                const sDate = new Date(m.serviceDate);
                if (sDate < now) {
                    // Overdue
                    await resolveAlert(`due-soon-maintenance:${m.maintenanceId}`);
                    const a = await ensureAlert({
                        title: "Maintenance Overdue",
                        message: `Maintenance record "${m.maintenanceId}" for equipment ${m.equipmentId} is overdue (scheduled: ${sDate.toLocaleDateString("en-IN")}).`,
                        type: "maintenance",
                        severity: "high",
                        referenceId: m.maintenanceId,
                        eventKey: `overdue-maintenance:${m.maintenanceId}`,
                        recipientRoles: ["admin", "maintenance", "management"],
                        status: "unread"
                    });
                    if (a) created.push(a);
                } else if (sDate <= in7) {
                    // Due soon within 7 days
                    await resolveAlert(`overdue-maintenance:${m.maintenanceId}`);
                    const a = await ensureAlert({
                        title: "Maintenance Due Soon",
                        message: `Maintenance record "${m.maintenanceId}" for equipment ${m.equipmentId} is due on ${sDate.toLocaleDateString("en-IN")}.`,
                        type: "maintenance",
                        severity: "medium",
                        referenceId: m.maintenanceId,
                        eventKey: `due-soon-maintenance:${m.maintenanceId}`,
                        recipientRoles: ["admin", "maintenance"],
                        status: "unread"
                    });
                    if (a) created.push(a);
                } else {
                    await resolveAlert(`overdue-maintenance:${m.maintenanceId}`);
                    await resolveAlert(`due-soon-maintenance:${m.maintenanceId}`);
                }
            }

            // Next service date check
            if (m.nextServiceDate) {
                const nDate = new Date(m.nextServiceDate);
                if (nDate >= now && nDate <= in7) {
                    const a = await ensureAlert({
                        title: "Next Service Approaching",
                        message: `Equipment ${m.equipmentId} has a service approaching on ${nDate.toLocaleDateString("en-IN")} (record: ${m.maintenanceId}).`,
                        type: "maintenance",
                        severity: "medium",
                        referenceId: m.maintenanceId,
                        eventKey: `next-service:${m.maintenanceId}`,
                        recipientRoles: ["admin", "maintenance", "management"],
                        status: "unread"
                    });
                    if (a) created.push(a);
                } else {
                    await resolveAlert(`next-service:${m.maintenanceId}`);
                }
            }
        }

        /* ---- Tyres: damaged & inspection due ---- */
        const allTyres = await Tyre.find();
        for (const t of allTyres) {
            // Damaged tyre check
            if (t.status === "damaged") {
                const a = await ensureAlert({
                    title: "Damaged Tyre Detected",
                    message: `Tyre "${t.tyreId}" (${t.tyreNumber}) on equipment ${t.equipmentId} is marked as damaged. Inspection/replacement needed.`,
                    type: "tyre",
                    severity: "critical",
                    referenceId: t.tyreId,
                    eventKey: `damaged-tyre:${t.tyreId}`,
                    recipientRoles: ["admin", "maintenance", "management"],
                    status: "unread"
                });
                if (a) created.push(a);
            } else {
                await resolveAlert(`damaged-tyre:${t.tyreId}`);
            }

            // Inspection due check
            if (["active", "maintenance"].includes(t.status) && inspectionDue(t)) {
                const base = t.lastInspectionDate || t.installationDate;
                const a = await ensureAlert({
                    title: "Tyre Inspection Due",
                    message: `Tyre "${t.tyreId}" (${t.tyreNumber}) on equipment ${t.equipmentId} has not been inspected since ${new Date(base).toLocaleDateString("en-IN")} (>${INSPECTION_INTERVAL_DAYS} days).`,
                    type: "tyre",
                    severity: "medium",
                    referenceId: t.tyreId,
                    eventKey: `inspection-due:${t.tyreId}`,
                    recipientRoles: ["admin", "maintenance"],
                    status: "unread"
                });
                if (a) created.push(a);
            } else {
                await resolveAlert(`inspection-due:${t.tyreId}`);
            }
        }

        res.status(200).json({
            message: "Alert generation complete",
            newAlertsCreated: created.length
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to generate alerts",
            error: error.message
        });
    }
};

/* ------------------------------------------------------------------
   Get all alerts visible to the current user's role
------------------------------------------------------------------ */
const getAlerts = async (req, res) => {
    try {
        const role = req.user.role;
        const userId = String(req.user.id);

        const alerts = await Alert.find({
            recipientRoles: role
        })
            .sort({ createdAt: -1 })
            .lean();

        // Augment each alert with a per-user isRead flag
        const enriched = alerts.map((a) => {
            const readMap = a.readBy || {};
            const isRead = typeof readMap.get === "function"
                ? !!readMap.get(userId)
                : !!readMap[userId];

            return {
                ...a,
                isRead
            };
        });

        const unreadCount = enriched.filter((a) => !a.isRead).length;

        res.status(200).json({
            count: enriched.length,
            unreadCount,
            alerts: enriched
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch alerts",
            error: error.message
        });
    }
};

/* ------------------------------------------------------------------
   Mark one alert as read for the current user
------------------------------------------------------------------ */
const markRead = async (req, res) => {
    try {
        const userId = String(req.user.id);
        const alert = await Alert.findById(req.params.id);

        if (!alert) {
            return res.status(404).json({ message: "Alert not found" });
        }

        // Verify the user's role is a recipient
        if (!alert.recipientRoles.includes(req.user.role)) {
            return res.status(403).json({ message: "Access denied" });
        }

        if (!alert.readBy) {
            alert.readBy = new Map();
        }
        if (typeof alert.readBy.set === "function") {
            alert.readBy.set(userId, true);
        } else {
            alert.readBy[userId] = true;
        }
        alert.status = "read";
        alert.markModified("readBy");
        await alert.save();

        res.status(200).json({ message: "Alert marked as read" });
    } catch (error) {
        res.status(500).json({
            message: "Failed to mark alert as read",
            error: error.message
        });
    }
};

/* ------------------------------------------------------------------
   Mark all visible alerts as read for the current user
------------------------------------------------------------------ */
const markAllRead = async (req, res) => {
    try {
        const role = req.user.role;
        const userId = String(req.user.id);

        const alerts = await Alert.find({ recipientRoles: role });

        await Promise.all(
            alerts.map((a) => {
                if (!a.readBy) a.readBy = new Map();
                if (typeof a.readBy.set === "function") {
                    a.readBy.set(userId, true);
                } else {
                    a.readBy[userId] = true;
                }
                a.status = "read";
                a.markModified("readBy");
                return a.save();
            })
        );

        res.status(200).json({ message: "All alerts marked as read" });
    } catch (error) {
        res.status(500).json({
            message: "Failed to mark all alerts as read",
            error: error.message
        });
    }
};

/* ------------------------------------------------------------------
   Delete an alert (admin only)
------------------------------------------------------------------ */
const deleteAlert = async (req, res) => {
    try {
        const alert = await Alert.findByIdAndDelete(req.params.id);

        if (!alert) {
            return res.status(404).json({ message: "Alert not found" });
        }

        res.status(200).json({ message: "Alert deleted successfully" });
    } catch (error) {
        res.status(500).json({
            message: "Failed to delete alert",
            error: error.message
        });
    }
};

/* ------------------------------------------------------------------
   Get unread count only (lightweight poll endpoint)
------------------------------------------------------------------ */
const getUnreadCount = async (req, res) => {
    try {
        const role = req.user.role;
        const userId = String(req.user.id);

        const alerts = await Alert.find({ recipientRoles: role }).lean();
        const unreadCount = alerts.filter((a) => {
            const readMap = a.readBy || {};
            const isRead = typeof readMap.get === "function"
                ? !!readMap.get(userId)
                : !!readMap[userId];
            return !isRead;
        }).length;

        res.status(200).json({ unreadCount });
    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch unread count",
            error: error.message
        });
    }
};

module.exports = {
    generateAlerts,
    getAlerts,
    markRead,
    markAllRead,
    deleteAlert,
    getUnreadCount
};
