/**
 * Client-side inventory export to Excel (.xlsx).
 *
 * Reads drivers, vehicles and routes via the client Firestore SDK (so it relies
 * on the signed-in admin's Firestore permissions) and builds a multi-sheet
 * workbook with clickable image links. `exceljs` is imported lazily so it is
 * only downloaded when an admin actually clicks "Download Excel".
 *
 * Sensitive KYC data (identity numbers, identity images, vehicle documents) is
 * intentionally excluded because spreadsheets are easily forwarded/shared.
 */
import { collection, getDocs, query, where, type DocumentData } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Workbook as WorkbookType, Worksheet } from "exceljs";

type Row = Record<string, unknown>;
type Doc = { id: string } & DocumentData;

const BRAND_COLOR = "FF0F766E"; // teal-700 header fill
const LINK_COLOR = "FF2563EB"; // blue-600

/* ----------------------------- helpers ----------------------------- */

/** Converts Firestore Timestamps / ISO strings / millis into a JS Date. */
function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "object") {
    const v = value as { toDate?: () => Date; seconds?: number; _seconds?: number };
    if (typeof v.toDate === "function") return v.toDate();
    const secs = v.seconds ?? v._seconds;
    if (typeof secs === "number") return new Date(secs * 1000);
  }
  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/** Makes any Firestore value safe to put in a spreadsheet cell. */
function toCell(value: unknown): string | number | boolean | Date | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  const asDate = toDate(value);
  if (asDate) return asDate;
  if (Array.isArray(value)) return value.map((v) => String(toCell(v) ?? "")).join(", ");
  return JSON.stringify(value);
}

/** "frontView" -> "Front View", "plate_number" -> "Plate Number" */
function humanize(key: string): string {
  return key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function isUrl(value: unknown): value is string {
  return typeof value === "string" && /^https?:\/\//i.test(value);
}

function driverStatus(d: DocumentData): string {
  if (d.isApproved) return "Approved";
  if (d.isRejected) return "Rejected";
  return "Pending";
}

function fullName(d: DocumentData | undefined): string {
  if (!d) return "Unknown";
  const name = [d.firstName, d.middleName, d.lastName].filter(Boolean).join(" ");
  return name || d.username || d.email || "Unknown";
}

/** Collects the union of keys across a list of objects, preserving first-seen order. */
function unionKeys(objects: (Record<string, unknown> | undefined)[]): string[] {
  const keys = new Set<string>();
  objects.forEach((o) => o && Object.keys(o).forEach((k) => keys.add(k)));
  return Array.from(keys);
}

async function fetchAll(name: string, ...constraints: Parameters<typeof query>[1][]): Promise<Doc[]> {
  const snap = await getDocs(query(collection(db, name), ...constraints));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/* --------------------------- sheet builder -------------------------- */

interface ColumnDef {
  header: string;
  key: string;
  width?: number;
  /** Render as a clickable hyperlink when the value is a URL. */
  link?: boolean;
  /** Excel number format, e.g. for dates. */
  numFmt?: string;
}

function buildSheet(wb: WorkbookType, name: string, columns: ColumnDef[], rows: Row[]): Worksheet {
  const ws = wb.addWorksheet(name, { views: [{ state: "frozen", ySplit: 1 }] });

  ws.columns = columns.map((c) => ({
    header: c.header,
    key: c.key,
    width: c.width ?? Math.max(12, Math.min(40, c.header.length + 4)),
    style: c.numFmt ? { numFmt: c.numFmt } : undefined,
  }));

  rows.forEach((r) => {
    const row = ws.addRow(
      Object.fromEntries(columns.map((c) => [c.key, c.link ? null : toCell(r[c.key])]))
    );

    // Hyperlink cells are set individually so Excel renders them as clickable links.
    columns.forEach((c) => {
      if (!c.link) return;
      const value = r[c.key];
      if (isUrl(value)) {
        const cell = row.getCell(c.key);
        cell.value = { text: value, hyperlink: value };
        cell.font = { color: { argb: LINK_COLOR }, underline: true };
      }
    });
  });

  // Header styling
  const header = ws.getRow(1);
  header.height = 22;
  header.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND_COLOR } };
    cell.alignment = { vertical: "middle", horizontal: "left" };
  });

  if (rows.length > 0) {
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };
  }

  return ws;
}

/* ----------------------------- main API ----------------------------- */

export interface InventoryExportResult {
  drivers: number;
  vehicles: number;
  routes: number;
}

export async function downloadInventoryExcel(): Promise<InventoryExportResult> {
  // 1. Load data in parallel. Admins who registered as drivers keep their
  //    driver data but have role "admin", so we pull both and filter.
  const [driverUsers, adminUsers, vehicles, routes] = await Promise.all([
    fetchAll("users", where("role", "==", "driver")),
    fetchAll("users", where("role", "==", "admin")),
    fetchAll("vehicles"),
    fetchAll("vehicleServices"),
  ]);

  const drivers = [
    ...driverUsers,
    ...adminUsers.filter((u) => u.driverCreatedAt || u.operatingCity),
  ];

  const driverMap = new Map<string, Doc>(drivers.map((d) => [d.id, d]));
  const vehicleMap = new Map<string, Doc>(vehicles.map((v) => [v.id, v]));

  const vehiclesPerDriver = new Map<string, number>();
  vehicles.forEach((v) => vehiclesPerDriver.set(v.driverId, (vehiclesPerDriver.get(v.driverId) || 0) + 1));

  const routesPerVehicle = new Map<string, number>();
  routes.forEach((r) => routesPerVehicle.set(r.vehicleId, (routesPerVehicle.get(r.vehicleId) || 0) + 1));

  // 2. Lazy-load exceljs (keeps it out of the main bundle).
  const ExcelJS = await import("exceljs");
  const Workbook = (ExcelJS.Workbook ?? (ExcelJS as unknown as { default: typeof ExcelJS }).default.Workbook);
  const wb = new Workbook();
  wb.creator = "Nomo Cars Admin";
  wb.created = new Date();

  const DATE_FMT = "yyyy-mm-dd hh:mm";

  // ---- Summary sheet ----
  const approvedDrivers = drivers.filter((d) => d.isApproved).length;
  const approvedVehicles = vehicles.filter((v) => v.isApproved).length;
  buildSheet(
    wb,
    "Summary",
    [
      { header: "Metric", key: "metric", width: 32 },
      { header: "Value", key: "value", width: 24 },
    ],
    [
      { metric: "Generated At", value: new Date().toLocaleString() },
      { metric: "Total Drivers", value: drivers.length },
      { metric: "Approved Drivers", value: approvedDrivers },
      { metric: "Pending / Rejected Drivers", value: drivers.length - approvedDrivers },
      { metric: "Total Vehicles", value: vehicles.length },
      { metric: "Approved Vehicles", value: approvedVehicles },
      { metric: "Pending Vehicles", value: vehicles.length - approvedVehicles },
      { metric: "Total Routes", value: routes.length },
    ]
  );

  // ---- Drivers sheet ----
  buildSheet(
    wb,
    "Drivers",
    [
      { header: "Driver ID", key: "id", width: 30 },
      { header: "Full Name", key: "fullName", width: 28 },
      { header: "Username", key: "username", width: 18 },
      { header: "Email", key: "email", width: 30 },
      { header: "Phone", key: "phone", width: 18 },
      { header: "WhatsApp", key: "whatsapp", width: 11 },
      { header: "Date of Birth", key: "dateOfBirth", width: 14 },
      { header: "City", key: "operatingCity", width: 16 },
      { header: "State", key: "operatingState", width: 16 },
      { header: "Status", key: "status", width: 12 },
      { header: "Disabled", key: "disabled", width: 10 },
      { header: "VIP Stars", key: "vipStars", width: 10 },
      { header: "VIP Expiry", key: "vipExpiry", width: 18, numFmt: DATE_FMT },
      { header: "Ticket Expiry", key: "ticketExpiry", width: 18, numFmt: DATE_FMT },
      { header: "Jobs Won", key: "jobsWon", width: 10 },
      { header: "Vehicles", key: "vehicleCount", width: 10 },
      { header: "Registered At", key: "registeredAt", width: 18, numFmt: DATE_FMT },
      { header: "Profile Image URL", key: "displayImage", width: 60, link: true },
    ],
    drivers.map((d) => ({
      id: d.id,
      fullName: fullName(d),
      username: d.username,
      email: d.email,
      phone: d.phone,
      whatsapp: d.whatsappEnabled ? "Yes" : "No",
      dateOfBirth: d.dateOfBirth,
      operatingCity: d.operatingCity,
      operatingState: d.operatingState,
      status: driverStatus(d),
      disabled: d.isDisabled ? "Yes" : "No",
      vipStars: Number(d.vipStars || 0),
      vipExpiry: d.vipExpiry,
      ticketExpiry: d.ticketExpiry,
      jobsWon: Number(d.jobsWon || 0),
      vehicleCount: vehiclesPerDriver.get(d.id) || 0,
      registeredAt: d.driverCreatedAt || d.createdAt,
      displayImage: d.displayImage,
    }))
  );

  // ---- Vehicles sheet ----
  // `details` and `images` are free-form per category, so columns are built dynamically.
  const detailKeys = unionKeys(vehicles.map((v) => v.details));
  const imageKeys = unionKeys(vehicles.map((v) => v.images));

  buildSheet(
    wb,
    "Vehicles",
    [
      { header: "Vehicle ID", key: "id", width: 30 },
      { header: "Driver ID", key: "driverId", width: 30 },
      { header: "Driver Name", key: "driverName", width: 26 },
      { header: "Driver Phone", key: "driverPhone", width: 18 },
      { header: "Category", key: "category", width: 14 },
      { header: "Status", key: "status", width: 12 },
      ...detailKeys.map((k) => ({ header: humanize(k), key: `detail_${k}` })),
      { header: "Routes", key: "routeCount", width: 9 },
      { header: "Created At", key: "createdAt", width: 18, numFmt: DATE_FMT },
      ...imageKeys.map((k) => ({ header: `${humanize(k)} Image URL`, key: `image_${k}`, width: 60, link: true })),
    ],
    vehicles.map((v) => {
      const driver = driverMap.get(v.driverId);
      const row: Row = {
        id: v.id,
        driverId: v.driverId,
        driverName: fullName(driver),
        driverPhone: driver?.phone,
        category: v.category,
        status: v.isApproved ? "Approved" : "Pending",
        routeCount: routesPerVehicle.get(v.id) || 0,
        createdAt: v.createdAt,
      };
      detailKeys.forEach((k) => (row[`detail_${k}`] = v.details?.[k]));
      imageKeys.forEach((k) => (row[`image_${k}`] = v.images?.[k]));
      return row;
    })
  );

  // ---- Routes sheet ----
  buildSheet(
    wb,
    "Routes",
    [
      { header: "Route ID", key: "id", width: 24 },
      { header: "Driver Name", key: "driverName", width: 26 },
      { header: "Vehicle", key: "vehicle", width: 28 },
      { header: "Plate / Reg No.", key: "plate", width: 16 },
      { header: "Start Point", key: "startPoint", width: 24 },
      { header: "Destination", key: "destination", width: 24 },
      { header: "Price", key: "price", width: 12 },
      { header: "Negotiable", key: "negotiable", width: 11 },
      { header: "Description", key: "description", width: 40 },
      { header: "Created At", key: "createdAt", width: 18, numFmt: DATE_FMT },
      { header: "Vehicle ID", key: "vehicleId", width: 30 },
    ],
    routes.map((r) => {
      const vehicle = vehicleMap.get(r.vehicleId);
      const d = vehicle?.details || {};
      return {
        id: r.id,
        driverName: fullName(driverMap.get(r.driverId)),
        vehicle: [d.make, d.model, d.year].filter(Boolean).join(" ") || vehicle?.category || "Unknown",
        plate: d.plateNumber || d.registrationNumber,
        startPoint: r.startPoint,
        destination: r.destination,
        price: r.price,
        negotiable: r.isNegotiable ? "Yes" : "No",
        description: r.description,
        createdAt: r.createdAt,
        vehicleId: r.vehicleId,
      };
    })
  );

  // 3. Trigger the browser download.
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `nomo-cars-inventory-${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);

  return { drivers: drivers.length, vehicles: vehicles.length, routes: routes.length };
}

export async function downloadInventoryCSV(): Promise<InventoryExportResult> {
  const [driverUsers, adminUsers, vehicles, routes] = await Promise.all([
    fetchAll("users", where("role", "==", "driver")),
    fetchAll("users", where("role", "==", "admin")),
    fetchAll("vehicles"),
    fetchAll("vehicleServices"),
  ]);

  const drivers = [
    ...driverUsers,
    ...adminUsers.filter((u) => u.driverCreatedAt || u.operatingCity),
  ];

  const driverMap = new Map<string, Doc>(drivers.map((d) => [d.id, d]));
  const routesPerVehicle = new Map<string, number>();
  routes.forEach((r) => routesPerVehicle.set(r.vehicleId, (routesPerVehicle.get(r.vehicleId) || 0) + 1));

  const ExcelJS = await import("exceljs");
  const Workbook = (ExcelJS.Workbook ?? (ExcelJS as unknown as { default: typeof ExcelJS }).default.Workbook);
  const wb = new Workbook();
  wb.creator = "Nomo Cars Admin";
  wb.created = new Date();

  const DATE_FMT = "yyyy-mm-dd hh:mm";
  const detailKeys = unionKeys(vehicles.map((v) => v.details));
  const imageKeys = unionKeys(vehicles.map((v) => v.images));

  // For CSV, we only build one sheet (Vehicles) as CSV doesn't support multiple sheets
  buildSheet(
    wb,
    "Vehicles",
    [
      { header: "Vehicle ID", key: "id", width: 30 },
      { header: "Driver ID", key: "driverId", width: 30 },
      { header: "Driver Name", key: "driverName", width: 26 },
      { header: "Driver Phone", key: "driverPhone", width: 18 },
      { header: "Category", key: "category", width: 14 },
      { header: "Status", key: "status", width: 12 },
      ...detailKeys.map((k) => ({ header: humanize(k), key: `detail_${k}` })),
      { header: "Routes", key: "routeCount", width: 9 },
      { header: "Created At", key: "createdAt", width: 18, numFmt: DATE_FMT },
      ...imageKeys.map((k) => ({ header: `${humanize(k)} Image URL`, key: `image_${k}`, width: 60, link: true })),
    ],
    vehicles.map((v) => {
      const driver = driverMap.get(v.driverId);
      const row: Row = {
        id: v.id,
        driverId: v.driverId,
        driverName: fullName(driver),
        driverPhone: driver?.phone,
        category: v.category,
        status: v.isApproved ? "Approved" : "Pending",
        routeCount: routesPerVehicle.get(v.id) || 0,
        createdAt: v.createdAt,
      };
      detailKeys.forEach((k) => (row[`detail_${k}`] = v.details?.[k]));
      imageKeys.forEach((k) => (row[`image_${k}`] = v.images?.[k]));
      return row;
    })
  );

  const buffer = await wb.csv.writeBuffer();
  const blob = new Blob([buffer], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `nomo-cars-inventory-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);

  return { drivers: drivers.length, vehicles: vehicles.length, routes: routes.length };
}
