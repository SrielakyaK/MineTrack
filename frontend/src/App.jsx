import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import Login from "./Login";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

/* ------------------------------------------------------------------ */
/*  CONFIG                                                             */
/* ------------------------------------------------------------------ */
const API = "https://minetrack-wl9n.onrender.com/";

const EQUIPMENT_STATUS = [
  { value: "active", label: "Active" },
  { value: "maintenance", label: "Maintenance" },
  { value: "inactive", label: "Inactive" },
];
const TYRE_STATUS = [
  { value: "active", label: "Active" },
  { value: "maintenance", label: "Maintenance" },
  { value: "damaged", label: "Damaged" },
  { value: "replaced", label: "Replaced" },
];
const MAINT_STATUS = [
  { value: "scheduled", label: "Scheduled" },
  { value: "in-progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
];
const SPARE_STATUS = [
  { value: "available", label: "Available" },
  { value: "low-stock", label: "Low Stock" },
  { value: "out-of-stock", label: "Out of Stock" },
];

const RESOURCES = {
  equipment: { path: "/equipment", keys: ["equipment", "equipments", "data"] },
  tyres: { path: "/tyre", keys: ["tyres", "tyre", "data"] },
  maintenance: { path: "/maintenance", keys: ["maintenance", "records", "data"] },
  spareParts: { path: "/spare-parts", keys: ["spareParts", "data"] },
};

const EQUIPMENT_FIELDS = [
  { name: "equipmentId", label: "Equipment ID", required: true },
  { name: "name", label: "Name", required: true },
  { name: "type", label: "Type", required: true },
  { name: "manufacturer", label: "Manufacturer" },
  { name: "model", label: "Model" },
  { name: "year", label: "Year", type: "number" },
  { name: "location", label: "Location" },
  { name: "status", label: "Status", type: "select", options: EQUIPMENT_STATUS, required: true },
  { name: "purchaseDate", label: "Purchase Date", type: "date" },
];

const TYRE_FIELDS = [
  { name: "tyreId", label: "Tyre ID", required: true },
  { name: "tyreNumber", label: "Tyre Number", required: true },
  { name: "equipmentId", label: "Equipment ID", required: true },
  { name: "brand", label: "Brand", required: true },
  { name: "size", label: "Size", required: true },
  { name: "position", label: "Position" },
  { name: "status", label: "Status", type: "select", options: TYRE_STATUS, required: true },
  { name: "purchaseDate", label: "Purchase Date", type: "date" },
  { name: "installationDate", label: "Installation Date", type: "date" },
  { name: "lastInspectionDate", label: "Last Inspection Date", type: "date" },
  { name: "notes", label: "Notes", type: "textarea", full: true },
];

const MAINT_FIELDS = [
  { name: "maintenanceId", label: "Maintenance ID", required: true },
  { name: "equipmentId", label: "Equipment ID", required: true },
  { name: "tyreId", label: "Tyre ID" },
  { name: "maintenanceType", label: "Maintenance Type", required: true, type: "select", options: [
    { value: "routine", label: "Routine" },
    { value: "repair", label: "Repair" },
    { value: "inspection", label: "Inspection" },
    { value: "replacement", label: "Replacement" },
  ]},
  { name: "issue", label: "Issue", type: "textarea", full: true },
  { name: "serviceDate", label: "Service Date", type: "date", required: true },
  { name: "technician", label: "Technician" },
  { name: "cost", label: "Cost (₹)", type: "number" },
  { name: "status", label: "Status", type: "select", options: MAINT_STATUS, required: true },
  { name: "nextServiceDate", label: "Next Service Date", type: "date" },
  { name: "notes", label: "Notes", type: "textarea", full: true },
];

const SPARE_FIELDS = [
  { name: "partId", label: "Part ID", required: true },
  { name: "partName", label: "Part Name", required: true },
  { name: "category", label: "Category", required: true },
  { name: "equipmentType", label: "Equipment Type" },
  { name: "quantity", label: "Quantity", type: "number", required: true },
  { name: "minimumStock", label: "Minimum Stock", type: "number", required: true },
  { name: "unitCost", label: "Unit Cost (₹)", type: "number" },
  { name: "supplier", label: "Supplier" },
  { name: "location", label: "Storage Location" },
  { name: "lastRestocked", label: "Last Restocked", type: "date" },
  { name: "notes", label: "Notes", type: "textarea", full: true },
];

/* ------------------------------------------------------------------ */
/*  HELPERS                                                            */
/* ------------------------------------------------------------------ */
const norm = (s) => String(s || "").trim().toLowerCase().replace(/[\s_]+/g, "-");
const pretty = (s) =>
  String(s || "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

const fmtDate = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  if (isNaN(d)) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};
const toInput = (v) => {
  if (!v) return "";
  const d = new Date(v);
  return isNaN(d) ? "" : d.toISOString().slice(0, 10);
};
const money = (v) =>
  v === undefined || v === null || v === ""
    ? "—"
    : "₹" + Number(v).toLocaleString("en-IN", { maximumFractionDigits: 0 });

const unwrap = (data, keys) => {
  if (Array.isArray(data)) return data;
  for (const k of keys) if (Array.isArray(data?.[k])) return data[k];
  return [];
};

async function request(path, options = {}) {
  const res = await fetch(API + path, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
    ...options,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* empty body */
  }
  if (!res.ok) throw new Error(data?.message || data?.error || `Request failed (${res.status})`);
  return data;
}

const mDate = (m) => m.serviceDate || m.date || m.createdAt;
const dash = (v) => (v === undefined || v === null || v === "" ? "—" : v);

/* ------------------------------------------------------------------ */
/*  ICONS                                                              */
/* ------------------------------------------------------------------ */
const ICONS = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </>
  ),
  equipment: (
    <>
      <path d="M2 6h12v10H2z" />
      <path d="M14 10h4l3 3v3h-7z" />
      <circle cx="6.5" cy="18" r="2" />
      <circle cx="17.5" cy="18" r="2" />
    </>
  ),
  tyre: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v6M12 15v6M3 12h6M15 12h6" />
    </>
  ),
  maintenance: (
    <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.2-.6-.6-2.2z" />
  ),
  spareParts: (
    <>
      <path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />
      <path d="M16 3H8L6 7h12l-2-4z" />
      <path d="M12 12v4M10 14h4" />
    </>
  ),
  notifications: (
    <>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </>
  ),
  reports: (
    <>
      <path d="M4 4v16h16" />
      <path d="M8 16v-5M12 16V8M16 16v-3" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" />
    </>
  ),
  bell: (
    <>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  edit: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
    </>
  ),
  trash: (
    <>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
    </>
  ),
  x: <path d="M6 6l12 12M18 6 6 18" />,
  logout: (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5M21 12H9" />
    </>
  ),
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  alert: (
    <>
      <path d="M12 3 2 20h20z" />
      <path d="M12 10v4M12 17.5v.01" />
    </>
  ),
  inbox: (
    <>
      <path d="M3 13h5l1 3h6l1-3h5" />
      <path d="M5 5h14l2 8v6H3v-6z" />
    </>
  ),
  check: <path d="m5 12 5 5 9-10" />,
  checkDouble: (
    <>
      <path d="m1 12 5 5 9-10" />
      <path d="m7 12 5 5 9-10" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8v.01" />
    </>
  ),
  pickaxe: (
    <>
      <path d="M14 10 4 20" />
      <path d="M5 8c3-4 9-5 14-2-1 3-1 5-3 7-1-3-3-5-6-6z" />
    </>
  ),
  warning: (
    <>
      <path d="M12 3 2 20h20z" />
      <path d="M12 9v4" />
      <path d="M12 17.5v.01" />
    </>
  ),
  package: (
    <>
      <path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <path d="M3.27 6.96 12 12.01l8.73-5.05M12 22.08V12" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
};

function Icon({ name, size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONS[name]}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  SMALL UI PIECES                                                    */
/* ------------------------------------------------------------------ */
function Badge({ status }) {
  const key = norm(status) || "unknown";
  return (
    <span className={`badge badge-${key}`}>
      <i />
      {pretty(status) || "Unknown"}
    </span>
  );
}

function PageHead({ title, subtitle, action }) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

function Kpi({ icon, label, value, tone = "navy", hint, onClick }) {
  return (
    <div
      className={`kpi ${onClick ? "kpi-clickable" : ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className={`kpi-icon tone-${tone}`}>
        <Icon name={icon} size={20} />
      </div>
      <div>
        <span className="kpi-label">{label}</span>
        <strong className="kpi-value">{value}</strong>
        {hint && <span className="kpi-hint">{hint}</span>}
      </div>
    </div>
  );
}

function State({ icon = "inbox", title, text, action, loading }) {
  return (
    <div className="state">
      <div className="state-icon">{loading ? <span className="spinner" /> : <Icon name={icon} size={26} />}</div>
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}

function Toasts({ toasts, dismiss }) {
  return (
    <div className="toasts">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <Icon name={t.type === "success" ? "check" : "alert"} size={18} />
          <span>{t.message}</span>
          <button onClick={() => dismiss(t.id)} aria-label="Dismiss">
            <Icon name="x" size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

function Modal({ title, subtitle, onClose, children, wide }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? "modal-wide" : ""}`} role="dialog" aria-modal="true">
        <div className="modal-head">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="x" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  GENERIC FORM MODAL                                                 */
/* ------------------------------------------------------------------ */
function FormModal({ cfg, item, onClose, onSave }) {
  const editing = !!item;
  const [values, setValues] = useState(() => {
    const v = {};
    cfg.fields.forEach((f) => {
      if (editing) v[f.name] = f.type === "date" ? toInput(item[f.name]) : (item[f.name] ?? "");
      else v[f.name] = f.type === "select" ? (f.options?.[0]?.value ?? "") : "";
    });
    return v;
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState("");

  const setVal = (name, val) => {
    setValues((p) => ({ ...p, [name]: val }));
    if (errors[name]) setErrors((p) => ({ ...p, [name]: "" }));
  };

  const validate = () => {
    const e = {};
    cfg.fields.forEach((f) => {
      const v = String(values[f.name] ?? "").trim();
      if (f.required && !v) e[f.name] = `${f.label.replace(" (₹)", "")} is required`;
      else if (f.type === "number" && v) {
        const n = Number(v);
        if (isNaN(n) || n < 0) e[f.name] = "Enter a valid non-negative number";
        else if (f.name === "year" && (n < 1950 || n > new Date().getFullYear() + 1))
          e[f.name] = "Enter a valid year";
      }
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    const payload = {};
    cfg.fields.forEach((f) => {
      const raw = values[f.name];
      const empty = raw === "" || raw === null || raw === undefined;
      if (empty) {
        if (editing) payload[f.name] = f.type === "date" || f.type === "number" ? null : "";
        return;
      }
      payload[f.name] = f.type === "number" ? Number(raw) : typeof raw === "string" ? raw.trim() : raw;
    });
    setSaving(true);
    setServerError("");
    try {
      await onSave(payload, item);
    } catch (err) {
      setServerError(err.message || "Something went wrong");
      setSaving(false);
    }
  };

  return (
    <Modal
      wide
      title={editing ? `Edit ${cfg.singular}` : `Add ${cfg.singular}`}
      subtitle={editing ? "Update the details below and save your changes." : "Fill in the details to create a new record."}
      onClose={onClose}
    >
      <form onSubmit={submit} noValidate>
        <div className="modal-body">
          {serverError && (
            <div className="form-alert">
              <Icon name="alert" size={16} /> {serverError}
            </div>
          )}
          <div className="form-grid">
            {cfg.fields.map((f) => (
              <div key={f.name} className={`field ${f.full ? "full" : ""} ${errors[f.name] ? "has-error" : ""}`}>
                <label htmlFor={f.name}>
                  {f.label}
                  {f.required && <span className="req"> *</span>}
                </label>
                {f.type === "select" ? (
                  <select id={f.name} value={values[f.name]} onChange={(e) => setVal(f.name, e.target.value)}>
                    {f.options.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : f.type === "textarea" ? (
                  <textarea
                    id={f.name}
                    rows={3}
                    value={values[f.name]}
                    onChange={(e) => setVal(f.name, e.target.value)}
                  />
                ) : (
                  <input
                    id={f.name}
                    type={f.type || "text"}
                    min={f.type === "number" ? 0 : undefined}
                    step={["cost", "unitCost"].includes(f.name) ? "0.01" : undefined}
                    value={values[f.name]}
                    onChange={(e) => setVal(f.name, e.target.value)}
                  />
                )}
                {errors[f.name] && <span className="err">{errors[f.name]}</span>}
              </div>
            ))}
            {cfg.endpoint === "/spare-parts" && (
              <div className="field full" style={{ background: "var(--bg)", padding: "12px 14px", borderRadius: "8px", border: "1px solid var(--border)", marginTop: "4px" }}>
                <label style={{ margin: 0, fontWeight: 600, fontSize: "12.5px" }}>Live Stock Status (Calculated from Quantity &amp; Min Stock):</label>
                <div style={{ marginTop: "6px", display: "flex", alignItems: "center", gap: "10px" }}>
                  <Badge status={
                    Number(values.quantity || 0) <= 0
                      ? "out-of-stock"
                      : Number(values.minimumStock || 0) > 0 && Number(values.quantity || 0) <= Number(values.minimumStock || 0)
                      ? "low-stock"
                      : "available"
                  } />
                  <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                    Quantity: {Number(values.quantity || 0)} | Minimum Stock: {Number(values.minimumStock || 0)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="modal-foot">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving && <span className="spinner spinner-sm" />}
            {editing ? "Save Changes" : `Add ${cfg.singular}`}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ViewDetailsModal({ cfg, item, onClose, onEdit, canEdit }) {
  if (!item) return null;
  return (
    <Modal
      wide
      title={`${cfg.singular} Details`}
      subtitle={`Viewing record for ${item[cfg.idKey] || item.name || ""}`}
      onClose={onClose}
    >
      <div className="modal-body">
        <div className="details-grid">
          {cfg.fields.map((f) => {
            const raw = item[f.name];
            let displayVal = raw;
            if (raw === undefined || raw === null || raw === "") displayVal = "—";
            else if (f.type === "date") displayVal = fmtDate(raw);
            else if (f.name === "status") displayVal = <Badge status={raw} />;
            else if (["cost", "unitCost"].includes(f.name)) displayVal = money(raw);
            return (
              <div key={f.name} className={`detail-field ${f.full ? "full" : ""}`}>
                <span className="detail-label">{f.label}</span>
                <span className="detail-val">{displayVal}</span>
              </div>
            );
          })}
          {item.createdAt && (
            <div className="detail-field">
              <span className="detail-label">Created At</span>
              <span className="detail-val">{fmtDate(item.createdAt)}</span>
            </div>
          )}
          {item.updatedAt && (
            <div className="detail-field">
              <span className="detail-label">Last Updated</span>
              <span className="detail-val">{fmtDate(item.updatedAt)}</span>
            </div>
          )}
        </div>
      </div>
      <div className="modal-foot">
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          Close
        </button>
        {canEdit && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              onClose();
              onEdit(item);
            }}
          >
            <Icon name="edit" size={15} /> Edit {cfg.singular}
          </button>
        )}
      </div>
    </Modal>
  );
}

function ConfirmModal({ title, text, busy, onCancel, onConfirm }) {
  return (
    <Modal title={title} onClose={onCancel}>
      <div className="modal-body confirm">
        <div className="confirm-icon">
          <Icon name="trash" size={22} />
        </div>
        <p>{text}</p>
      </div>
      <div className="modal-foot">
        <button className="btn btn-ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button className="btn btn-danger" onClick={onConfirm} disabled={busy}>
          {busy && <span className="spinner spinner-sm" />}
          Delete
        </button>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/*  RESOURCE PAGE (Equipment / Tyres / Maintenance / Spare Parts)      */
/* ------------------------------------------------------------------ */
function ResourcePage({ cfg, items, info, onReload, notify, kpis, userRole, initialQuery = "" }) {
  const [query, setQuery] = useState(initialQuery);
  const [filter, setFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [equipmentTypeFilter, setEquipmentTypeFilter] = useState("all");
  const [modal, setModal] = useState(null);
  const [viewItem, setViewItem] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
    }
  }, [initialQuery]);

  const canEdit = cfg.editRoles ? cfg.editRoles.includes(userRole) : true;
  const canDelete = cfg.deleteRoles ? cfg.deleteRoles.includes(userRole) : true;

  const categories = useMemo(() => {
    const set = new Set();
    items.forEach((it) => it.category && set.add(it.category));
    return Array.from(set).sort();
  }, [items]);

  const equipmentTypes = useMemo(() => {
    const set = new Set();
    items.forEach((it) => it.equipmentType && set.add(it.equipmentType));
    return Array.from(set).sort();
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((it) => {
      if (filter !== "all" && norm(it.status) !== filter) return false;
      if (categoryFilter !== "all" && it.category !== categoryFilter) return false;
      if (equipmentTypeFilter !== "all" && it.equipmentType !== equipmentTypeFilter) return false;
      if (!q) return true;
      return cfg.searchKeys.some((k) => String(it[k] ?? "").toLowerCase().includes(q));
    });
  }, [items, query, filter, categoryFilter, equipmentTypeFilter, cfg]);

  const save = async (payload, existing) => {
    if (existing) await request(`${cfg.endpoint}/${existing._id}`, { method: "PUT", body: JSON.stringify(payload) });
    else await request(cfg.endpoint, { method: "POST", body: JSON.stringify(payload) });
    notify("success", existing ? `${cfg.singular} updated successfully` : `${cfg.singular} added successfully`);
    setModal(null);
    onReload();
  };

  const remove = async () => {
    setDeleting(true);
    try {
      await request(`${cfg.endpoint}/${toDelete._id}`, { method: "DELETE" });
      notify("success", `${cfg.singular} deleted successfully`);
      setToDelete(null);
      onReload();
    } catch (err) {
      notify("error", err.message || "Failed to delete record");
    }
    setDeleting(false);
  };

  const hasFilters = query || filter !== "all" || categoryFilter !== "all" || equipmentTypeFilter !== "all";

  const clearAllFilters = () => {
    setQuery("");
    setFilter("all");
    setCategoryFilter("all");
    setEquipmentTypeFilter("all");
  };

  return (
    <>
      <PageHead
        title={cfg.title}
        subtitle={cfg.subtitle}
        action={
          canEdit ? (
            <button className="btn btn-primary" onClick={() => setModal({})}>
              <Icon name="plus" size={16} /> Add {cfg.singular}
            </button>
          ) : null
        }
      />

      {kpis && <div className="kpi-grid">{kpis}</div>}

      <section className="panel">
        <div className="toolbar">
          <div className="search">
            <Icon name="search" size={16} />
            <input
              placeholder={cfg.searchPlaceholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button onClick={() => setQuery("")} aria-label="Clear search">
                <Icon name="x" size={14} />
              </button>
            )}
          </div>
          <div className="toolbar-right toolbar-filters">
            {categories.length > 0 && (
              <label className="select-wrap">
                <span>Category</span>
                <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                  <option value="all">All Categories</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </label>
            )}
            {equipmentTypes.length > 0 && (
              <label className="select-wrap">
                <span>Equipment</span>
                <select value={equipmentTypeFilter} onChange={(e) => setEquipmentTypeFilter(e.target.value)}>
                  <option value="all">All Equipment Types</option>
                  {equipmentTypes.map((et) => (
                    <option key={et} value={et}>{et}</option>
                  ))}
                </select>
              </label>
            )}
            {cfg.statusOptions && (
              <label className="select-wrap">
                <span>Status</span>
                <select value={filter} onChange={(e) => setFilter(e.target.value)}>
                  <option value="all">All Statuses</option>
                  {cfg.statusOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <span className="count">
              {filtered.length} of {items.length}
            </span>
          </div>
        </div>

        {info.loading ? (
          <State loading title={`Loading ${cfg.title.toLowerCase()}…`} text="Fetching records from the server." />
        ) : info.error ? (
          <State
            icon="alert"
            title="Unable to load data"
            text={`${info.error}. Make sure the backend is running on ${API}.`}
            action={
              <button className="btn btn-outline" onClick={onReload}>
                Try again
              </button>
            }
          />
        ) : filtered.length === 0 ? (
          <State
            title={hasFilters ? "No matching records" : `No ${cfg.plural} yet`}
            text={
              hasFilters
                ? "Try adjusting your search or filters."
                : `Get started by adding your first ${cfg.singular.toLowerCase()}.`
            }
            action={
              hasFilters ? (
                <button
                  className="btn btn-outline"
                  onClick={clearAllFilters}
                >
                  Clear filters
                </button>
              ) : canEdit ? (
                <button className="btn btn-primary" onClick={() => setModal({})}>
                  <Icon name="plus" size={16} /> Add {cfg.singular}
                </button>
              ) : null
            }
          />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  {cfg.columns.map((c) => (
                    <th key={c.label}>{c.label}</th>
                  ))}
                  <th className="col-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((it) => (
                  <tr key={it._id}>
                    {cfg.columns.map((c) => (
                      <td key={c.label} className={c.className}>
                        {c.render(it)}
                      </td>
                    ))}
                    <td className="col-actions">
                      <div className="row-actions">
                        <button className="icon-btn" title="View details" onClick={() => setViewItem(it)}>
                          <Icon name="eye" size={16} />
                        </button>
                        {canEdit && (
                          <button className="icon-btn" title="Edit" onClick={() => setModal({ item: it })}>
                            <Icon name="edit" size={16} />
                          </button>
                        )}
                        {canDelete && (
                          <button className="icon-btn danger" title="Delete" onClick={() => setToDelete(it)}>
                            <Icon name="trash" size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {viewItem && (
        <ViewDetailsModal
          cfg={cfg}
          item={viewItem}
          onClose={() => setViewItem(null)}
          onEdit={(item) => setModal({ item })}
          canEdit={canEdit}
        />
      )}
      {modal && <FormModal cfg={cfg} item={modal.item} onClose={() => setModal(null)} onSave={save} />}
      {toDelete && (
        <ConfirmModal
          title={`Delete ${cfg.singular}`}
          text={`Are you sure you want to delete ${cfg.singular.toLowerCase()} "${toDelete[cfg.idKey] || ""}"? This action cannot be undone.`}
          busy={deleting}
          onCancel={() => setToDelete(null)}
          onConfirm={remove}
        />
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  RESOURCE CONFIGS                                                    */
/* ------------------------------------------------------------------ */
const CONFIGS = {
  equipment: {
    singular: "Equipment",
    plural: "equipment records",
    idKey: "equipmentId",
    title: "Equipment Management",
    subtitle: "Register, track and manage the mining equipment fleet across all sites.",
    endpoint: "/equipment",
    fields: EQUIPMENT_FIELDS,
    statusOptions: EQUIPMENT_STATUS,
    searchKeys: ["equipmentId", "name", "type", "manufacturer", "location"],
    searchPlaceholder: "Search by ID, name, type, manufacturer or location…",
    editRoles: ["admin", "maintenance"],
    deleteRoles: ["admin"],
    columns: [
      { label: "Equipment ID", className: "mono strong", render: (i) => dash(i.equipmentId) },
      { label: "Name", render: (i) => dash(i.name) },
      { label: "Type", render: (i) => dash(i.type) },
      { label: "Manufacturer", render: (i) => dash(i.manufacturer) },
      { label: "Model", render: (i) => dash(i.model) },
      { label: "Location", render: (i) => dash(i.location) },
      { label: "Status", render: (i) => <Badge status={i.status} /> },
    ],
  },
  tyres: {
    singular: "Tyre",
    plural: "tyres",
    idKey: "tyreId",
    title: "Tyre Management",
    subtitle: "Monitor tyre condition, assignment and inspection history for every machine.",
    endpoint: "/tyre",
    fields: TYRE_FIELDS,
    statusOptions: TYRE_STATUS,
    searchKeys: ["tyreId", "tyreNumber", "equipmentId", "brand", "size"],
    searchPlaceholder: "Search by tyre ID, number, equipment, brand or size…",
    editRoles: ["admin", "maintenance"],
    deleteRoles: ["admin"],
    columns: [
      { label: "Tyre ID", className: "mono strong", render: (i) => dash(i.tyreId) },
      { label: "Tyre Number", render: (i) => dash(i.tyreNumber) },
      { label: "Equipment", className: "mono", render: (i) => dash(i.equipmentId) },
      { label: "Brand", render: (i) => dash(i.brand) },
      { label: "Size", render: (i) => dash(i.size) },
      { label: "Position", render: (i) => dash(i.position) },
      { label: "Status", render: (i) => <Badge status={i.status} /> },
      { label: "Last Inspection", render: (i) => fmtDate(i.lastInspectionDate) },
    ],
  },
  maintenance: {
    singular: "Maintenance",
    plural: "maintenance records",
    idKey: "maintenanceId",
    title: "Maintenance Management",
    subtitle: "Schedule, track and review service work on equipment and tyres.",
    endpoint: "/maintenance",
    fields: MAINT_FIELDS,
    statusOptions: MAINT_STATUS,
    searchKeys: ["equipmentId", "tyreId", "technician", "maintenanceType", "maintenanceId"],
    searchPlaceholder: "Search by equipment, tyre, technician or type…",
    editRoles: ["admin", "maintenance"],
    deleteRoles: ["admin"],
    columns: [
      { label: "Maintenance ID", className: "mono strong", render: (i) => dash(i.maintenanceId) },
      { label: "Equipment", className: "mono", render: (i) => dash(i.equipmentId) },
      { label: "Tyre", className: "mono", render: (i) => dash(i.tyreId) },
      { label: "Type", render: (i) => dash(i.maintenanceType || i.type) },
      { label: "Service Date", render: (i) => fmtDate(mDate(i)) },
      { label: "Technician", render: (i) => dash(i.technician) },
      { label: "Cost", className: "num", render: (i) => money(i.cost) },
      { label: "Status", render: (i) => <Badge status={i.status} /> },
    ],
  },
  spareParts: {
    singular: "Spare Part",
    plural: "spare parts",
    idKey: "partId",
    title: "Spare Parts Management",
    subtitle: "Track and manage spare parts inventory, stock levels and suppliers.",
    endpoint: "/spare-parts",
    fields: SPARE_FIELDS,
    statusOptions: SPARE_STATUS,
    searchKeys: ["partId", "partName", "category", "equipmentType", "supplier"],
    searchPlaceholder: "Search by ID, name, category, equipment type or supplier…",
    editRoles: ["admin", "maintenance"],
    deleteRoles: ["admin"],
    columns: [
      { label: "Part ID", className: "mono strong", render: (i) => dash(i.partId) },
      { label: "Part Name", render: (i) => dash(i.partName) },
      { label: "Category", render: (i) => dash(i.category) },
      { label: "Equipment Type", render: (i) => dash(i.equipmentType) },
      { label: "Qty", className: "num", render: (i) => dash(i.quantity) },
      { label: "Min Stock", className: "num", render: (i) => dash(i.minimumStock) },
      { label: "Unit Cost", className: "num", render: (i) => money(i.unitCost) },
      { label: "Supplier", render: (i) => dash(i.supplier) },
      { label: "Location", render: (i) => dash(i.location) },
      { label: "Status", render: (i) => <Badge status={i.status} /> },
    ],
  },
};

/* ------------------------------------------------------------------ */
/*  DASHBOARD                                                          */
/* ------------------------------------------------------------------ */
function Dashboard({ data, status, setTab, onReload, unreadCount }) {
  const { equipment, tyres, maintenance, spareParts } = data;
  const count = (list, s) => list.filter((x) => norm(x.status) === s).length;
  const total = equipment.length;
  const now = new Date();
  const overdueMaint = maintenance.filter(
    (m) =>
      m.serviceDate &&
      new Date(m.serviceDate) < now &&
      ["scheduled", "in-progress"].includes(norm(m.status))
  ).length;
  const scheduledMaint = count(maintenance, "scheduled");
  const inProgressMaint = count(maintenance, "in-progress");
  const completedMaint = count(maintenance, "completed");

  const overview = [
    { key: "active", label: "Active", tone: "green", n: count(equipment, "active") },
    { key: "maintenance", label: "Maintenance", tone: "amber", n: count(equipment, "maintenance") },
    { key: "inactive", label: "Inactive", tone: "gray", n: count(equipment, "inactive") },
  ];
  const recent = [...maintenance]
    .sort((a, b) => new Date(mDate(b) || 0) - new Date(mDate(a) || 0))
    .slice(0, 6);

  const anyError = Object.values(status).some((s) => s.error);
  const loading = Object.values(status).some((s) => s.loading);
  const v = (n) => (loading ? "…" : n);

  const lowStock = spareParts.filter((p) => p.status === "low-stock").length;
  const outOfStock = spareParts.filter((p) => p.status === "out-of-stock").length;
  const availableParts = spareParts.filter((p) => p.status === "available").length;

  return (
    <>
      <PageHead
        title="Operations Dashboard"
        subtitle="Live overview of mining equipment, tyre inventory and maintenance activity."
      />

      {anyError && (
        <div className="banner">
          <Icon name="alert" size={18} />
          <span>Some data could not be loaded. Check that the backend is running on {API}.</span>
          <button className="btn btn-outline btn-sm" onClick={onReload}>
            Retry
          </button>
        </div>
      )}

      <div className="kpi-grid">
        <Kpi
          icon="equipment"
          label="Total Equipment"
          value={v(equipment.length)}
          tone="navy"
          hint="Registered machines"
          onClick={() => setTab("equipment")}
        />
        <Kpi
          icon="tyre"
          label="Total Tyres"
          value={v(tyres.length)}
          tone="maroon"
          hint="In fleet inventory"
          onClick={() => setTab("tyres")}
        />
        <Kpi
          icon="maintenance"
          label="Maintenance Records"
          value={v(maintenance.length)}
          tone="blue"
          hint={`${scheduledMaint} scheduled · ${inProgressMaint} in progress`}
          onClick={() => setTab("maintenance")}
        />
        <Kpi
          icon="package"
          label="Spare Parts"
          value={v(spareParts.length)}
          tone="green"
          hint={`${availableParts} in stock`}
          onClick={() => setTab("spareParts")}
        />
      </div>

      <div className="kpi-grid">
        <Kpi
          icon="alert"
          label="Under Maintenance"
          value={v(count(equipment, "maintenance"))}
          tone="amber"
          hint="Equipment currently in service"
          onClick={() => setTab("equipment")}
        />
        <Kpi
          icon="tyre"
          label="Damaged Tyres"
          value={v(count(tyres, "damaged"))}
          tone="maroon"
          hint="Requires replacement/repair"
          onClick={() => setTab("tyres")}
        />
        <Kpi
          icon="warning"
          label="Maintenance Overdue"
          value={v(overdueMaint)}
          tone={overdueMaint > 0 ? "maroon" : "green"}
          hint={overdueMaint > 0 ? "Past scheduled service date" : "All schedules on track"}
          onClick={() => setTab("maintenance")}
        />
        <Kpi
          icon="bell"
          label="Unread Alerts"
          value={v(unreadCount || 0)}
          tone={unreadCount > 0 ? "maroon" : "green"}
          hint={unreadCount > 0 ? "Requires review" : "All caught up"}
          onClick={() => setTab("notifications")}
        />
      </div>

      <div className="kpi-grid">
        <Kpi
          icon="check"
          label="Parts Available"
          value={v(availableParts)}
          tone="green"
          hint="Ready for deployment"
          onClick={() => setTab("spareParts")}
        />
        <Kpi
          icon="warning"
          label="Low Stock Parts"
          value={v(lowStock)}
          tone="amber"
          hint="At or below minimum threshold"
          onClick={() => setTab("spareParts")}
        />
        <Kpi
          icon="alert"
          label="Out of Stock"
          value={v(outOfStock)}
          tone="maroon"
          hint="Zero units remaining"
          onClick={() => setTab("spareParts")}
        />
        <Kpi
          icon="check"
          label="Completed Services"
          value={v(completedMaint)}
          tone="navy"
          hint="Total completed work orders"
          onClick={() => setTab("maintenance")}
        />
      </div>

      <div className="grid-2">
        <section className="panel">
          <div className="panel-head">
            <h2>Equipment Status Overview</h2>
            <span className="muted">{total} total</span>
          </div>
          <div className="panel-body">
            {total === 0 ? (
              <p className="muted center">No equipment data available.</p>
            ) : (
              <>
                <div className="stack-bar">
                  {overview.map((o) => (
                    <div key={o.key} className={`seg fill-${o.tone}`} style={{ width: `${(o.n / total) * 100}%` }} />
                  ))}
                </div>
                <div className="status-list">
                  {overview.map((o) => (
                    <div key={o.key} className="status-row">
                      <div className="status-row-top">
                        <span>
                          <i className={`dot fill-${o.tone}`} />
                          {o.label}
                        </span>
                        <strong>
                          {o.n} <small>({Math.round((o.n / total) * 100)}%)</small>
                        </strong>
                      </div>
                      <div className="progress">
                        <div className={`fill-${o.tone}`} style={{ width: `${(o.n / total) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>Tyre Condition</h2>
            <span className="muted">{tyres.length} total</span>
          </div>
          <div className="panel-body">
            {tyres.length === 0 ? (
              <p className="muted center">No tyre data available.</p>
            ) : (
              <div className="mini-grid">
                {TYRE_STATUS.map((s) => (
                  <div key={s.value} className="mini">
                    <strong>{count(tyres, s.value)}</strong>
                    <Badge status={s.value} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Spare Parts summary */}
      <section className="panel">
        <div className="panel-head">
          <h2>Spare Parts Inventory</h2>
          <button className="btn btn-outline btn-sm" onClick={() => setTab("spareParts")}>
            View all
          </button>
        </div>
        <div className="panel-body">
          {spareParts.length === 0 ? (
            <p className="muted center">No spare parts data available.</p>
          ) : (
            <div className="mini-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
              {SPARE_STATUS.map((s) => (
                <div key={s.value} className="mini">
                  <strong>{count(spareParts, s.value)}</strong>
                  <Badge status={s.value} />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Recent Maintenance Activity</h2>
          <button className="btn btn-outline btn-sm" onClick={() => setTab("maintenance")}>
            View all
          </button>
        </div>
        {status.maintenance.loading ? (
          <State loading title="Loading activity…" />
        ) : recent.length === 0 ? (
          <State title="No maintenance activity" text="Maintenance records will appear here once created." />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Equipment ID</th>
                  <th>Maintenance Type</th>
                  <th>Service Date</th>
                  <th>Technician</th>
                  <th className="num">Cost</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((m) => (
                  <tr key={m._id}>
                    <td className="mono strong">{dash(m.equipmentId)}</td>
                    <td>{dash(m.maintenanceType || m.type)}</td>
                    <td>{fmtDate(mDate(m))}</td>
                    <td>{dash(m.technician)}</td>
                    <td className="num">{money(m.cost)}</td>
                    <td>
                      <Badge status={m.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  NOTIFICATIONS PAGE                                                 */
/* ------------------------------------------------------------------ */
function AlertSeverityIcon({ severity }) {
  const map = {
    critical: { icon: "alert", tone: "red" },
    high: { icon: "warning", tone: "amber" },
    medium: { icon: "info", tone: "blue" },
    low: { icon: "info", tone: "green" },
  };
  const { icon, tone } = map[severity] || map.medium;
  return (
    <div className={`notif-icon tone-${tone}`}>
      <Icon name={icon} size={16} />
    </div>
  );
}

function NotificationsPage({ alerts, loading, error, onMarkRead, onMarkAllRead, onReload, onNavigate }) {
  const [filter, setFilter] = useState("all"); // all | unread | read

  const filtered = useMemo(() => {
    if (filter === "unread") return alerts.filter((a) => !a.isRead);
    if (filter === "read") return alerts.filter((a) => a.isRead);
    return alerts;
  }, [alerts, filter]);

  const unreadCount = alerts.filter((a) => !a.isRead).length;

  return (
    <>
      <PageHead
        title="Notifications"
        subtitle="System alerts for stock levels, maintenance schedules and tyre conditions."
        action={
          unreadCount > 0 ? (
            <button className="btn btn-outline" onClick={onMarkAllRead}>
              <Icon name="checkDouble" size={16} />
              Mark all as read ({unreadCount})
            </button>
          ) : null
        }
      />

      <section className="panel">
        <div className="toolbar">
          <div className="toolbar-right" style={{ width: "100%" }}>
            <div style={{ display: "flex", gap: "8px" }}>
              {["all", "unread", "read"].map((f) => (
                <button
                  key={f}
                  className={`btn btn-sm ${filter === f ? "btn-primary" : "btn-outline"}`}
                  onClick={() => setFilter(f)}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                  {f === "unread" && unreadCount > 0 && (
                    <span className="bell-dot" style={{ position: "static", transform: "none", marginLeft: "4px" }}>
                      {unreadCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <span className="count">{filtered.length} notifications</span>
          </div>
        </div>

        {loading ? (
          <State loading title="Loading notifications…" />
        ) : error ? (
          <State
            icon="alert"
            title="Could not load notifications"
            text={error}
            action={<button className="btn btn-outline" onClick={onReload}>Try again</button>}
          />
        ) : filtered.length === 0 ? (
          <State
            icon="bell"
            title={filter === "unread" ? "No unread notifications" : "No notifications"}
            text={filter === "unread" ? "You're all caught up!" : "Notifications will appear here when conditions are detected."}
          />
        ) : (
          <div className="notif-list">
            {filtered.map((a) => (
              <div key={a._id} className={`notif-item ${a.isRead ? "notif-read" : "notif-unread"}`}>
                <AlertSeverityIcon severity={a.severity} />
                <div className="notif-body">
                  <div className="notif-title">
                    {!a.isRead && <span className="notif-dot" />}
                    <strong>{a.title}</strong>
                    <span className={`badge badge-${a.type}`} style={{ marginLeft: "8px", fontSize: "11px" }}>
                      {pretty(a.type)}
                    </span>
                    <Badge status={a.severity} />
                    {a.isResolved && (
                      <span className="badge badge-inactive" style={{ marginLeft: "6px", fontSize: "10.5px" }}>
                        Resolved
                      </span>
                    )}
                  </div>
                  <p className="notif-message">{a.message}</p>
                  <div className="notif-meta">
                    <span>{fmtDate(a.createdAt)}</span>
                    {a.referenceId && <span className="mono">Ref: {a.referenceId}</span>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center", flexShrink: 0 }}>
                  {a.referenceId && onNavigate && (
                    <button
                      className="btn btn-sm btn-outline"
                      onClick={() => onNavigate(a.type, a.referenceId)}
                      title={`View ${a.type} record`}
                    >
                      <Icon name="eye" size={14} />
                      View record
                    </button>
                  )}
                  {!a.isRead && (
                    <button className="btn btn-sm btn-outline" onClick={() => onMarkRead(a._id)}>
                      <Icon name="check" size={14} />
                      Mark read
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  REPORTS                                                            */
/* ------------------------------------------------------------------ */
function Reports({ data }) {
  const { equipment, tyres, maintenance, spareParts } = data;
  const totalCost = maintenance.reduce((s, m) => s + (Number(m.cost) || 0), 0);
  const avg = maintenance.length ? totalCost / maintenance.length : 0;
  const done = maintenance.filter((m) => norm(m.status) === "completed").length;
  const rate = maintenance.length ? Math.round((done / maintenance.length) * 100) : 0;
  const damaged = tyres.filter((t) => norm(t.status) === "damaged").length;
  const totalPartsValue = spareParts.reduce((s, p) => s + (Number(p.unitCost || 0) * Number(p.quantity || 0)), 0);

  const getStatusData = (items, field = "status") => {
    const counts = {};
    items.forEach((item) => {
      const status = item[field] || "unknown";
      counts[status] = (counts[status] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({
      name: pretty(name),
      value
    }));
  };

  const equipmentStatus = useMemo(() => getStatusData(equipment), [equipment]);
  const tyreStatus = useMemo(() => getStatusData(tyres), [tyres]);
  const maintenanceStatus = useMemo(() => getStatusData(maintenance), [maintenance]);

  const equipmentTypeData = useMemo(() => {
    const types = {};
    equipment.forEach((item) => {
      const type = item.type || "Other";
      types[type] = (types[type] || 0) + 1;
    });
    return Object.entries(types).map(([name, count]) => ({ name, count }));
  }, [equipment]);

  const sparePartsStockData = useMemo(() => {
    return spareParts.slice(0, 10).map((part) => ({
      name: part.partName || part.partId || "Part",
      quantity: Number(part.quantity || 0),
      minimum: Number(part.minimumStock || 0)
    }));
  }, [spareParts]);

  const byType = useMemo(() => {
    const map = {};
    maintenance.forEach((m) => {
      const k = m.maintenanceType || m.type || "Other";
      map[k] = (map[k] || 0) + (Number(m.cost) || 0);
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [maintenance]);
  const maxType = byType.length ? byType[0][1] || 1 : 1;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcoming = maintenance
    .filter((m) => m.nextServiceDate && new Date(m.nextServiceDate) >= today)
    .sort((a, b) => new Date(a.nextServiceDate) - new Date(b.nextServiceDate))
    .slice(0, 6);

  const CHART_COLORS = ["#1b1b52", "#a61c3c", "#d97706", "#15803d", "#7c3aed", "#0891b2"];

  return (
    <>
      <PageHead title="Reports & Analytics" subtitle="Comprehensive performance, cost insights, and inventory distribution from live database records." />
      <div className="kpi-grid">
        <Kpi icon="reports" label="Total Maintenance Cost" value={money(totalCost)} tone="maroon" />
        <Kpi icon="maintenance" label="Average Cost / Job" value={money(avg)} tone="blue" />
        <Kpi icon="check" label="Completion Rate" value={`${rate}%`} tone="green" hint={`${done} of ${maintenance.length} jobs`} />
        <Kpi icon="alert" label="Damaged Tyres" value={damaged} tone="amber" hint={`${equipment.length} machines in fleet`} />
      </div>
      <div className="kpi-grid">
        <Kpi icon="package" label="Spare Parts Catalogue" value={spareParts.length} tone="navy" />
        <Kpi icon="reports" label="Inventory Value" value={money(totalPartsValue)} tone="green" hint="Qty × unit cost" />
        <Kpi icon="alert" label="Low / Out of Stock" value={spareParts.filter((p) => p.status !== "available").length} tone="amber" />
        <Kpi icon="tyre" label="Tyres Replaced" value={tyres.filter((t) => norm(t.status) === "replaced").length} tone="maroon" />
      </div>

      <div className="chart-grid">
        <div className="chart-card">
          <h3>Equipment Status Distribution</h3>
          {equipmentStatus.length === 0 ? (
            <p className="muted center" style={{ padding: "40px 0" }}>No equipment data available.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={equipmentStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} label>
                  {equipmentStatus.map((_, i) => (
                    <Cell key={`eq-cell-${i}`} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="chart-card">
          <h3>Tyre Condition Overview</h3>
          {tyreStatus.length === 0 ? (
            <p className="muted center" style={{ padding: "40px 0" }}>No tyre data available.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={tyreStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} label>
                  {tyreStatus.map((_, i) => (
                    <Cell key={`tyre-cell-${i}`} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="chart-card">
          <h3>Equipment Fleet by Type</h3>
          {equipmentTypeData.length === 0 ? (
            <p className="muted center" style={{ padding: "40px 0" }}>No equipment data available.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={equipmentTypeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#1b1b52" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="chart-card">
          <h3>Maintenance Status Breakdown</h3>
          {maintenanceStatus.length === 0 ? (
            <p className="muted center" style={{ padding: "40px 0" }}>No maintenance data available.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={maintenanceStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} label>
                  {maintenanceStatus.map((_, i) => (
                    <Cell key={`maint-cell-${i}`} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="chart-card full-width">
          <h3>Spare Parts Stock vs. Minimum Threshold</h3>
          {sparePartsStockData.length === 0 ? (
            <p className="muted center" style={{ padding: "40px 0" }}>No spare parts data available.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={sparePartsStockData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="quantity" name="Current Stock" fill="#1b1b52" radius={[4, 4, 0, 0]} />
                <Bar dataKey="minimum" name="Minimum Required" fill="#a61c3c" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid-2" style={{ marginTop: "20px" }}>
        <section className="panel">
          <div className="panel-head">
            <h2>Cost by Maintenance Type</h2>
          </div>
          <div className="panel-body">
            {byType.length === 0 ? (
              <p className="muted center">No cost data available.</p>
            ) : (
              <div className="status-list">
                {byType.map(([k, v]) => (
                  <div key={k} className="status-row">
                    <div className="status-row-top">
                      <span>{k}</span>
                      <strong>{money(v)}</strong>
                    </div>
                    <div className="progress">
                      <div className="fill-maroon" style={{ width: `${(v / maxType) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
        <section className="panel">
          <div className="panel-head">
            <h2>Upcoming Services</h2>
          </div>
          <div className="panel-body">
            {upcoming.length === 0 ? (
              <p className="muted center">No upcoming services scheduled.</p>
            ) : (
              <ul className="list">
                {upcoming.map((m) => (
                  <li key={m._id}>
                    <div>
                      <strong className="mono">{dash(m.equipmentId)}</strong>
                      <span className="muted"> · {dash(m.maintenanceType || m.type)}</span>
                    </div>
                    <span className="date-chip">{fmtDate(m.nextServiceDate)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </>
  );
}

function Settings({ onReload, notify }) {
  return (
    <>
      <PageHead title="Settings" subtitle="Application and connection information." />
      <section className="panel">
        <div className="panel-head">
          <h2>Server Connection</h2>
        </div>
        <div className="panel-body">
          <div className="info-row">
            <span>API Base URL</span>
            <code>{API}</code>
          </div>
          <div className="info-row">
            <span>Modules</span>
            <span>Equipment · Tyres · Maintenance · Spare Parts · Notifications</span>
          </div>
          <div className="info-row">
            <span>Version</span>
            <span>2.0.0</span>
          </div>
          <button
            className="btn btn-outline"
            onClick={() => {
              onReload();
              notify("success", "Data refreshed from server");
            }}
          >
            Refresh all data
          </button>
        </div>
      </section>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  NOTIFICATION BELL DROPDOWN                                         */
/* ------------------------------------------------------------------ */
function BellMenu({ alerts, unreadCount, onMarkRead, onMarkAllRead, onViewAll, onClose, onNavigate }) {
  const recent = alerts.slice(0, 8);
  return (
    <>
      <div className="bell-backdrop" onClick={onClose} />
      <div className="bell-menu">
        <div className="bell-title-row">
          <span className="bell-title">Notifications</span>
          {unreadCount > 0 && (
            <button className="btn btn-sm btn-ghost" style={{ fontSize: "12px", padding: "4px 8px" }} onClick={onMarkAllRead}>
              Mark all read
            </button>
          )}
        </div>
        {recent.length === 0 ? (
          <div className="bell-empty">You&apos;re all caught up.</div>
        ) : (
          recent.map((a) => (
            <div
              key={a._id}
              className={`bell-item ${a.isRead ? "bell-item-read" : ""}`}
              onClick={() => {
                if (!a.isRead) onMarkRead(a._id);
                if (a.referenceId && onNavigate) onNavigate(a.type, a.referenceId);
              }}
            >
              <div className={`bell-dot-sev sev-${a.severity}`} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: "12.5px", color: "var(--navy)" }}>{a.title}</div>
                <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {a.message}
                </div>
              </div>
              {!a.isRead && <span className="notif-unread-dot" />}
            </div>
          ))
        )}
        <div className="bell-footer">
          <button className="btn btn-sm btn-outline" style={{ width: "100%" }} onClick={onViewAll}>
            View all notifications
          </button>
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  APP                                                                */
/* ------------------------------------------------------------------ */
const NAV = [
  { id: "dashboard", label: "Dashboard", icon: "dashboard", group: "main" },
  { id: "equipment", label: "Equipment", icon: "equipment", group: "main" },
  { id: "tyres", label: "Tyres", icon: "tyre", group: "main" },
  { id: "maintenance", label: "Maintenance", icon: "maintenance", group: "main" },
  { id: "spareParts", label: "Spare Parts", icon: "spareParts", group: "main" },
  { id: "notifications", label: "Notifications", icon: "notifications", group: "insights" },
  { id: "reports", label: "Reports", icon: "reports", group: "insights" },
  { id: "settings", label: "Settings", icon: "settings", group: "insights" },
];

function readUser() {
  try {
    const u = JSON.parse(localStorage.getItem("user") || "null");
    return { name: u?.name || "Administrator", role: u?.role || "admin", id: u?.id || "" };
  } catch {
    return { name: "Administrator", role: "admin", id: "" };
  }
}

function DashboardApp() {
  const [tab, setTab] = useState("dashboard");
  const [sideOpen, setSideOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [data, setData] = useState({ equipment: [], tyres: [], maintenance: [], spareParts: [] });
  const [status, setStatus] = useState({
    equipment: { loading: true, error: "" },
    tyres: { loading: true, error: "" },
    maintenance: { loading: true, error: "" },
    spareParts: { loading: true, error: "" },
  });
  const [toasts, setToasts] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [alertsError, setAlertsError] = useState("");
  const [initialSearch, setInitialSearch] = useState({});
  const user = useMemo(() => readUser(), []);
  const alertGenerated = useRef(false);

  const notify = useCallback((type, message) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, type, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);
  const dismiss = (id) => setToasts((t) => t.filter((x) => x.id !== id));

  const load = useCallback(async (key) => {
    const r = RESOURCES[key];
    setStatus((s) => ({ ...s, [key]: { loading: true, error: "" } }));
    try {
      const res = await request(r.path);
      setData((d) => ({ ...d, [key]: unwrap(res, r.keys) }));
      setStatus((s) => ({ ...s, [key]: { loading: false, error: "" } }));
    } catch (err) {
      const msg = err instanceof TypeError ? "Cannot reach the server" : err.message;
      setStatus((s) => ({ ...s, [key]: { loading: false, error: msg } }));
    }
  }, []);

  const loadAll = useCallback(() => Object.keys(RESOURCES).forEach(load), [load]);

  const loadAlerts = useCallback(async () => {
    setAlertsLoading(true);
    setAlertsError("");
    try {
      const res = await request("/alerts");
      setAlerts(res.alerts || []);
    } catch (err) {
      setAlertsError(err.message || "Failed to load notifications");
    }
    setAlertsLoading(false);
  }, []);

  const generateAlerts = useCallback(async () => {
    try {
      await request("/alerts/generate", { method: "POST" });
      await loadAlerts();
    } catch {
      // Silent — alerts generation is a best-effort operation
    }
  }, [loadAlerts]);

  useEffect(() => {
    loadAll();
    loadAlerts();
    // Generate alerts once per session
    if (!alertGenerated.current) {
      alertGenerated.current = true;
      setTimeout(generateAlerts, 2000); // small delay so main data loads first
    }
  }, [loadAll, loadAlerts, generateAlerts]);

  const go = (id) => {
    setTab(id);
    setSideOpen(false);
    setBellOpen(false);
    window.scrollTo({ top: 0 });
  };

  const navigateWithSearch = (type, refId) => {
    let targetTab = "dashboard";
    if (type === "inventory") targetTab = "spareParts";
    else if (type === "maintenance") targetTab = "maintenance";
    else if (type === "tyre") targetTab = "tyres";
    else if (type === "equipment") targetTab = "equipment";

    if (refId) {
      setInitialSearch((prev) => ({ ...prev, [targetTab]: refId }));
    }
    setTab(targetTab);
    setSideOpen(false);
    setBellOpen(false);
    window.scrollTo({ top: 0 });
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    sessionStorage.clear();
    window.location.reload();
  };

  const markRead = async (id) => {
    try {
      await request(`/alerts/${id}/read`, { method: "PATCH" });
      setAlerts((prev) => prev.map((a) => (a._id === id ? { ...a, isRead: true } : a)));
    } catch (err) {
      notify("error", err.message || "Failed to mark as read");
    }
  };

  const markAllRead = async () => {
    try {
      await request("/alerts/mark-all-read", { method: "PATCH" });
      setAlerts((prev) => prev.map((a) => ({ ...a, isRead: true })));
    } catch (err) {
      notify("error", err.message || "Failed to mark all as read");
    }
  };

  const unreadCount = alerts.filter((a) => !a.isRead).length;

  const mCount = (s) => data.maintenance.filter((m) => norm(m.status) === s).length;
  const current = NAV.find((n) => n.id === tab) || NAV[0];

  const maintenanceKpis = (
    <>
      <Kpi icon="maintenance" label="Total Maintenance" value={data.maintenance.length} tone="navy" />
      <Kpi icon="reports" label="Scheduled" value={mCount("scheduled")} tone="blue" />
      <Kpi icon="alert" label="In Progress" value={mCount("in-progress")} tone="amber" />
      <Kpi icon="check" label="Completed" value={mCount("completed")} tone="green" />
    </>
  );

  const sparePartsKpis = (
    <>
      <Kpi icon="package" label="Total Parts" value={data.spareParts.length} tone="navy" />
      <Kpi icon="check" label="Available" value={data.spareParts.filter((p) => p.status === "available").length} tone="green" />
      <Kpi icon="warning" label="Low Stock" value={data.spareParts.filter((p) => p.status === "low-stock").length} tone="amber" />
      <Kpi icon="alert" label="Out of Stock" value={data.spareParts.filter((p) => p.status === "out-of-stock").length} tone="maroon" />
    </>
  );

  const navGroups = [
    { label: "Main Menu", items: NAV.filter((n) => n.group === "main") },
    { label: "Insights", items: NAV.filter((n) => n.group === "insights") },
  ];

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-left">
          <button className="icon-btn menu-btn" onClick={() => setSideOpen((o) => !o)} aria-label="Menu">
            <Icon name="menu" />
          </button>
          <div className="brand">
            <div className="brand-logo">
              <Icon name="pickaxe" size={20} />
            </div>
            <div className="brand-text">
              <strong>MineTrack</strong>
              <span>Equipment &amp; Tyre Maintenance Platform</span>
            </div>
          </div>
        </div>

        <div className="topbar-right">
          <div className="bell-wrap">
            <button
              id="notifications-bell"
              className="icon-btn light"
              onClick={() => setBellOpen((o) => !o)}
              aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
            >
              <Icon name="bell" />
              {unreadCount > 0 && <span className="bell-dot">{unreadCount}</span>}
            </button>
            {bellOpen && (
              <BellMenu
                alerts={alerts}
                unreadCount={unreadCount}
                onMarkRead={markRead}
                onMarkAllRead={markAllRead}
                onViewAll={() => go("notifications")}
                onClose={() => setBellOpen(false)}
                onNavigate={navigateWithSearch}
              />
            )}
          </div>
          <div className="user">
            <div className="avatar">{user.name.charAt(0).toUpperCase()}</div>
            <div className="user-text">
              <strong>{user.name}</strong>
              <span>{pretty(user.role)}</span>
            </div>
          </div>
          <button className="btn btn-logout" onClick={logout}>
            <Icon name="logout" size={16} />
            <span>Logout</span>
          </button>
        </div>
      </header>

      <div className="shell">
        {sideOpen && <div className="side-backdrop" onClick={() => setSideOpen(false)} />}
        <aside className={`sidebar ${sideOpen ? "open" : ""}`}>
          {navGroups.map((g) => (
            <div key={g.label}>
              <div className="nav-label">{g.label}</div>
              <nav>
                {g.items.map((n) => (
                  <button
                    key={n.id}
                    id={`nav-${n.id}`}
                    className={`nav-item ${tab === n.id ? "active" : ""}`}
                    onClick={() => go(n.id)}
                  >
                    <Icon name={n.icon} />
                    <span>{n.label}</span>
                    {n.id === "notifications" && unreadCount > 0 && (
                      <span className="nav-badge">{unreadCount}</span>
                    )}
                  </button>
                ))}
              </nav>
            </div>
          ))}
          <div className="side-foot">
            <span
              className="pulse"
              style={{
                background: Object.values(status).some((s) => s.error) ? "#e87c00" : "#22a35a",
                boxShadow: Object.values(status).some((s) => s.error)
                  ? "0 0 0 3px rgba(232,124,0,0.2)"
                  : "0 0 0 3px rgba(34, 163, 90, 0.2)",
              }}
            />
            {Object.values(status).some((s) => s.error) ? "Server unreachable" : "Connected to server"}
          </div>
        </aside>

        <main className="main">
          <div className="crumbs">
            Home <span>/</span> <strong>{current.label}</strong>
          </div>

          {tab === "dashboard" && (
            <Dashboard
              data={data}
              status={status}
              setTab={go}
              onReload={loadAll}
              unreadCount={unreadCount}
            />
          )}
          {tab === "equipment" && (
            <ResourcePage
              cfg={CONFIGS.equipment}
              items={data.equipment}
              info={status.equipment}
              onReload={() => load("equipment")}
              notify={notify}
              userRole={user.role}
              initialQuery={initialSearch.equipment || ""}
            />
          )}
          {tab === "tyres" && (
            <ResourcePage
              cfg={CONFIGS.tyres}
              items={data.tyres}
              info={status.tyres}
              onReload={() => load("tyres")}
              notify={notify}
              userRole={user.role}
              initialQuery={initialSearch.tyres || ""}
            />
          )}
          {tab === "maintenance" && (
            <ResourcePage
              cfg={CONFIGS.maintenance}
              items={data.maintenance}
              info={status.maintenance}
              onReload={() => load("maintenance")}
              notify={notify}
              kpis={maintenanceKpis}
              userRole={user.role}
              initialQuery={initialSearch.maintenance || ""}
            />
          )}
          {tab === "spareParts" && (
            <ResourcePage
              cfg={CONFIGS.spareParts}
              items={data.spareParts}
              info={status.spareParts}
              onReload={() => load("spareParts")}
              notify={notify}
              kpis={sparePartsKpis}
              userRole={user.role}
              initialQuery={initialSearch.spareParts || ""}
            />
          )}
          {tab === "notifications" && (
            <NotificationsPage
              alerts={alerts}
              loading={alertsLoading}
              error={alertsError}
              onMarkRead={markRead}
              onMarkAllRead={markAllRead}
              onReload={loadAlerts}
              onNavigate={navigateWithSearch}
            />
          )}
          {tab === "reports" && <Reports data={data} />}
          {tab === "settings" && <Settings onReload={loadAll} notify={notify} />}
        </main>
      </div>

      <Toasts toasts={toasts} dismiss={dismiss} />
    </div>
  );
}

export default function App() {
  const [loggedIn, setLoggedIn] = useState(!!localStorage.getItem("token"));

  if (!loggedIn) {
    return <Login onLogin={() => setLoggedIn(true)} />;
  }

  return <DashboardApp />;
}