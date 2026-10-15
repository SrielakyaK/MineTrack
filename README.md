# Mining Equipment & Tyre Maintenance Management Platform

A robust, enterprise-grade MERN stack management system built specifically for open-pit and underground mining operations to track heavy machinery, off-the-road (OTR) tyres, scheduled maintenance workflows, spare parts inventory, and real-time internal notifications with role-based access control (RBAC).

---

## Table of Contents
1. [System Architecture](#system-architecture)
2. [Technology Stack](#technology-stack)
3. [Key Modules & Features](#key-modules--features)
4. [Role-Based Access Control (RBAC)](#role-based-access-control-rbac)
5. [Database Models & Schemas](#database-models--schemas)
6. [REST API Documentation](#rest-api-documentation)
7. [Business Rules & Alert Lifecycle](#business-rules--alert-lifecycle)
8. [Installation & Setup](#installation--setup)
9. [Automated Verification & Testing](#automated-verification--testing)
10. [Project Directory Structure](#project-directory-structure)

---

## System Architecture

The platform follows a decoupled client-server architecture with an industrial dashboard UI styled in a cohesive sand/beige/navy color palette.

```
┌────────────────────────────────────────────────────────┐
│                   React 19 Frontend                    │
│   (Vite, Recharts, CSS Design Tokens, Bell Menu)       │
└───────────────────────────▲────────────────────────────┘
                            │  HTTPS / REST / JWT
┌───────────────────────────▼────────────────────────────┐
│                  Node.js / Express API                 │
│   (Auth Middleware, RBAC Guards, Alert Controller)     │
└───────────────────────────▲────────────────────────────┘
                            │  Mongoose ODM
┌───────────────────────────▼────────────────────────────┐
│                   MongoDB Atlas                        │
│   (Users, Equipment, Tyres, Maintenance, Inventory)    │
└────────────────────────────────────────────────────────┘
```

---

## Technology Stack

- **Frontend:** React 19, Vite, Recharts, Custom CSS with Industrial Design Tokens
- **Backend:** Node.js (v18+), Express.js
- **Database:** MongoDB Atlas with Mongoose 7/8 ODM
- **Authentication:** JSON Web Tokens (JWT) & bcryptjs password hashing
- **Testing:** Custom automated integration suite with full lifecycle verification

---

## Key Modules & Features

### 1. Equipment Fleet Management
- Track haul trucks, excavators, wheel loaders, dozers, and drill rigs.
- Monitor operating hours, site locations (e.g. Pit North, Bench 4), manufacturer, model, and operational status (`active`, `maintenance`, `inactive`).
- Inspect equipment service schedules and next service due dates.

### 2. Off-The-Road (OTR) Tyre Tracking
- Serial number and tyre ID indexing with vehicle wheel position assignments (e.g., `Front-Left`, `Rear-Outer-Right`).
- Monitor tyre brand, dimensions (e.g., `40.00R57`), pressure, hours used, and condition (`active`, `maintenance`, `damaged`, `replaced`).
- Deep links from tyre alerts directly to affected equipment records.

### 3. Maintenance Work Orders
- Schedule and track maintenance categories: `routine`, `repair`, `inspection`, and `replacement`.
- Link work orders directly to equipment and assigned tyres.
- Real-time overdue date tracking with priority severity flags.
- **Strict Decoupling Rule:** Creating or updating maintenance work orders **does not** automatically deduct spare parts inventory.

### 4. Spare Parts Inventory
- Complete inventory catalogue tracking: `partId`, `partName`, `category`, `equipmentType`, `quantity`, `minimumStock`, `unitCost`, `supplier`, `location`, `status`, and `lastRestocked`.
- Non-negative validation on quantity, minimum stock threshold, and unit cost.
- Case-insensitive duplicate part ID prevention.
- Authoritative automatic status derivation:
  - $\text{Quantity} \le 0 \implies \text{"out-of-stock"}$
  - $0 < \text{Quantity} \le \text{MinimumStock} \implies \text{"low-stock"}$
  - $\text{Quantity} > \text{MinimumStock} \implies \text{"available"}$
- Multi-attribute toolbar filtering by search query, category, and equipment compatibility.

### 5. In-App Notification & Alert Lifecycle System
- In-app notification bell with real-time unread badges, dropdown menu, and dedicated notifications management view.
- Persistent read/unread tracking scoped per individual user ID (`readBy` Map).
- **Deduplication:** Unique compound indexing (`eventKey` + `isResolved: false`) prevents duplicate alerts on repeated dashboard visits.
- **Automatic Resolution:** When conditions normalize (e.g. parts restocked, maintenance completed, tyres repaired), active alerts automatically resolve (`isResolved: true`), preserving historical audit trails.
- **Deep Linking:** Clicking "View Record" on any alert automatically redirects the user to the relevant tab (`spareParts`, `maintenance`, `tyres`, `equipment`) with the record ID pre-filled in the search toolbar.

### 6. Industrial Analytics & Visual Reports
- Interactive Recharts components:
  - Equipment Fleet Distribution by Type (Bar chart)
  - Equipment Status Breakdown (Donut chart)
  - Tyre Operational Condition (Pie chart)
  - Maintenance Work Order Status (Donut chart)
  - Spare Parts Stock vs. Minimum Threshold Comparison (Grouped Bar chart)
- Financial valuation metrics: total fleet cost, tyre inventory value, spare parts stock valuation, and total maintenance expenditure.

---

## Role-Based Access Control (RBAC)

The system enforces server-side and client-side RBAC across three predefined roles:

| Module / Action | `admin` | `maintenance` | `management` |
| :--- | :---: | :---: | :---: |
| **View Dashboard & Resources** | Yes | Yes | Yes |
| **Create Equipment / Tyres** | Yes | Yes | Read-Only |
| **Edit Equipment / Tyres** | Yes | Yes | Read-Only |
| **Delete Equipment / Tyres** | Yes | No | No |
| **Create / Update Maintenance** | Yes | Yes | Read-Only |
| **Delete Maintenance Records** | Yes | No | No |
| **Create / Update Spare Parts** | Yes | Yes | Read-Only |
| **Delete Spare Parts** | Yes | No | No |
| **Low-Stock Alerts** | Yes | Yes | No (Operational) |
| **Out-of-Stock Critical Alerts** | Yes | Yes | Yes (Financial/Supply) |
| **Damaged Tyre Alerts** | Yes | Yes | Yes |
| **Overdue Maintenance Alerts** | Yes | Yes | Yes |
| **Tyre Inspection Due Alerts** | Yes | Yes | No (Operational) |
| **Delete System Alerts** | Yes | No | No |

---

## Database Models & Schemas

### 1. User Model (`User.js`)
```javascript
{
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["admin", "maintenance", "management"], default: "maintenance" }
}
```

### 2. Equipment Model (`Equipment.js`)
```javascript
{
  equipmentId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  type: { type: String, required: true },
  manufacturer: { type: String },
  model: { type: String },
  year: { type: Number },
  location: { type: String },
  status: { type: String, enum: ["active", "maintenance", "inactive"], default: "active" },
  purchaseDate: { type: Date }
}
```

### 3. Tyre Model (`Tyre.js`)
```javascript
{
  tyreId: { type: String, required: true, unique: true },
  tyreNumber: { type: String, required: true, unique: true },
  equipmentId: { type: String, required: true },
  brand: { type: String, required: true },
  size: { type: String, required: true },
  position: { type: String },
  status: { type: String, enum: ["active", "maintenance", "damaged", "replaced"], default: "active" },
  purchaseDate: { type: Date },
  installationDate: { type: Date },
  lastInspectionDate: { type: Date },
  notes: { type: String }
}
```

### 4. Maintenance Model (`Maintenance.js`)
```javascript
{
  maintenanceId: { type: String, required: true, unique: true },
  equipmentId: { type: String, required: true },
  tyreId: { type: String },
  maintenanceType: { type: String, required: true, enum: ["routine", "repair", "inspection", "replacement"] },
  issue: { type: String },
  serviceDate: { type: Date, required: true },
  technician: { type: String },
  cost: { type: Number, default: 0 },
  status: { type: String, enum: ["scheduled", "in-progress", "completed"], default: "scheduled" },
  nextServiceDate: { type: Date },
  notes: { type: String }
}
```

### 5. SparePart Model (`SparePart.js`)
```javascript
{
  partId: { type: String, required: true, unique: true },
  partName: { type: String, required: true },
  category: { type: String, required: true },
  equipmentType: { type: String },
  quantity: { type: Number, required: true, min: 0 },
  minimumStock: { type: Number, required: true, min: 0 },
  unitCost: { type: Number, min: 0 },
  supplier: { type: String },
  location: { type: String },
  status: { type: String, enum: ["available", "low-stock", "out-of-stock"], default: "available" },
  lastRestocked: { type: Date },
  notes: { type: String }
}
```

### 6. Alert Model (`alert.js`)
```javascript
{
  alertId: { type: String, default: () => "ALT-..." },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ["maintenance", "tyre", "inventory", "equipment"], required: true },
  severity: { type: String, enum: ["low", "medium", "high", "critical"], default: "medium" },
  referenceId: { type: String },
  eventKey: { type: String },
  recipientRoles: [{ type: String, enum: ["admin", "maintenance", "management"] }],
  readBy: { type: Map, of: Boolean, default: {} },
  isResolved: { type: Boolean, default: false },
  resolvedAt: { type: Date },
  notes: { type: String }
}
// Compound Index: { eventKey: 1, isResolved: 1 }
```

---

## REST API Documentation

### Authentication (`/api/auth`)
- `POST /api/auth/register` - Create user profile (`admin` only).
- `POST /api/auth/login` - Authenticate user credentials and return JWT bearer token.

### Equipment (`/api/equipment`)
- `GET /api/equipment` - Fetch all equipment records.
- `POST /api/equipment` - Register new mining equipment (admin / maintenance).
- `PUT /api/equipment/:id` - Update equipment status, hours, or location.
- `DELETE /api/equipment/:id` - Delete equipment record (admin only).

### Tyres (`/api/tyre`)
- `GET /api/tyre` - Fetch all OTR tyres.
- `POST /api/tyre` - Register tyre with position and vehicle assignment (admin / maintenance).
- `PUT /api/tyre/:id` - Update tyre condition or pressure (admin / maintenance).
- `DELETE /api/tyre/:id` - Delete tyre record (admin only).

### Maintenance (`/api/maintenance`)
- `GET /api/maintenance` - Fetch maintenance work orders.
- `POST /api/maintenance` - Create maintenance work order (admin / maintenance).
- `PUT /api/maintenance/:id` - Update work order status (e.g. to `completed`).
- `DELETE /api/maintenance/:id` - Delete maintenance work order (admin only).

### Spare Parts (`/api/spare-parts`)
- `GET /api/spare-parts` - Retrieve spare parts catalogue.
- `POST /api/spare-parts` - Add new spare part record (validates non-negative quantities and unique `partId`).
- `PUT /api/spare-parts/:id` - Update quantity or stock metadata (recomputes status automatically).
- `DELETE /api/spare-parts/:id` - Delete spare part (admin only).

### Alerts & Notifications (`/api/alerts`)
- `POST /api/alerts/generate` - Trigger system-wide alert evaluation and deduplicated generation.
- `GET /api/alerts` - Retrieve alerts filtered by authenticated user's role with individual `isRead` flags.
- `GET /api/alerts/unread-count` - Lightweight unread alert count for the current user.
- `PATCH /api/alerts/:id/read` - Mark single alert as read for the current user.
- `PATCH /api/alerts/mark-all-read` - Mark all active alerts as read for the current user.
- `DELETE /api/alerts/:id` - Delete alert record (admin only).

---

## Business Rules & Alert Lifecycle

### 1. Manual Stock Authority
- Automatic inventory depletion when creating work orders is strictly prohibited.
- Stock quantities must be adjusted manually by authorized personnel via the Spare Parts interface.

### 2. Alert Deduplication & Auto-Resolution
- **Deduplication:** An active alert is uniquely identified by its `eventKey` (e.g. `low-stock:PART-101`, `overdue-maintenance:M-002`). As long as an alert with that `eventKey` has `isResolved: false`, new visits or API calls will **not** create duplicate alerts.
- **Auto-Resolution:** When the triggering condition clears (e.g. part is restocked to $\text{quantity} > \text{minimumStock}$, maintenance is marked `completed`, or damaged tyre is repaired), `resolveAlert(eventKey)` marks the record as `isResolved: true` and sets `resolvedAt`. This maintains historical integrity while allowing future alerts if the condition recurs.

---

## Installation & Setup

### Prerequisites
- Node.js v18.0.0 or higher
- MongoDB Atlas connection string (or local MongoDB v6+)

### 1. Backend Setup
1. Open a terminal in the project directory:
   ```bash
   cd backend
   npm install
   ```
2. Verify or create your `backend/.env` file:
   ```env
   PORT=5000
   MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/mining_maintenance
   JWT_SECRET=mining_super_secret_jwt_key_2026
   ```
3. Start the backend server:
   ```bash
   node server.js
   ```
   The API will listen at `http://localhost:5000`.

### 2. Frontend Setup
1. Open a second terminal:
   ```bash
   cd frontend
   npm install
   ```
2. Launch the Vite development server:
   ```bash
   npm run dev
   ```
3. Navigate to `http://localhost:5173` in your browser.

### 3. Production Build
```bash
cd frontend
npm run build
```
Creates an optimized production bundle in `frontend/dist/`.

---

## Automated Verification & Testing

The platform includes an automated integration test suite located at `backend/test-suite.js`. It validates all critical flows across authentication, RBAC, input validation, alert generation, deduplication, and manual stock rules.

### Running the Tests
With the backend server running:
```bash
cd backend
node test-suite.js
```

### Test Coverage Summary (26/26 Assertions Passed)
- [x] JWT authentication and password hashing.
- [x] RBAC enforcement (`management` blocked from spare part mutations; `maintenance` blocked from deletion).
- [x] Input validations (rejection of negative quantity, min stock, unit cost, and missing fields).
- [x] Case-insensitive duplicate `partId` rejection.
- [x] Automatic calculation of `low-stock`, `out-of-stock`, and `available` statuses.
- [x] Alert deduplication on repeated `/api/alerts/generate` triggers.
- [x] Role-targeted alert visibility (operational low-stock alerts filtered out for `management`).
- [x] Alert lifecycle auto-resolution when items are restocked or repaired.
- [x] User-specific read/unread state persistence in MongoDB.
- [x] Decoupling verification: maintenance creation does **not** alter spare part quantities.

---

## Project Directory Structure

```
Mining-Equipment-Tyre-Maintenance-System/
├── README.md                           # Main project documentation
├── backend/
│   ├── .env                            # Environment variables (PORT, MONGO_URI, JWT_SECRET)
│   ├── package.json                    # Backend dependencies & scripts
│   ├── server.js                       # Express app entrypoint & MongoDB connection
│   ├── test-suite.js                   # 26-step automated E2E verification script
│   ├── controllers/
│   │   ├── alertController.js          # In-app alerts, deduplication & resolution
│   │   ├── authController.js           # Registration & JWT login
│   │   ├── equipmentController.js      # Mining equipment CRUD
│   │   ├── maintenanceController.js    # Work order scheduling & decoupled stock
│   │   └── tyreController.js           # OTR tyre tracking & condition monitoring
│   ├── middleware/
│   │   └── authMiddleware.js           # JWT verification & role authorization
│   ├── models/
│   │   ├── alert.js                    # In-app alert schema with compound index
│   │   ├── Equipment.js                # Equipment schema
│   │   ├── Maintenance.js              # Maintenance work order schema
│   │   ├── SparePart.js                # Inventory schema
│   │   ├── Tyre.js                     # OTR tyre schema
│   │   └── User.js                     # User authentication & role schema
│   └── routes/
│       ├── alertRoutes.js              # Notification API endpoints
│       ├── authRoutes.js               # Auth API endpoints
│       ├── equipmentRoutes.js          # Equipment API endpoints
│       ├── maintenanceRoutes.js        # Maintenance API endpoints
│       ├── sparePartRoutes.js          # Spare parts inventory API endpoints
│       └── tyreRoutes.js               # Tyre API endpoints
└── frontend/
    ├── package.json                    # Frontend dependencies & Vite scripts
    ├── index.html                      # HTML entrypoint
    ├── vite.config.js                  # Vite configuration
    ├── dist/                           # Compiled production build
    └── src/
        ├── App.jsx                     # Core application, tabs, Recharts analytics, modals
        ├── App.css                     # Industrial theme styling & responsive layout
        ├── Analytics.jsx               # Dedicated KPI & analytics views
        ├── SpareParts.jsx              # Standalone spare parts inventory component
        └── main.jsx                    # React DOM mounting
```
