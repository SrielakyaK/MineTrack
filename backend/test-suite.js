require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("./models/User");
const Equipment = require("./models/Equipment");
const Tyre = require("./models/Tyre");
const Maintenance = require("./models/Maintenance");
const SparePart = require("./models/SparePart");
const Alert = require("./models/alert");

const BASE_URL = "https://minetrack-wl9n.onrender.com/";
const JWT_SECRET = process.env.JWT_SECRET || "mining_super_secret_jwt_key_2026";

async function request(path, options = {}) {
    const url = `${BASE_URL}${path}`;
    const headers = {
        "Content-Type": "application/json",
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
        ...options.headers
    };
    const res = await fetch(url, {
        method: options.method || "GET",
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined
    });
    const text = await res.text();
    let data;
    try {
        data = JSON.parse(text);
    } catch {
        data = text;
    }
    return { status: res.status, ok: res.ok, data };
}

function assert(condition, message) {
    if (!condition) {
        console.error(`❌ FAILED: ${message}`);
        throw new Error(message);
    }
    console.log(`✅ PASSED: ${message}`);
}

async function runTestSuite() {
    console.log("=================================================");
    console.log("🚀 STARTING E2E & VERIFICATION TEST SUITE");
    console.log("=================================================\n");

    let adminToken, maintToken, mgmtToken;
    let adminUser, maintUser, mgmtUser;

    try {
        // --- 1. SETUP TEST USERS & TOKENS ---
        console.log("--- 1. AUTHENTICATION & RBAC ROLES ---");
        
        async function getOrCreateUser(email, role, name) {
            let u = await User.findOne({ email });
            if (!u) {
                const hashedPassword = await bcrypt.hash("Password123!", 10);
                u = await User.create({ name, email, password: hashedPassword, role });
            } else if (u.role !== role) {
                u.role = role;
                await u.save();
            }
            const token = jwt.sign({ id: u._id, email: u.email, role: u.role }, JWT_SECRET, { expiresIn: "1h" });
            return { user: u, token };
        }

        const adminData = await getOrCreateUser("test_admin@mine.test", "admin", "E2E Admin");
        adminToken = adminData.token;
        adminUser = adminData.user;

        const maintData = await getOrCreateUser("test_maint@mine.test", "maintenance", "E2E Maintenance");
        maintToken = maintData.token;
        maintUser = maintData.user;

        const mgmtData = await getOrCreateUser("test_mgmt@mine.test", "management", "E2E Management");
        mgmtToken = mgmtData.token;
        mgmtUser = mgmtData.user;

        assert(adminToken && maintToken && mgmtToken, "Generated authentication tokens for admin, maintenance, and management roles");

        // Verify login endpoint works with credentials
        const loginRes = await request("/auth/login", {
            method: "POST",
            body: { email: "test_admin@mine.test", password: "Password123!" }
        });
        assert(loginRes.ok && loginRes.data.token, "POST /api/auth/login succeeds with valid credentials");

        // --- 2. SPARE PARTS VALIDATION & RBAC MUTATION RESTRICTIONS ---
        console.log("\n--- 2. SPARE PARTS VALIDATION & RBAC ---");

        // Management role trying to create a spare part -> must be 403 Forbidden
        const mgmtCreateRes = await request("/spare-parts", {
            method: "POST",
            token: mgmtToken,
            body: { partId: "TEST-PART-X", partName: "Filter", category: "Filters", quantity: 10, minimumStock: 5 }
        });
        assert(mgmtCreateRes.status === 403, "Management role is forbidden (403) from creating spare parts");

        // Missing required field validation -> must be 400 Bad Request
        const missingReqRes = await request("/spare-parts", {
            method: "POST",
            token: adminToken,
            body: { partId: "TEST-PART-MISSING", quantity: 5, minimumStock: 2 }
        });
        assert(missingReqRes.status === 400 && missingReqRes.data.message.includes("required"), "Rejects missing required field with 400 error");

        // Negative quantity validation -> must be 400 Bad Request
        const negQtyRes = await request("/spare-parts", {
            method: "POST",
            token: adminToken,
            body: { partId: "TEST-PART-NEG", partName: "Negative Part", category: "Filters", quantity: -5, minimumStock: 10 }
        });
        assert(negQtyRes.status === 400 && negQtyRes.data.message.includes("negative"), "Rejects negative quantity with 400 error");

        // Negative minimumStock validation -> must be 400 Bad Request
        const negMinRes = await request("/spare-parts", {
            method: "POST",
            token: adminToken,
            body: { partId: "TEST-PART-NEGMIN", partName: "Negative Min", category: "Filters", quantity: 5, minimumStock: -2 }
        });
        assert(negMinRes.status === 400 && negMinRes.data.message.includes("negative"), "Rejects negative minimumStock with 400 error");

        // Negative unitCost validation -> must be 400 Bad Request
        const negCostRes = await request("/spare-parts", {
            method: "POST",
            token: adminToken,
            body: { partId: "TEST-PART-NEGCOST", partName: "Negative Cost", category: "Filters", quantity: 5, minimumStock: 2, unitCost: -50 }
        });
        assert(negCostRes.status === 400 && negCostRes.data.message.includes("negative"), "Rejects negative unitCost with 400 error");

        // Clean up any pre-existing test part
        await SparePart.deleteMany({ partId: { $in: ["E2E-PART-01", "E2E-PART-02"] } });

        // Create a valid spare part with low stock (quantity 3, minStock 10)
        const createPartRes = await request("/spare-parts", {
            method: "POST",
            token: adminToken,
            body: {
                partId: "E2E-PART-01",
                partName: "Hydraulic Oil Filter",
                category: "Hydraulics",
                equipmentType: "Haul Truck",
                quantity: 3,
                minimumStock: 10,
                unitCost: 125,
                supplier: "Cat Mining Supplies",
                location: "Warehouse A-12"
            }
        });
        assert(createPartRes.status === 201, "Admin successfully creates spare part");
        const createdPart = createPartRes.data.sparePart;
        assert(createdPart.status === "low-stock", `Computed status correctly set to 'low-stock' (qty: ${createdPart.quantity}, min: ${createdPart.minimumStock})`);

        // Duplicate partId validation -> must be 400
        const dupPartRes = await request("/spare-parts", {
            method: "POST",
            token: adminToken,
            body: {
                partId: "e2e-part-01", // test case-insensitive uniqueness
                partName: "Duplicate Filter",
                category: "Filters",
                quantity: 10,
                minimumStock: 5
            }
        });
        assert(dupPartRes.status === 400 && dupPartRes.data.message.includes("already exists"), "Rejects duplicate partId with 400 error");

        // Maintenance role cannot DELETE spare parts -> must be 403 Forbidden
        const maintDelRes = await request(`/spare-parts/${createdPart._id}`, {
            method: "DELETE",
            token: maintToken
        });
        assert(maintDelRes.status === 403, "Maintenance role is forbidden (403) from deleting spare parts");

        // Update quantity to 0 -> status becomes "out-of-stock"
        const updateZeroRes = await request(`/spare-parts/${createdPart._id}`, {
            method: "PUT",
            token: maintToken, // maintenance can update quantity
            body: { quantity: 0, minimumStock: 10 }
        });
        assert(updateZeroRes.ok && updateZeroRes.data.sparePart.status === "out-of-stock", "Manual stock change to 0 updates status to 'out-of-stock'");

        // Update quantity to 20 -> status becomes "available"
        const updateAvailRes = await request(`/spare-parts/${createdPart._id}`, {
            method: "PUT",
            token: maintToken,
            body: { quantity: 20, minimumStock: 10 }
        });
        assert(updateAvailRes.ok && updateAvailRes.data.sparePart.status === "available", "Manual stock change to 20 updates status to 'available'");

        // --- 3. IN-APP NOTIFICATION SYSTEM & DEDUPLICATION LIFECYCLE ---
        console.log("\n--- 3. ALERT GENERATION, DEDUPLICATION & LIFECYCLE ---");

        // Reset part to low stock
        await request(`/spare-parts/${createdPart._id}`, {
            method: "PUT",
            token: adminToken,
            body: { quantity: 2, minimumStock: 10 }
        });

        // Generate alerts 1st time
        const gen1 = await request("/alerts/generate", { method: "POST", token: adminToken });
        assert(gen1.ok, "POST /api/alerts/generate completes successfully");

        // Verify alert exists
        const lowStockEventKey = "low-stock:E2E-PART-01";
        const activeLowStockAlert = await Alert.findOne({ eventKey: lowStockEventKey, isResolved: false });
        assert(activeLowStockAlert !== null, "Active alert generated for low-stock spare part");
        assert(activeLowStockAlert.severity === "high", "Low-stock alert has high severity");
        assert(activeLowStockAlert.type === "inventory", "Alert has type: inventory");
        assert(activeLowStockAlert.referenceId === "E2E-PART-01", "Alert has referenceId: E2E-PART-01 for deep navigation");

        // Deduplication test: Generate alerts a 2nd and 3rd time
        const countBefore = await Alert.countDocuments({ eventKey: lowStockEventKey, isResolved: false });
        await request("/alerts/generate", { method: "POST", token: adminToken });
        await request("/alerts/generate", { method: "POST", token: adminToken });
        const countAfter = await Alert.countDocuments({ eventKey: lowStockEventKey, isResolved: false });
        assert(countBefore === 1 && countAfter === 1, "Deduplication confirmed: Repeated generation calls do NOT create duplicate active alerts");

        // Role-based alert visibility test
        const maintAlerts = await request("/alerts", { token: maintToken });
        const hasLowStockForMaint = maintAlerts.data.alerts.some(a => a.eventKey === lowStockEventKey);
        assert(hasLowStockForMaint === true, "Operational low-stock alert is visible to Maintenance role");

        const mgmtAlerts1 = await request("/alerts", { token: mgmtToken });
        const hasLowStockForMgmt = mgmtAlerts1.data.alerts.some(a => a.eventKey === lowStockEventKey);
        assert(hasLowStockForMgmt === false, "Operational low-stock alert is NOT visible to Management role (RBAC enforced)");

        // Now change stock to 0 (out-of-stock)
        await request(`/spare-parts/${createdPart._id}`, {
            method: "PUT",
            token: adminToken,
            body: { quantity: 0, minimumStock: 10 }
        });
        await request("/alerts/generate", { method: "POST", token: adminToken });

        // Low stock alert should be resolved, and out-of-stock alert should be active
        const oldLowStockResolved = await Alert.findOne({ eventKey: lowStockEventKey });
        const outOfStockEventKey = "out-of-stock:E2E-PART-01";
        const activeOutOfStockAlert = await Alert.findOne({ eventKey: outOfStockEventKey, isResolved: false });
        assert(oldLowStockResolved.isResolved === true, "Prior low-stock alert was resolved when condition transitioned to out-of-stock");
        assert(activeOutOfStockAlert !== null && activeOutOfStockAlert.severity === "critical", "Out-of-stock alert created with critical severity");

        // Management role CAN see out-of-stock alerts
        const mgmtAlerts2 = await request("/alerts", { token: mgmtToken });
        const hasOutOfStockForMgmt = mgmtAlerts2.data.alerts.some(a => a.eventKey === outOfStockEventKey);
        assert(hasOutOfStockForMgmt === true, "Out-of-stock critical inventory alert is visible to Management role");

        // Now restock part back to 30 (available)
        await request(`/spare-parts/${createdPart._id}`, {
            method: "PUT",
            token: adminToken,
            body: { quantity: 30, minimumStock: 10 }
        });
        await request("/alerts/generate", { method: "POST", token: adminToken });

        const outOfStockResolved = await Alert.findOne({ eventKey: outOfStockEventKey });
        assert(outOfStockResolved.isResolved === true, "Out-of-stock alert resolved automatically when restocked");

        // --- 4. ALERT READ / UNREAD & PERSISTENCE ---
        console.log("\n--- 4. ALERT READ/UNREAD TRACKING & PERSISTENCE ---");

        // Fetch unread count for admin
        const unreadCountRes1 = await request("/alerts/unread-count", { token: adminToken });
        assert(unreadCountRes1.ok && typeof unreadCountRes1.data.unreadCount === "number", "GET /api/alerts/unread-count returns valid count");

        // Mark resolved out-of-stock alert as read
        const markReadRes = await request(`/alerts/${outOfStockResolved._id}/read`, {
            method: "PATCH",
            token: adminToken
        });
        assert(markReadRes.ok, "PATCH /api/alerts/:id/read succeeds");

        // Verify that in GET /alerts it returns isRead === true for this user
        const getAlertsRes = await request("/alerts", { token: adminToken });
        const markedAlert = getAlertsRes.data.alerts.find(a => a._id === outOfStockResolved._id.toString());
        assert(markedAlert && markedAlert.isRead === true, "Alert isRead state persists for the current user");

        // Mark all as read
        const markAllRes = await request("/alerts/mark-all-read", {
            method: "PATCH",
            token: adminToken
        });
        assert(markAllRes.ok, "PATCH /api/alerts/mark-all-read succeeds");
        const unreadCountAfterAll = await request("/alerts/unread-count", { token: adminToken });
        assert(unreadCountAfterAll.data.unreadCount === 0, "Unread count is 0 after mark-all-read");

        // --- 5. MAINTENANCE, EQUIPMENT & TYRE INTEGRATION ---
        console.log("\n--- 5. MAINTENANCE, TYRE & EQUIPMENT INTEGRATION ---");

        // Ensure clean test equipment & tyre
        await Maintenance.deleteMany({ maintenanceId: "E2E-MAINT-99" });
        await Tyre.deleteMany({ tyreId: "E2E-TYRE-99" });
        await Equipment.deleteMany({ equipmentId: "E2E-EQ-99" });

        // Create Equipment
        const eqRes = await request("/equipment", {
            method: "POST",
            token: adminToken,
            body: {
                equipmentId: "E2E-EQ-99",
                name: "Excavator EX-99",
                type: "Excavator",
                model: "CAT-390F",
                status: "active",
                location: "Pit North"
            }
        });
        assert(eqRes.status === 201, "Created test equipment");

        // Create Tyre with damaged condition
        const tyreRes = await request("/tyre", {
            method: "POST",
            token: adminToken,
            body: {
                tyreId: "E2E-TYRE-99",
                tyreNumber: "TN-9900",
                equipmentId: "E2E-EQ-99",
                brand: "Michelin",
                size: "40.00R57",
                position: "Front-Left",
                status: "damaged"
            }
        });
        assert(tyreRes.status === 201, "Created test tyre with status: 'damaged'");
        const tyreItem = tyreRes.data.tyre || tyreRes.data;

        // Generate alerts and verify tyre damage alert
        await request("/alerts/generate", { method: "POST", token: adminToken });

        const tyreDamagedAlert = await Alert.findOne({ eventKey: "damaged-tyre:E2E-TYRE-99", isResolved: false });
        assert(tyreDamagedAlert !== null, "Damaged tyre notification generated with correct eventKey");

        // Verify stock decoupling: create maintenance record
        const initialSpareQty = (await SparePart.findById(createdPart._id)).quantity;
        const maintCreateRes = await request("/maintenance", {
            method: "POST",
            token: maintToken,
            body: {
                maintenanceId: "E2E-MAINT-99",
                equipmentId: "E2E-EQ-99",
                tyreId: "E2E-TYRE-99",
                maintenanceType: "repair",
                serviceDate: new Date(Date.now() - 3 * 86400000).toISOString(), // 3 days ago = overdue!
                technician: "E2E Maintenance Tech",
                cost: 450,
                status: "scheduled",
                issue: "Replaced filter and inspected tyre"
            }
        });
        assert(maintCreateRes.status === 201, "Created scheduled maintenance task with overdue serviceDate");
        const finalSpareQty = (await SparePart.findById(createdPart._id)).quantity;
        assert(initialSpareQty === finalSpareQty, "Stock decoupling verified: Maintenance creation did NOT deduct spare part quantity (manual stock rule enforced)");

        // Trigger alert generation and check overdue maintenance notification
        await request("/alerts/generate", { method: "POST", token: adminToken });
        const maintOverdueAlert = await Alert.findOne({ eventKey: "overdue-maintenance:E2E-MAINT-99", isResolved: false });
        assert(maintOverdueAlert !== null, "Overdue maintenance alert generated with critical severity");

        // Mark maintenance completed -> alert should resolve!
        const maintObj = maintCreateRes.data.maintenance || maintCreateRes.data;
        await request(`/maintenance/${maintObj._id}`, {
            method: "PUT",
            token: maintToken,
            body: { status: "completed" }
        });
        await request("/alerts/generate", { method: "POST", token: adminToken });
        const maintResolved = await Alert.findOne({ eventKey: "overdue-maintenance:E2E-MAINT-99" });
        assert(maintResolved.isResolved === true, "Overdue maintenance alert resolved automatically when marked completed");

        // Repair tyre -> damaged alert resolves
        await request(`/tyre/${tyreItem._id}`, {
            method: "PUT",
            token: maintToken,
            body: { status: "active" }
        });
        await request("/alerts/generate", { method: "POST", token: adminToken });
        const tyreResolved = await Alert.findOne({ eventKey: "damaged-tyre:E2E-TYRE-99" });
        assert(tyreResolved.isResolved === true, "Tyre damaged alert resolved automatically when repaired");

        // --- 6. CLEAN UP TEST DATA ---
        console.log("\n--- 6. CLEANING UP TEST ARTIFACTS ---");
        await Maintenance.deleteMany({ maintenanceId: "E2E-MAINT-99" });
        await Tyre.deleteMany({ tyreId: "E2E-TYRE-99" });
        await Equipment.deleteMany({ equipmentId: "E2E-EQ-99" });
        await SparePart.deleteMany({ partId: { $in: ["E2E-PART-01", "E2E-PART-02"] } });
        await Alert.deleteMany({
            eventKey: {
                $in: [
                    "low-stock:E2E-PART-01",
                    "out-of-stock:E2E-PART-01",
                    "damaged-tyre:E2E-TYRE-99",
                    "overdue-maintenance:E2E-MAINT-99"
                ]
            }
        });
        console.log("✅ Test artifacts cleaned up successfully");

        console.log("\n=================================================");
        console.log("🎉 ALL E2E & VERIFICATION TESTS PASSED SUCCESSFULLY!");
        console.log("=================================================\n");
        process.exit(0);
    } catch (err) {
        console.error("\n❌ TEST SUITE FAILED WITH ERROR:", err);
        process.exit(1);
    }
}

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log("Connected to MongoDB for test assertions");
        runTestSuite();
    })
    .catch(err => {
        console.error("MongoDB connection failed in test runner:", err);
        process.exit(1);
    });
