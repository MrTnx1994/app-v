var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_crypto = __toESM(require("crypto"), 1);
var import_bcryptjs = __toESM(require("bcryptjs"), 1);
var import_express_rate_limit = __toESM(require("express-rate-limit"), 1);
var import_node_sqlite = require("node:sqlite");
var import_vite = require("vite");
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = process.env.PORT || 3e3;
  app.set("trust proxy", 1);
  app.use(import_express.default.json({ limit: "50mb" }));
  app.use(import_express.default.urlencoded({ extended: true, limit: "50mb" }));
  const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1e3;
  const BCRYPT_ROUNDS = 10;
  const DB_FILE_PATH = import_path.default.join(process.cwd(), "data.db");
  const OLD_STORE_JSON_PATH = import_path.default.join(process.cwd(), "db_store.json");
  const OLD_LOGS_JSON_PATH = import_path.default.join(process.cwd(), "db_logs.json");
  function openDatabaseConnection() {
    let fresh = !import_fs.default.existsSync(DB_FILE_PATH);
    let connection = null;
    const setupTables = (conn) => {
      conn.exec("PRAGMA journal_mode = WAL;");
      conn.exec("PRAGMA foreign_keys = ON;");
      conn.exec("PRAGMA quick_check;");
      conn.exec(`
        CREATE TABLE IF NOT EXISTS app_config (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS users (
          uid TEXT PRIMARY KEY,
          email TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL,
          role TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'active',
          driverName TEXT DEFAULT '',
          plainPassword TEXT DEFAULT ''
        );

        CREATE TABLE IF NOT EXISTS sessions (
          token TEXT PRIMARY KEY,
          uid TEXT NOT NULL,
          expiresAt INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_sessions_uid ON sessions(uid);

        CREATE TABLE IF NOT EXISTS daily_plans (
          date TEXT PRIMARY KEY,
          data TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS activity_logs (
          id TEXT PRIMARY KEY,
          userId TEXT NOT NULL,
          action TEXT NOT NULL,
          details TEXT,
          timestamp TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON activity_logs(timestamp);
        CREATE INDEX IF NOT EXISTS idx_logs_userId ON activity_logs(userId);
      `);
      try {
        conn.exec("ALTER TABLE users ADD COLUMN plainPassword TEXT DEFAULT '';");
      } catch {
      }
    };
    try {
      connection = new import_node_sqlite.DatabaseSync(DB_FILE_PATH);
      setupTables(connection);
    } catch (err) {
      console.warn("\u26A0\uFE0F SQLite database error detected (file may be malformed or corrupted):", err.message);
      console.warn("\u{1F504} Automatically cleaning corrupted database and initializing a fresh database...");
      if (connection) {
        try {
          connection.close();
        } catch {
        }
      }
      try {
        if (import_fs.default.existsSync(DB_FILE_PATH)) import_fs.default.unlinkSync(DB_FILE_PATH);
        if (import_fs.default.existsSync(DB_FILE_PATH + "-wal")) import_fs.default.unlinkSync(DB_FILE_PATH + "-wal");
        if (import_fs.default.existsSync(DB_FILE_PATH + "-shm")) import_fs.default.unlinkSync(DB_FILE_PATH + "-shm");
      } catch (unlinkErr) {
        console.error("Could not remove corrupted database files:", unlinkErr);
      }
      fresh = true;
      connection = new import_node_sqlite.DatabaseSync(DB_FILE_PATH);
      setupTables(connection);
    }
    return { db: connection, isFreshDatabase: fresh };
  }
  const { db, isFreshDatabase } = openDatabaseConnection();
  const stmtGetConfig = db.prepare("SELECT value FROM app_config WHERE key = ?");
  const stmtSetConfig = db.prepare("INSERT INTO app_config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value");
  const stmtGetUserByEmail = db.prepare("SELECT * FROM users WHERE email = ? COLLATE NOCASE");
  const stmtGetUserByUid = db.prepare("SELECT * FROM users WHERE uid = ?");
  const stmtGetAllUsers = db.prepare("SELECT uid, email, role, status, driverName, plainPassword FROM users");
  const stmtInsertUser = db.prepare("INSERT INTO users (uid, email, password, role, status, driverName, plainPassword) VALUES (?, ?, ?, ?, ?, ?, ?)");
  const stmtUpdateUserRole = db.prepare("UPDATE users SET role = ?, driverName = ? WHERE uid = ?");
  const stmtUpdateUserPassword = db.prepare("UPDATE users SET password = ?, plainPassword = ? WHERE uid = ?");
  const stmtUpdateUserStatus = db.prepare("UPDATE users SET status = ? WHERE uid = ?");
  const stmtDeleteUser = db.prepare("DELETE FROM users WHERE uid = ?");
  const stmtInsertSession = db.prepare("INSERT INTO sessions (token, uid, expiresAt) VALUES (?, ?, ?)");
  const stmtGetSession = db.prepare("SELECT * FROM sessions WHERE token = ?");
  const stmtDeleteSessionByToken = db.prepare("DELETE FROM sessions WHERE token = ?");
  const stmtDeleteSessionsByUid = db.prepare("DELETE FROM sessions WHERE uid = ?");
  const stmtDeleteExpiredSessions = db.prepare("DELETE FROM sessions WHERE expiresAt < ?");
  const stmtGetDailyPlan = db.prepare("SELECT data FROM daily_plans WHERE date = ?");
  const stmtUpsertDailyPlan = db.prepare("INSERT INTO daily_plans (date, data) VALUES (?, ?) ON CONFLICT(date) DO UPDATE SET data = excluded.data");
  const stmtDailyPlansBeforeDesc = db.prepare("SELECT date, data FROM daily_plans WHERE date < ? ORDER BY date DESC LIMIT 30");
  const stmtDailyPlansUpToDesc = db.prepare("SELECT date, data FROM daily_plans WHERE date <= ? ORDER BY date DESC LIMIT 30");
  const stmtDailyPlansAllDesc = db.prepare("SELECT date, data FROM daily_plans ORDER BY date DESC LIMIT 30");
  const stmtDailyPlansFromDateDesc = db.prepare("SELECT date, data FROM daily_plans WHERE date >= ? ORDER BY date DESC");
  const stmtInsertLog = db.prepare("INSERT INTO activity_logs (id, userId, action, details, timestamp) VALUES (?, ?, ?, ?, ?)");
  const stmtGetLogsAll = db.prepare("SELECT * FROM activity_logs ORDER BY timestamp DESC");
  const stmtGetLogsByUser = db.prepare("SELECT * FROM activity_logs WHERE userId = ? ORDER BY timestamp DESC");
  const stmtGetAllDailyPlans = db.prepare("SELECT date, data FROM daily_plans ORDER BY date ASC");
  const stmtGetDailyPlansInRange = db.prepare("SELECT date, data FROM daily_plans WHERE date >= ? AND date <= ? ORDER BY date ASC");
  const stmtGetAllUsersFull = db.prepare("SELECT * FROM users");
  const stmtDeleteAllDailyPlans = db.prepare("DELETE FROM daily_plans");
  const stmtDeleteAllLogs = db.prepare("DELETE FROM activity_logs");
  const stmtDeleteAllSessions = db.prepare("DELETE FROM sessions");
  const stmtDeleteAllUsersExcept = db.prepare("DELETE FROM users WHERE email != ?");
  const stmtGetAllLogsAsc = db.prepare("SELECT * FROM activity_logs ORDER BY timestamp ASC");
  const stmtClearLogs = db.prepare("DELETE FROM activity_logs");
  const getConfigValue = (key) => {
    const row = stmtGetConfig.get(key);
    if (!row) return [];
    try {
      return JSON.parse(row.value);
    } catch {
      return [];
    }
  };
  if (isFreshDatabase && import_fs.default.existsSync(OLD_STORE_JSON_PATH)) {
    console.log("First run detected: migrating existing db_store.json into data.db (SQLite)...");
    try {
      const oldStore = JSON.parse(import_fs.default.readFileSync(OLD_STORE_JSON_PATH, "utf8"));
      db.exec("BEGIN");
      try {
        if (Array.isArray(oldStore.drivers)) {
          stmtSetConfig.run("drivers", JSON.stringify(oldStore.drivers));
        }
        if (Array.isArray(oldStore.products)) {
          stmtSetConfig.run("products", JSON.stringify(oldStore.products));
        }
        if (Array.isArray(oldStore.users)) {
          oldStore.users.forEach((u) => {
            const password = u.password && String(u.password).startsWith("$2") ? u.password : import_bcryptjs.default.hashSync(String(u.password || ""), BCRYPT_ROUNDS);
            stmtInsertUser.run(
              String(u.uid ?? Date.now().toString()),
              String(u.email ?? ""),
              password,
              String(u.role ?? "sales"),
              String(u.status ?? "active"),
              String(u.driverName ?? ""),
              String(u.plainPassword ?? (u.password && !String(u.password).startsWith("$2") ? u.password : ""))
            );
          });
        }
        Object.keys(oldStore).forEach((key) => {
          if (key.startsWith("date_")) {
            const dateStr = key.replace("date_", "");
            stmtUpsertDailyPlan.run(dateStr, JSON.stringify(oldStore[key]));
          }
        });
        db.exec("COMMIT");
        console.log("Migration of db_store.json complete.");
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }
      import_fs.default.renameSync(OLD_STORE_JSON_PATH, `${OLD_STORE_JSON_PATH}.migrated-backup`);
    } catch (e) {
      console.error("Migration from db_store.json failed:", e);
    }
  }
  if (isFreshDatabase && import_fs.default.existsSync(OLD_LOGS_JSON_PATH)) {
    console.log("Migrating existing db_logs.json into data.db (SQLite)...");
    try {
      const oldLogs = JSON.parse(import_fs.default.readFileSync(OLD_LOGS_JSON_PATH, "utf8"));
      const logs = Array.isArray(oldLogs.activity_logs) ? oldLogs.activity_logs : [];
      db.exec("BEGIN");
      try {
        logs.forEach((log) => {
          stmtInsertLog.run(
            String(log.id ?? Date.now().toString() + Math.random().toString(36).slice(2, 7)),
            String(log.userId ?? "unknown@system.com"),
            String(log.action ?? ""),
            log.details ? String(log.details) : "",
            String(log.timestamp ?? (/* @__PURE__ */ new Date()).toISOString())
          );
        });
        db.exec("COMMIT");
        console.log(`Migration of db_logs.json complete (${logs.length} log entries).`);
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }
      import_fs.default.renameSync(OLD_LOGS_JSON_PATH, `${OLD_LOGS_JSON_PATH}.migrated-backup`);
    } catch (e) {
      console.error("Migration from db_logs.json failed:", e);
    }
  }
  const adminExists = stmtGetUserByEmail.get("admin@system.com");
  if (!adminExists) {
    stmtInsertUser.run(
      "admin_default_uid",
      "admin@system.com",
      import_bcryptjs.default.hashSync("010203", BCRYPT_ROUNDS),
      "admin",
      "active",
      "",
      "010203"
    );
    console.log("Seeded default admin account (admin@system.com / 010203) \u2014 please change this password after first login.");
  } else {
    try {
      db.prepare("UPDATE users SET plainPassword = '010203' WHERE email = 'admin@system.com' AND (plainPassword IS NULL OR plainPassword = '')").run();
    } catch {
    }
  }
  const generateToken = () => import_crypto.default.randomBytes(32).toString("hex");
  const createSession = (uid) => {
    const token = generateToken();
    stmtDeleteExpiredSessions.run(Date.now());
    stmtInsertSession.run(token, uid, Date.now() + SESSION_TTL_MS);
    return token;
  };
  const resolveSession = (req) => {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return null;
    const session = stmtGetSession.get(token);
    if (!session || session.expiresAt < Date.now()) return null;
    const user = stmtGetUserByUid.get(session.uid);
    if (!user || user.status === "disabled") return null;
    return user;
  };
  const requireAuth = (req, res, next) => {
    const user = resolveSession(req);
    if (!user) {
      return res.status(401).json({ status: "error", code: "unauthorized", message: "\u0644\u0637\u0641\u0627\u064B \u062F\u0648\u0628\u0627\u0631\u0647 \u0648\u0627\u0631\u062F \u0633\u06CC\u0633\u062A\u0645 \u0634\u0648\u06CC\u062F." });
    }
    req.user = { uid: user.uid, email: user.email, role: user.role, driverName: user.driverName || "" };
    next();
  };
  const requireRole = (...roles) => {
    return (req, res, next) => {
      const user = req.user;
      if (!user || !roles.includes(user.role)) {
        return res.status(403).json({ status: "error", code: "forbidden", message: "\u0634\u0645\u0627 \u0627\u062C\u0627\u0632\u0647 \u062F\u0633\u062A\u0631\u0633\u06CC \u0628\u0647 \u0627\u06CC\u0646 \u0628\u062E\u0634 \u0631\u0627 \u0646\u062F\u0627\u0631\u06CC\u062F." });
      }
      next();
    };
  };
  const PRIMARY_ADMIN_EMAIL = "admin@system.com";
  const requirePrimaryAdmin = (req, res, next) => {
    const user = req.user;
    if (!user || user.email !== PRIMARY_ADMIN_EMAIL) {
      return res.status(403).json({ status: "error", code: "forbidden", message: "\u0627\u06CC\u0646 \u0639\u0645\u0644\u06CC\u0627\u062A \u0641\u0642\u0637 \u0628\u0631\u0627\u06CC \u0645\u062F\u06CC\u0631 \u0627\u0635\u0644\u06CC \u0633\u06CC\u0633\u062A\u0645 \u0645\u062C\u0627\u0632 \u0627\u0633\u062A." });
    }
    next();
  };
  const loginLimiter = (0, import_express_rate_limit.default)({
    windowMs: 15 * 60 * 1e3,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: "error", message: "\u062A\u0639\u062F\u0627\u062F \u062A\u0644\u0627\u0634\u200C\u0647\u0627\u06CC \u0648\u0631\u0648\u062F \u0628\u06CC\u0634 \u0627\u0632 \u062D\u062F \u0645\u062C\u0627\u0632 \u0627\u0633\u062A. \u0686\u0646\u062F \u062F\u0642\u06CC\u0642\u0647 \u062F\u06CC\u06AF\u0631 \u062F\u0648\u0628\u0627\u0631\u0647 \u062A\u0644\u0627\u0634 \u06A9\u0646\u06CC\u062F." }
  });
  app.get("/api/config", requireAuth, (req, res) => {
    res.json({
      drivers: getConfigValue("drivers"),
      products: getConfigValue("products")
    });
  });
  app.post("/api/config", requireAuth, requireRole("admin"), (req, res) => {
    const { drivers, products } = req.body;
    if (drivers) stmtSetConfig.run("drivers", JSON.stringify(drivers));
    if (products) stmtSetConfig.run("products", JSON.stringify(products));
    res.json({ status: "success" });
  });
  const getPreviousShamsiDateString = (dateStr) => {
    const separator = dateStr.includes("/") ? "/" : "-";
    const parts = dateStr.split(separator);
    if (parts.length !== 3) return "";
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    let prevDay = day - 1;
    let prevMonth = month;
    let prevYear = year;
    if (prevDay < 1) {
      prevMonth = month - 1;
      if (prevMonth < 1) {
        prevMonth = 12;
        prevYear = year - 1;
      }
      const isLeap = prevYear % 33 === 1 || prevYear % 33 === 5 || prevYear % 33 === 9 || prevYear % 33 === 13 || prevYear % 33 === 17 || prevYear % 33 === 22 || prevYear % 33 === 26 || prevYear % 33 === 30;
      if (prevMonth <= 6) {
        prevDay = 31;
      } else if (prevMonth <= 11) {
        prevDay = 30;
      } else {
        prevDay = isLeap ? 30 : 29;
      }
    }
    return `${prevYear}/${prevMonth.toString().padStart(2, "0")}/${prevDay.toString().padStart(2, "0")}`;
  };
  const loadPlanCached = (planCache, dateStr) => {
    if (planCache.has(dateStr)) return planCache.get(dateStr);
    const row = stmtGetDailyPlan.get(dateStr);
    const parsed = row ? JSON.parse(row.data) : null;
    planCache.set(dateStr, parsed);
    return parsed;
  };
  const getProductStartingStock = (planCache, dateStr, product, visitedDates = /* @__PURE__ */ new Set()) => {
    if (visitedDates.has(dateStr) || visitedDates.size > 60) {
      return 0;
    }
    visitedDates.add(dateStr);
    const prevDateStr = getPreviousShamsiDateString(dateStr);
    if (!prevDateStr) {
      return 0;
    }
    const prevPlan = loadPlanCached(planCache, prevDateStr);
    let prevStartingStock = getProductStartingStock(planCache, prevDateStr, product, visitedDates);
    if (prevPlan && prevPlan.manualStockOverrides && prevPlan.manualStockOverrides[product.id] !== void 0) {
      prevStartingStock += Number(prevPlan.manualStockOverrides[product.id]) || 0;
    }
    let prevAllocated = 0;
    if (prevPlan && prevPlan.invoices) {
      prevPlan.invoices.forEach((inv) => {
        if (inv.isActive !== false && inv.quantities && inv.quantities[product.id] !== void 0) {
          prevAllocated += Number(inv.quantities[product.id]) || 0;
        }
      });
    }
    return prevStartingStock - prevAllocated;
  };
  app.get("/api/inventory/summary/:date", requireAuth, (req, res) => {
    const { date } = req.params;
    const products = getConfigValue("products");
    const planCache = /* @__PURE__ */ new Map();
    const row = stmtGetDailyPlan.get(date);
    const dayData = row ? JSON.parse(row.data) : null;
    const manualOverrides = dayData?.manualStockOverrides || {};
    const allocated = {};
    if (dayData?.invoices) {
      dayData.invoices.forEach((inv) => {
        if (inv.isActive !== false) {
          Object.entries(inv.quantities || {}).forEach(([pid, qty]) => {
            allocated[pid] = (allocated[pid] || 0) + (Number(qty) || 0);
          });
        }
      });
    }
    const summary = products.map((p) => {
      const startingStock = getProductStartingStock(planCache, date, p);
      const manualAdd = manualOverrides[p.id] !== void 0 ? Number(manualOverrides[p.id]) : 0;
      const sold = allocated[p.id] || 0;
      return {
        id: p.id,
        category: p.category,
        flavor: p.flavor,
        remaining: startingStock + manualAdd - sold
      };
    });
    res.json({ date, products: summary });
  });
  app.get("/api/load/:date", requireAuth, requireRole("admin", "sales", "driver", "visitor"), (req, res) => {
    const { date } = req.params;
    const products = getConfigValue("products");
    const planCache = /* @__PURE__ */ new Map();
    const computedStartingStocks = {};
    products.forEach((p) => {
      computedStartingStocks[p.id] = getProductStartingStock(planCache, date, p);
    });
    const row = stmtGetDailyPlan.get(date);
    if (row) {
      const data = JSON.parse(row.data);
      res.json({
        found: true,
        data,
        computedStartingStocks
      });
    } else {
      res.json({
        found: false,
        computedStartingStocks
      });
    }
  });
  app.post("/api/save", requireAuth, requireRole("admin", "sales", "driver"), (req, res) => {
    try {
      const { date, data, userEmail } = req.body;
      if (!date) {
        throw new Error("\u062A\u0627\u0631\u06CC\u062E \u0645\u0639\u062A\u0628\u0631 \u0627\u0644\u0632\u0627\u0645\u06CC \u0627\u0633\u062A.");
      }
      const oldRow = stmtGetDailyPlan.get(date);
      const oldData = oldRow ? JSON.parse(oldRow.data) : { invoices: [], manualStockOverrides: {}, driverSearchSlots: [] };
      const newData = data || { invoices: [], manualStockOverrides: {}, driverSearchSlots: [] };
      const email = userEmail || "unknown@system.com";
      const detailedLogs = [];
      const getProductDisplayName = (productId, productsList2) => {
        const p = productsList2?.find((prod) => prod.id === productId);
        if (p) {
          return `${p.category} ${p.flavor} (${p.unitWeight} \u06A9\u06CC\u0644\u0648\u06AF\u0631\u0645\u06CC)`;
        }
        return `\u06A9\u062F \u0645\u062D\u0635\u0648\u0644: ${productId}`;
      };
      const productsList = getConfigValue("products");
      const oldInvoices = oldData.invoices || [];
      const newInvoices = newData.invoices || [];
      newInvoices.forEach((newInv) => {
        const oldInv = oldInvoices.find((i) => i.id === newInv.id);
        if (!oldInv) {
          let summary = `\u06A9\u0627\u0631\u0628\u0631 ${email} \u0641\u0627\u06A9\u062A\u0648\u0631 \u062C\u062F\u06CC\u062F\u06CC \u0628\u0631\u0627\u06CC \u0645\u0634\u062A\u0631\u06CC "${newInv.customerName || "\u0646\u0627\u0645\u0634\u062E\u0635"}" \u0628\u0627 \u0631\u0627\u0646\u0646\u062F\u0647 "${newInv.driverName || "\u0628\u062F\u0648\u0646 \u0631\u0627\u0646\u0646\u062F\u0647"}" \u0648 \u0645\u0633\u06CC\u0631 "${newInv.destinationLocation || "\u0646\u0627\u0645\u0634\u062E\u0635"}" \u0627\u0636\u0627\u0641\u0647 \u06A9\u0631\u062F.`;
          detailedLogs.push({
            action: "\u0627\u0641\u0632\u0648\u062F\u0646 \u0641\u0627\u06A9\u062A\u0648\u0631",
            details: summary
          });
        } else {
          if (oldInv.customerName !== newInv.customerName) {
            detailedLogs.push({
              action: "\u0648\u06CC\u0631\u0627\u06CC\u0634 \u0646\u0627\u0645 \u0645\u0634\u062A\u0631\u06CC \u0641\u0627\u06A9\u062A\u0648\u0631",
              details: `\u06A9\u0627\u0631\u0628\u0631 ${email} \u0646\u0627\u0645 \u0645\u0634\u062A\u0631\u06CC \u0641\u0627\u06A9\u062A\u0648\u0631 \u0631\u0627 \u0627\u0632 "${oldInv.customerName || "\u0646\u0627\u0645\u0634\u062E\u0635"}" \u0628\u0647 "${newInv.customerName || "\u0646\u0627\u0645\u0634\u062E\u0635"}" \u062A\u063A\u06CC\u06CC\u0631 \u062F\u0627\u062F.`
            });
          }
          if (oldInv.driverName !== newInv.driverName) {
            detailedLogs.push({
              action: "\u062A\u063A\u06CC\u06CC\u0631 \u0631\u0627\u0646\u0646\u062F\u0647 \u0641\u0627\u06A9\u062A\u0648\u0631",
              details: `\u06A9\u0627\u0631\u0628\u0631 ${email} \u0631\u0627\u0646\u0646\u062F\u0647 \u0641\u0627\u06A9\u062A\u0648\u0631 \u0645\u0634\u062A\u0631\u06CC "${newInv.customerName || "\u0646\u0627\u0645\u0634\u062E\u0635"}" \u0631\u0627 \u0627\u0632 "${oldInv.driverName || "\u0628\u062F\u0648\u0646 \u0631\u0627\u0646\u0646\u062F\u0647"}" \u0628\u0647 "${newInv.driverName || "\u0628\u062F\u0648\u0646 \u0631\u0627\u0646\u0646\u062F\u0647"}" \u062A\u063A\u06CC\u06CC\u0631 \u062F\u0627\u062F.`
            });
          }
          if (oldInv.round !== newInv.round) {
            detailedLogs.push({
              action: "\u062A\u063A\u06CC\u06CC\u0631 \u0646\u0648\u0628\u062A \u0641\u0627\u06A9\u062A\u0648\u0631",
              details: `\u06A9\u0627\u0631\u0628\u0631 ${email} \u0646\u0648\u0628\u062A \u0641\u0627\u06A9\u062A\u0648\u0631 \u0645\u0634\u062A\u0631\u06CC "${newInv.customerName || "\u0646\u0627\u0645\u0634\u062E\u0635"}" \u0631\u0627 \u0627\u0632 "${oldInv.round || 1}" \u0628\u0647 "${newInv.round || 1}" \u062A\u063A\u06CC\u06CC\u0631 \u062F\u0627\u062F.`
            });
          }
          if (oldInv.destinationLocation !== newInv.destinationLocation) {
            detailedLogs.push({
              action: "\u062A\u063A\u06CC\u06CC\u0631 \u0645\u0633\u06CC\u0631 \u0641\u0627\u06A9\u062A\u0648\u0631",
              details: `\u06A9\u0627\u0631\u0628\u0631 ${email} \u0645\u0633\u06CC\u0631 \u0641\u0627\u06A9\u062A\u0648\u0631 \u0645\u0634\u062A\u0631\u06CC "${newInv.customerName || "\u0646\u0627\u0645\u0634\u062E\u0635"}" \u0631\u0627 \u0627\u0632 "${oldInv.destinationLocation || "\u0646\u0627\u0645\u0634\u062E\u0635"}" \u0628\u0647 "${newInv.destinationLocation || "\u0646\u0627\u0645\u0634\u062E\u0635"}" \u062A\u063A\u06CC\u06CC\u0631 \u062F\u0627\u062F.`
            });
          }
          if (oldInv.description !== newInv.description) {
            detailedLogs.push({
              action: "\u062A\u063A\u06CC\u06CC\u0631 \u062A\u0648\u0636\u06CC\u062D\u0627\u062A \u0641\u0627\u06A9\u062A\u0648\u0631",
              details: `\u06A9\u0627\u0631\u0628\u0631 ${email} \u062A\u0648\u0636\u06CC\u062D\u0627\u062A \u0641\u0627\u06A9\u062A\u0648\u0631 \u0645\u0634\u062A\u0631\u06CC "${newInv.customerName || "\u0646\u0627\u0645\u0634\u062E\u0635"}" \u0631\u0627 \u0627\u0632 "${oldInv.description || "\u0628\u062F\u0648\u0646 \u062A\u0648\u0636\u06CC\u062D"}" \u0628\u0647 "${newInv.description || "\u0628\u062F\u0648\u0646 \u062A\u0648\u0636\u06CC\u062D"}" \u062A\u063A\u06CC\u06CC\u0631 \u062F\u0627\u062F.`
            });
          }
          const oldQuantities = oldInv.quantities || {};
          const newQuantities = newInv.quantities || {};
          const allProductIds = Array.from(/* @__PURE__ */ new Set([...Object.keys(oldQuantities), ...Object.keys(newQuantities)]));
          allProductIds.forEach((pId) => {
            const oldQty = Number(oldQuantities[pId]) || 0;
            const newQty = Number(newQuantities[pId]) || 0;
            if (oldQty !== newQty) {
              const productName = getProductDisplayName(pId, productsList);
              detailedLogs.push({
                action: "\u062A\u063A\u06CC\u06CC\u0631 \u062A\u0639\u062F\u0627\u062F \u06A9\u0627\u0644\u0627 \u062F\u0631 \u0641\u0627\u06A9\u062A\u0648\u0631",
                details: `\u06A9\u0627\u0631\u0628\u0631 ${email} \u062A\u0639\u062F\u0627\u062F \u0645\u062D\u0635\u0648\u0644 "${productName}" \u062F\u0631 \u0641\u0627\u06A9\u062A\u0648\u0631 \u0645\u0634\u062A\u0631\u06CC "${newInv.customerName || "\u0646\u0627\u0645\u0634\u062E\u0635"}" \u0631\u0627 \u0627\u0632 ${oldQty} \u0628\u0647 ${newQty} \u062A\u063A\u06CC\u06CC\u0631 \u062F\u0627\u062F.`
              });
            }
          });
        }
      });
      oldInvoices.forEach((oldInv) => {
        const existsInNew = newInvoices.some((i) => i.id === oldInv.id);
        if (!existsInNew) {
          detailedLogs.push({
            action: "\u062D\u0630\u0641 \u0641\u0627\u06A9\u062A\u0648\u0631",
            details: `\u06A9\u0627\u0631\u0628\u0631 ${email} \u0641\u0627\u06A9\u062A\u0648\u0631 \u0645\u0634\u062A\u0631\u06CC "${oldInv.customerName || "\u0646\u0627\u0645\u0634\u062E\u0635"}" (\u0631\u0627\u0646\u0646\u062F\u0647: "${oldInv.driverName || "\u0628\u062F\u0648\u0646 \u0631\u0627\u0646\u0646\u062F\u0647"}") \u0631\u0627 \u062D\u0630\u0641 \u06A9\u0631\u062F.`
          });
        }
      });
      const oldOverrides = oldData.manualStockOverrides || {};
      const newOverrides = newData.manualStockOverrides || {};
      const allOverrideIds = Array.from(/* @__PURE__ */ new Set([...Object.keys(oldOverrides), ...Object.keys(newOverrides)]));
      allOverrideIds.forEach((pId) => {
        const oldStock = oldOverrides[pId];
        const newStock = newOverrides[pId];
        if (oldStock !== newStock) {
          const productName = getProductDisplayName(pId, productsList);
          const oldStr = oldStock !== void 0 ? `${oldStock} \u06A9\u0627\u0631\u062A\u0646` : "\u067E\u06CC\u0634\u200C\u0641\u0631\u0636";
          const newStr = newStock !== void 0 ? `${newStock} \u06A9\u0627\u0631\u062A\u0646` : "\u067E\u06CC\u0634\u200C\u0641\u0631\u0636";
          detailedLogs.push({
            action: "\u062A\u063A\u06CC\u06CC\u0631 \u062F\u0633\u062A\u06CC \u0645\u0648\u062C\u0648\u062F\u06CC \u0627\u0646\u0628\u0627\u0631",
            details: `\u06A9\u0627\u0631\u0628\u0631 ${email} \u0645\u0648\u062C\u0648\u062F\u06CC \u0627\u0646\u0628\u0627\u0631\u06AF\u0631\u062F\u0627\u0646\u06CC \u062F\u0633\u062A\u06CC \u0645\u062D\u0635\u0648\u0644 "${productName}" \u0631\u0627 \u0627\u0632 [${oldStr}] \u0628\u0647 [${newStr}] \u062A\u063A\u06CC\u06CC\u0631 \u062F\u0627\u062F.`
          });
        }
      });
      db.exec("BEGIN");
      try {
        stmtUpsertDailyPlan.run(date, JSON.stringify(newData));
        detailedLogs.forEach((log) => {
          stmtInsertLog.run(
            Date.now().toString() + Math.random().toString(36).slice(2, 7),
            email,
            log.action,
            log.details,
            (/* @__PURE__ */ new Date()).toISOString()
          );
        });
        db.exec("COMMIT");
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }
      res.json({ status: "success" });
    } catch (err) {
      console.error("Error saving data:", err);
      res.status(500).json({ status: "error", message: err.message || "\u062E\u0637\u0627 \u062F\u0631 \u0630\u062E\u06CC\u0631\u0647 \u0627\u0637\u0644\u0627\u0639\u0627\u062A" });
    }
  });
  app.get("/api/statistics/sales", requireAuth, requireRole("admin", "sales", "driver", "visitor"), (req, res) => {
    const { endDate } = req.query;
    const salesMap = {};
    getConfigValue("products").forEach((p) => {
      salesMap[p.id] = 0;
    });
    const rows = endDate ? stmtDailyPlansBeforeDesc.all(endDate) : stmtDailyPlansAllDesc.all();
    rows.forEach((row) => {
      const dayData = JSON.parse(row.data);
      if (dayData && dayData.invoices) {
        dayData.invoices.forEach((inv) => {
          if (inv.isActive !== false && inv.quantities) {
            Object.entries(inv.quantities).forEach(([pId, qty]) => {
              const numQty = Number(qty) || 0;
              if (numQty > 0) {
                salesMap[pId] = (salesMap[pId] || 0) + numQty;
              }
            });
          }
        });
      }
    });
    res.json({ sales: salesMap });
  });
  app.get("/api/statistics/incoming", requireAuth, requireRole("admin", "sales", "driver", "visitor"), (req, res) => {
    const { endDate } = req.query;
    const incomingMap = {};
    getConfigValue("products").forEach((p) => {
      incomingMap[p.id] = 0;
    });
    const rows = endDate ? stmtDailyPlansBeforeDesc.all(endDate) : stmtDailyPlansAllDesc.all();
    rows.forEach((row) => {
      const dayData = JSON.parse(row.data);
      if (dayData && dayData.manualStockOverrides) {
        Object.entries(dayData.manualStockOverrides).forEach(([pId, qty]) => {
          const numQty = Number(qty) || 0;
          if (numQty > 0) {
            incomingMap[pId] = (incomingMap[pId] || 0) + numQty;
          }
        });
      }
    });
    res.json({ incoming: incomingMap });
  });
  app.get("/api/statistics/invoices", requireAuth, requireRole("admin", "sales", "driver", "visitor"), (req, res) => {
    const { endDate } = req.query;
    const driverStats = {};
    let totalOrders = 0;
    const rows = endDate ? stmtDailyPlansUpToDesc.all(endDate) : stmtDailyPlansAllDesc.all();
    rows.forEach((row) => {
      const dayData = JSON.parse(row.data);
      if (dayData && dayData.invoices) {
        dayData.invoices.forEach((inv) => {
          if (inv.isActive !== false) {
            if (inv.driverName && inv.customerName) {
              totalOrders++;
            }
            if (inv.driverName) {
              let driverName = inv.driverName.trim();
              driverName = driverName.replace(/[\s\d\u0660-\u0669\u06F0-\u06F9]+$/, "");
              driverStats[driverName] = (driverStats[driverName] || 0) + 1;
            }
          }
        });
      }
    });
    res.json({ driverStats, totalOrders });
  });
  app.get("/api/search/customer", requireAuth, (req, res) => {
    const { name, fromDate } = req.query;
    if (!name || !name.trim()) {
      return res.status(400).json({ status: "error", message: "\u0646\u0627\u0645 \u0645\u0634\u062A\u0631\u06CC \u0628\u0631\u0627\u06CC \u062C\u0633\u062A\u062C\u0648 \u0627\u0644\u0632\u0627\u0645\u06CC \u0627\u0633\u062A." });
    }
    if (!fromDate) {
      return res.status(400).json({ status: "error", message: "\u062A\u0627\u0631\u06CC\u062E \u0634\u0631\u0648\u0639 \u062C\u0633\u062A\u062C\u0648 \u0627\u0644\u0632\u0627\u0645\u06CC \u0627\u0633\u062A." });
    }
    const user = req.user;
    const isVisitor = user?.role === "visitor";
    const needle = name.trim().toLowerCase();
    const rows = stmtDailyPlansFromDateDesc.all(fromDate);
    const productsList = getConfigValue("products");
    const results = [];
    rows.forEach((row) => {
      let dayData;
      try {
        dayData = JSON.parse(row.data);
      } catch {
        return;
      }
      if (!dayData || !Array.isArray(dayData.invoices)) return;
      dayData.invoices.forEach((inv) => {
        if (inv.customerName && String(inv.customerName).trim().toLowerCase().includes(needle)) {
          results.push({ date: row.date, invoice: inv });
        }
      });
    });
    res.json({ results, count: results.length, isVisitor: false });
  });
  app.post("/api/auth/login", loginLimiter, async (req, res) => {
    const { usernameOrEmail, password } = req.body;
    if (!usernameOrEmail || !password) {
      return res.status(400).json({ status: "error", message: "\u0646\u0627\u0645 \u06A9\u0627\u0631\u0628\u0631\u06CC \u0648 \u0631\u0645\u0632 \u0639\u0628\u0648\u0631 \u0627\u0644\u0632\u0627\u0645\u06CC \u0627\u0633\u062A." });
    }
    const email = usernameOrEmail.includes("@") ? usernameOrEmail : `${usernameOrEmail}@system.com`;
    const user = stmtGetUserByEmail.get(email);
    if (!user) {
      return res.status(404).json({ status: "error", code: "user-not-found", message: "\u06A9\u0627\u0631\u0628\u0631\u06CC \u0628\u0627 \u0627\u06CC\u0646 \u0645\u0634\u062E\u0635\u0627\u062A \u06CC\u0627\u0641\u062A \u0646\u0634\u062F." });
    }
    const passwordOk = await import_bcryptjs.default.compare(password, user.password);
    if (!passwordOk) {
      return res.status(401).json({ status: "error", code: "wrong-password", message: "\u0631\u0645\u0632 \u0639\u0628\u0648\u0631 \u0646\u0627\u062F\u0631\u0633\u062A \u0627\u0633\u062A." });
    }
    if (user.status === "disabled") {
      return res.status(403).json({ status: "error", code: "user-disabled", message: "\u062D\u0633\u0627\u0628 \u06A9\u0627\u0631\u0628\u0631\u06CC \u063A\u06CC\u0631\u0641\u0639\u0627\u0644 \u0634\u062F\u0647 \u0627\u0633\u062A." });
    }
    const token = createSession(user.uid);
    res.json({
      status: "success",
      token,
      user: { uid: user.uid, email: user.email, driverName: user.driverName || "" },
      role: user.role
    });
  });
  app.get("/api/auth/me", requireAuth, (req, res) => {
    const authedUser = req.user;
    const freshUser = stmtGetUserByUid.get(authedUser.uid);
    if (!freshUser || freshUser.status === "disabled") {
      return res.status(401).json({ status: "error", code: "unauthorized", message: "\u0646\u0634\u0633\u062A \u0634\u0645\u0627 \u0645\u0639\u062A\u0628\u0631 \u0646\u06CC\u0633\u062A." });
    }
    res.json({
      status: "success",
      user: { uid: freshUser.uid, email: freshUser.email, driverName: freshUser.driverName || "" },
      role: freshUser.role
    });
  });
  app.post("/api/auth/logout", requireAuth, (req, res) => {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (token) stmtDeleteSessionByToken.run(token);
    res.json({ status: "success" });
  });
  app.post("/api/auth/change-password", requireAuth, async (req, res) => {
    try {
      const authedUser = req.user;
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        throw new Error("\u0644\u0637\u0641\u0627\u064B \u0631\u0645\u0632 \u0639\u0628\u0648\u0631 \u0641\u0639\u0644\u06CC \u0648 \u0631\u0645\u0632 \u0639\u0628\u0648\u0631 \u062C\u062F\u06CC\u062F \u0631\u0627 \u0648\u0627\u0631\u062F \u06A9\u0646\u06CC\u062F.");
      }
      if (newPassword.length < 4) {
        throw new Error("\u0631\u0645\u0632 \u0639\u0628\u0648\u0631 \u062C\u062F\u06CC\u062F \u0628\u0627\u06CC\u062F \u062D\u062F\u0627\u0642\u0644 \u06F4 \u06A9\u0627\u0631\u0627\u06A9\u062A\u0631 \u0628\u0627\u0634\u062F.");
      }
      const user = stmtGetUserByUid.get(authedUser.uid);
      if (!user) {
        throw new Error("\u06A9\u0627\u0631\u0628\u0631 \u06CC\u0627\u0641\u062A \u0646\u0634\u062F.");
      }
      const passwordOk = await import_bcryptjs.default.compare(currentPassword, user.password);
      if (!passwordOk) {
        throw new Error("\u0631\u0645\u0632 \u0639\u0628\u0648\u0631 \u0641\u0639\u0644\u06CC \u0646\u0627\u062F\u0631\u0633\u062A \u0627\u0633\u062A.");
      }
      const newHashed = await import_bcryptjs.default.hash(newPassword, BCRYPT_ROUNDS);
      stmtUpdateUserPassword.run(newHashed, newPassword, user.uid);
      stmtInsertLog.run(
        Date.now().toString() + Math.random().toString(36).slice(2, 6),
        user.email,
        "\u062A\u063A\u06CC\u06CC\u0631 \u0631\u0645\u0632 \u0639\u0628\u0648\u0631",
        `\u06A9\u0627\u0631\u0628\u0631 ${user.email} \u0631\u0645\u0632 \u0639\u0628\u0648\u0631 \u062E\u0648\u062F \u0631\u0627 \u062A\u063A\u06CC\u06CC\u0631 \u062F\u0627\u062F.`,
        (/* @__PURE__ */ new Date()).toISOString()
      );
      res.json({ status: "success", message: "\u0631\u0645\u0632 \u0639\u0628\u0648\u0631 \u0628\u0627 \u0645\u0648\u0641\u0642\u06CC\u062A \u062A\u063A\u06CC\u06CC\u0631 \u06CC\u0627\u0641\u062A." });
    } catch (err) {
      res.status(400).json({ status: "error", message: err.message || "\u062E\u0637\u0627 \u062F\u0631 \u062A\u063A\u06CC\u06CC\u0631 \u0631\u0645\u0632 \u0639\u0628\u0648\u0631" });
    }
  });
  app.get("/api/users", requireAuth, requireRole("admin"), (req, res) => {
    const users = stmtGetAllUsers.all();
    res.json({ users });
  });
  app.post("/api/users/create", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { email, password, role, driverName } = req.body;
      if (!email || !password || !role) {
        throw new Error("\u062A\u0645\u0627\u0645\u06CC \u0641\u06CC\u0644\u062F\u0647\u0627 \u0627\u0644\u0632\u0627\u0645\u06CC \u0647\u0633\u062A\u0646\u062F.");
      }
      const existing = stmtGetUserByEmail.get(email);
      if (existing) {
        throw new Error("\u0627\u06CC\u0646 \u06A9\u0627\u0631\u0628\u0631 \u0627\u0632 \u0642\u0628\u0644 \u062F\u0631 \u0633\u06CC\u0633\u062A\u0645 \u0645\u0648\u062C\u0648\u062F \u0627\u0633\u062A.");
      }
      const uid = Date.now().toString();
      const hashed = await import_bcryptjs.default.hash(password, BCRYPT_ROUNDS);
      stmtInsertUser.run(uid, email, hashed, role, "active", driverName || "", password);
      res.json({ status: "success", user: { uid, email, role, status: "active", driverName: driverName || "", plainPassword: password } });
    } catch (err) {
      res.status(400).json({ status: "error", message: err.message });
    }
  });
  app.post("/api/users/update", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { uid, role, driverName, password } = req.body;
      if (!uid || !role) {
        throw new Error("\u0634\u0646\u0627\u0633\u0647 \u06A9\u0627\u0631\u0628\u0631 \u0648 \u0646\u0642\u0634 \u0627\u0644\u0632\u0627\u0645\u06CC \u0647\u0633\u062A\u0646\u062F.");
      }
      const existing = stmtGetUserByUid.get(uid);
      if (!existing) {
        throw new Error("\u06A9\u0627\u0631\u0628\u0631 \u06CC\u0627\u0641\u062A \u0646\u0634\u062F.");
      }
      stmtUpdateUserRole.run(role, driverName || "", uid);
      if (password) {
        stmtUpdateUserPassword.run(await import_bcryptjs.default.hash(password, BCRYPT_ROUNDS), password, uid);
      }
      const updated = stmtGetUserByUid.get(uid);
      const { password: _pw, ...safeUser } = updated;
      res.json({ status: "success", user: safeUser });
    } catch (err) {
      res.status(err.message === "\u06A9\u0627\u0631\u0628\u0631 \u06CC\u0627\u0641\u062A \u0646\u0634\u062F." ? 404 : 400).json({ status: "error", message: err.message });
    }
  });
  app.post("/api/users/toggle-status", requireAuth, requireRole("admin"), (req, res) => {
    try {
      const { uid, status } = req.body;
      if (!uid || !status) {
        throw new Error("\u0627\u0637\u0644\u0627\u0639\u0627\u062A \u0627\u0644\u0632\u0627\u0645\u06CC \u0646\u0627\u0642\u0635 \u0627\u0633\u062A.");
      }
      const existing = stmtGetUserByUid.get(uid);
      if (!existing) {
        throw new Error("\u06A9\u0627\u0631\u0628\u0631 \u06CC\u0627\u0641\u062A \u0646\u0634\u062F.");
      }
      stmtUpdateUserStatus.run(status, uid);
      if (status === "disabled") {
        stmtDeleteSessionsByUid.run(uid);
      }
      res.json({ status: "success" });
    } catch (err) {
      res.status(err.message === "\u06A9\u0627\u0631\u0628\u0631 \u06CC\u0627\u0641\u062A \u0646\u0634\u062F." ? 404 : 400).json({ status: "error", message: err.message });
    }
  });
  app.post("/api/users/delete", requireAuth, requireRole("admin"), (req, res) => {
    try {
      const { uid } = req.body;
      if (!uid) {
        throw new Error("\u0634\u0646\u0627\u0633\u0647 \u06A9\u0627\u0631\u0628\u0631 \u0627\u0644\u0632\u0627\u0645\u06CC \u0627\u0633\u062A.");
      }
      const user = stmtGetUserByUid.get(uid);
      if (!user) {
        throw new Error("\u06A9\u0627\u0631\u0628\u0631 \u06CC\u0627\u0641\u062A \u0646\u0634\u062F.");
      }
      if (user.email === "admin@system.com") {
        throw new Error("\u0627\u0645\u06A9\u0627\u0646 \u062D\u0630\u0641 \u06A9\u0627\u0631\u0628\u0631 \u0645\u062F\u06CC\u0631 \u06A9\u0644 \u0627\u0635\u0644\u06CC \u0633\u06CC\u0633\u062A\u0645 \u0648\u062C\u0648\u062F \u0646\u062F\u0627\u0631\u062F.");
      }
      stmtDeleteUser.run(uid);
      stmtDeleteSessionsByUid.run(uid);
      res.json({ status: "success" });
    } catch (err) {
      res.status(err.message === "\u06A9\u0627\u0631\u0628\u0631 \u06CC\u0627\u0641\u062A \u0646\u0634\u062F." ? 404 : 400).json({ status: "error", message: err.message });
    }
  });
  const LOG_CATEGORY_CONDITIONS = {
    invoice: "action LIKE '%\u0641\u0627\u06A9\u062A\u0648\u0631%'",
    stock: "action LIKE '%\u0645\u0648\u062C\u0648\u062F\u06CC%'",
    users: "action LIKE '%\u06A9\u0627\u0631\u0628\u0631%'",
    system: "(action LIKE '%\u067E\u0627\u06A9\u200C\u0633\u0627\u0632\u06CC%' OR action LIKE '%\u0631\u06CC\u0633\u062A%' OR action LIKE '%\u0628\u0627\u0632\u0646\u0634\u0627\u0646\u06CC%' OR action LIKE '%\u0648\u0631\u0648\u062F \u0628\u0647 \u0633\u06CC\u0633\u062A\u0645%')"
  };
  app.get("/api/logs", requireAuth, requireRole("admin"), (req, res) => {
    const { userId, category, page, pageSize } = req.query;
    if (!page && !pageSize && !category) {
      const logs2 = userId ? stmtGetLogsByUser.all(userId) : stmtGetLogsAll.all();
      return res.json({ logs: logs2 });
    }
    const pageNum = Math.max(1, parseInt(page || "1", 10) || 1);
    const size = Math.min(200, Math.max(1, parseInt(pageSize || "30", 10) || 30));
    const offset = (pageNum - 1) * size;
    const conditions = [];
    const params = [];
    if (userId) {
      conditions.push("userId = ?");
      params.push(userId);
    }
    if (category && category !== "all") {
      if (category === "other") {
        conditions.push(`NOT (${Object.values(LOG_CATEGORY_CONDITIONS).join(" OR ")})`);
      } else if (LOG_CATEGORY_CONDITIONS[category]) {
        conditions.push(LOG_CATEGORY_CONDITIONS[category]);
      }
    }
    const whereSql = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const logs = db.prepare(`SELECT * FROM activity_logs ${whereSql} ORDER BY timestamp DESC LIMIT ? OFFSET ?`).all(...params, size, offset);
    const total = db.prepare(`SELECT COUNT(*) as c FROM activity_logs ${whereSql}`).get(...params).c;
    res.json({ logs, total, page: pageNum, pageSize: size });
  });
  app.post("/api/logs/create", requireAuth, (req, res) => {
    try {
      const { userId, action, details } = req.body;
      if (!userId || !action) {
        throw new Error("\u0627\u0637\u0644\u0627\u0639\u0627\u062A \u0646\u0627\u0642\u0635 \u0627\u0633\u062A.");
      }
      const newLog = {
        id: Date.now().toString() + Math.random().toString(36).slice(2, 7),
        userId,
        action,
        details: typeof details === "string" ? details : JSON.stringify(details || {}),
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
      stmtInsertLog.run(newLog.id, newLog.userId, newLog.action, newLog.details, newLog.timestamp);
      res.json({ status: "success", log: newLog });
    } catch (err) {
      res.status(400).json({ status: "error", message: err.message });
    }
  });
  app.delete("/api/logs/clear", requireAuth, requireRole("admin"), (req, res) => {
    try {
      stmtClearLogs.run();
      res.json({ status: "success", message: "\u062A\u0645\u0627\u0645\u06CC \u0644\u0627\u06AF\u200C\u0647\u0627\u06CC \u062A\u063A\u06CC\u06CC\u0631\u0627\u062A \u0628\u0627 \u0645\u0648\u0641\u0642\u06CC\u062A \u062D\u0630\u0641 \u0634\u062F\u0646\u062F." });
    } catch (err) {
      console.error("Error clearing logs", err);
      res.status(500).json({ status: "error", message: "\u062E\u0637\u0627 \u062F\u0631 \u067E\u0627\u06A9\u0633\u0627\u0632\u06CC \u0644\u0627\u06AF\u200C\u0647\u0627" });
    }
  });
  app.get("/api/backup/download", requireAuth, requireRole("admin"), (req, res) => {
    try {
      const { fromDate, toDate } = req.query;
      const isRanged = !!(fromDate && toDate);
      const dailyPlanRows = isRanged ? stmtGetDailyPlansInRange.all(fromDate, toDate) : stmtGetAllDailyPlans.all();
      const backup = {
        formatVersion: 1,
        generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
        range: isRanged ? { fromDate, toDate } : null,
        drivers: getConfigValue("drivers"),
        products: getConfigValue("products"),
        users: stmtGetAllUsersFull.all().map((u) => ({
          uid: u.uid,
          email: u.email,
          password: u.password,
          role: u.role,
          status: u.status,
          driverName: u.driverName
        })),
        dailyPlans: dailyPlanRows.map((r) => ({ date: r.date, data: JSON.parse(r.data) })),
        activityLogs: isRanged ? [] : stmtGetAllLogsAsc.all()
      };
      const filename = isRanged ? `backup-${String(fromDate).replace(/\//g, "-")}_${String(toDate).replace(/\//g, "-")}.json` : `backup-full-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.json`;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.send(JSON.stringify(backup, null, 2));
    } catch (err) {
      console.error("Backup download error:", err);
      res.status(500).json({ status: "error", message: "\u062E\u0637\u0627 \u062F\u0631 \u062A\u0647\u06CC\u0647 \u0641\u0627\u06CC\u0644 \u067E\u0634\u062A\u06CC\u0628\u0627\u0646" });
    }
  });
  const normalizeBackupPayload = (input) => {
    if (Array.isArray(input.dailyPlans)) {
      return {
        drivers: Array.isArray(input.drivers) ? input.drivers : [],
        products: Array.isArray(input.products) ? input.products : [],
        users: Array.isArray(input.users) ? input.users : [],
        dailyPlans: input.dailyPlans,
        activityLogs: Array.isArray(input.activityLogs) ? input.activityLogs : []
      };
    }
    if (Array.isArray(input.activity_logs) && !input.drivers && !input.products && !input.users) {
      return { drivers: [], products: [], users: [], dailyPlans: [], activityLogs: input.activity_logs };
    }
    const dailyPlans = [];
    Object.keys(input).forEach((key) => {
      if (key.startsWith("date_") && input[key] && typeof input[key] === "object") {
        dailyPlans.push({ date: key.replace("date_", ""), data: input[key] });
      }
    });
    return {
      drivers: Array.isArray(input.drivers) ? input.drivers : [],
      products: Array.isArray(input.products) ? input.products : [],
      users: Array.isArray(input.users) ? input.users : [],
      dailyPlans,
      activityLogs: Array.isArray(input.activityLogs) ? input.activityLogs : []
    };
  };
  app.post("/api/backup/restore", requireAuth, requireRole("admin"), (req, res) => {
    try {
      const rawBody = req.body;
      if (!rawBody || typeof rawBody !== "object" || Array.isArray(rawBody)) {
        throw new Error("\u0641\u0627\u06CC\u0644 \u067E\u0634\u062A\u06CC\u0628\u0627\u0646 \u0645\u0639\u062A\u0628\u0631 \u0646\u06CC\u0633\u062A.");
      }
      const backup = normalizeBackupPayload(rawBody);
      if (backup.drivers.length === 0 && backup.products.length === 0 && backup.users.length === 0 && backup.dailyPlans.length === 0 && backup.activityLogs.length === 0) {
        throw new Error("\u0641\u0627\u06CC\u0644 \u0627\u0646\u062A\u062E\u0627\u0628\u200C\u0634\u062F\u0647 \u0647\u06CC\u0686 \u062F\u0627\u062F\u0647\u200C\u06CC \u0642\u0627\u0628\u0644\u200C\u0634\u0646\u0627\u0633\u0627\u06CC\u06CC\u200C\u0627\u06CC \u0646\u062F\u0627\u0634\u062A.");
      }
      const summary = { driversAdded: 0, productsAdded: 0, usersAdded: 0, dailyPlansAdded: 0, dailyPlansMerged: 0, logsAdded: 0 };
      db.exec("BEGIN");
      try {
        if (Array.isArray(backup.drivers)) {
          const currentDrivers = getConfigValue("drivers");
          const existingNames = new Set(currentDrivers.map((d) => d.name));
          const merged = [...currentDrivers];
          backup.drivers.forEach((d) => {
            if (d && d.name && !existingNames.has(d.name)) {
              merged.push(d);
              existingNames.add(d.name);
              summary.driversAdded++;
            }
          });
          if (summary.driversAdded > 0) stmtSetConfig.run("drivers", JSON.stringify(merged));
        }
        if (Array.isArray(backup.products)) {
          const currentProducts = getConfigValue("products");
          const existingIds = new Set(currentProducts.map((p) => p.id));
          const merged = [...currentProducts];
          backup.products.forEach((p) => {
            if (p && p.id && !existingIds.has(p.id)) {
              merged.push(p);
              existingIds.add(p.id);
              summary.productsAdded++;
            }
          });
          if (summary.productsAdded > 0) stmtSetConfig.run("products", JSON.stringify(merged));
        }
        if (Array.isArray(backup.users)) {
          backup.users.forEach((u) => {
            if (!u || !u.email) return;
            const existing = stmtGetUserByEmail.get(u.email);
            if (!existing) {
              const password = u.password && String(u.password).startsWith("$2") ? u.password : import_bcryptjs.default.hashSync(String(u.password || import_crypto.default.randomBytes(8).toString("hex")), BCRYPT_ROUNDS);
              stmtInsertUser.run(
                String(u.uid || Date.now().toString() + Math.random().toString(36).slice(2, 6)),
                u.email,
                password,
                u.role || "sales",
                u.status || "active",
                u.driverName || ""
              );
              summary.usersAdded++;
            }
          });
        }
        if (Array.isArray(backup.dailyPlans)) {
          backup.dailyPlans.forEach((entry) => {
            if (!entry || !entry.date || !entry.data) return;
            const existingRow = stmtGetDailyPlan.get(entry.date);
            if (!existingRow) {
              stmtUpsertDailyPlan.run(entry.date, JSON.stringify(entry.data));
              summary.dailyPlansAdded++;
            } else {
              const existingData = JSON.parse(existingRow.data);
              existingData.invoices = existingData.invoices || [];
              const existingInvoiceIds = new Set(existingData.invoices.map((i) => i.id));
              let addedAny = false;
              (entry.data.invoices || []).forEach((inv) => {
                if (inv && inv.id && !existingInvoiceIds.has(inv.id)) {
                  existingData.invoices.push(inv);
                  existingInvoiceIds.add(inv.id);
                  addedAny = true;
                }
              });
              if (entry.data.manualStockOverrides) {
                existingData.manualStockOverrides = existingData.manualStockOverrides || {};
                Object.entries(entry.data.manualStockOverrides).forEach(([pid, val]) => {
                  if (existingData.manualStockOverrides[pid] === void 0) {
                    existingData.manualStockOverrides[pid] = val;
                    addedAny = true;
                  }
                });
              }
              if (addedAny) {
                stmtUpsertDailyPlan.run(entry.date, JSON.stringify(existingData));
                summary.dailyPlansMerged++;
              }
            }
          });
        }
        if (Array.isArray(backup.activityLogs)) {
          backup.activityLogs.forEach((log) => {
            if (!log || !log.id) return;
            try {
              stmtInsertLog.run(
                log.id,
                log.userId || "unknown@system.com",
                log.action || "",
                typeof log.details === "string" ? log.details : JSON.stringify(log.details || {}),
                log.timestamp || (/* @__PURE__ */ new Date()).toISOString()
              );
              summary.logsAdded++;
            } catch {
            }
          });
        }
        db.exec("COMMIT");
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }
      res.json({ status: "success", summary });
    } catch (err) {
      console.error("Backup restore error:", err);
      res.status(400).json({ status: "error", message: err.message || "\u062E\u0637\u0627 \u062F\u0631 \u0628\u0627\u0632\u06AF\u0631\u062F\u0627\u0646\u06CC \u0641\u0627\u06CC\u0644 \u067E\u0634\u062A\u06CC\u0628\u0627\u0646" });
    }
  });
  app.post("/api/system/reset-daily-data", requireAuth, requirePrimaryAdmin, (req, res) => {
    try {
      db.exec("BEGIN");
      try {
        stmtDeleteAllDailyPlans.run();
        stmtDeleteAllLogs.run();
        db.exec("COMMIT");
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }
      stmtInsertLog.run(
        Date.now().toString() + Math.random().toString(36).slice(2, 6),
        req.user.email,
        "\u067E\u0627\u06A9\u200C\u0633\u0627\u0632\u06CC \u0628\u0631\u0646\u0627\u0645\u0647\u200C\u0647\u0627\u06CC \u0631\u0648\u0632\u0627\u0646\u0647",
        "\u062A\u0645\u0627\u0645 \u0628\u0631\u0646\u0627\u0645\u0647\u200C\u0647\u0627\u06CC \u0631\u0648\u0632\u0627\u0646\u0647 (\u0641\u0627\u06A9\u062A\u0648\u0631\u0647\u0627) \u0648 \u062A\u0627\u0631\u06CC\u062E\u0686\u0647\u200C\u06CC \u0644\u0627\u06AF\u200C\u0647\u0627 \u062A\u0648\u0633\u0637 \u0645\u062F\u06CC\u0631 \u0627\u0635\u0644\u06CC \u067E\u0627\u06A9 \u0634\u062F.",
        (/* @__PURE__ */ new Date()).toISOString()
      );
      res.json({ status: "success" });
    } catch (err) {
      console.error("Reset daily data error:", err);
      res.status(500).json({ status: "error", message: "\u062E\u0637\u0627 \u062F\u0631 \u067E\u0627\u06A9\u200C\u0633\u0627\u0632\u06CC \u0627\u0637\u0644\u0627\u0639\u0627\u062A" });
    }
  });
  app.post("/api/system/factory-reset", requireAuth, requirePrimaryAdmin, (req, res) => {
    try {
      const { confirmation } = req.body;
      if (confirmation !== "RESET") {
        return res.status(400).json({ status: "error", message: "\u0639\u0628\u0627\u0631\u062A \u062A\u0623\u06CC\u06CC\u062F \u0646\u0627\u062F\u0631\u0633\u062A \u0627\u0633\u062A." });
      }
      db.exec("BEGIN");
      try {
        stmtDeleteAllDailyPlans.run();
        stmtDeleteAllLogs.run();
        stmtDeleteAllSessions.run();
        stmtSetConfig.run("drivers", JSON.stringify([]));
        stmtSetConfig.run("products", JSON.stringify([]));
        stmtDeleteAllUsersExcept.run(PRIMARY_ADMIN_EMAIL);
        db.exec("COMMIT");
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }
      const newToken = createSession(req.user.uid);
      stmtInsertLog.run(
        Date.now().toString() + Math.random().toString(36).slice(2, 6),
        PRIMARY_ADMIN_EMAIL,
        "\u0631\u06CC\u0633\u062A \u06A9\u0627\u0645\u0644 \u06A9\u0627\u0631\u062E\u0627\u0646\u0647\u200C\u0627\u06CC \u0633\u06CC\u0633\u062A\u0645",
        "\u062A\u0645\u0627\u0645 \u062F\u0627\u062F\u0647\u200C\u0647\u0627\u06CC \u0633\u06CC\u0633\u062A\u0645 (\u0631\u0627\u0646\u0646\u062F\u06AF\u0627\u0646\u060C \u06A9\u0627\u0644\u0627\u0647\u0627\u060C \u06A9\u0627\u0631\u0628\u0631\u0627\u0646\u060C \u0628\u0631\u0646\u0627\u0645\u0647\u200C\u0647\u0627\u06CC \u0631\u0648\u0632\u0627\u0646\u0647\u060C \u0644\u0627\u06AF\u200C\u0647\u0627) \u062A\u0648\u0633\u0637 \u0645\u062F\u06CC\u0631 \u0627\u0635\u0644\u06CC \u067E\u0627\u06A9 \u0634\u062F.",
        (/* @__PURE__ */ new Date()).toISOString()
      );
      res.json({ status: "success", token: newToken });
    } catch (err) {
      console.error("Factory reset error:", err);
      res.status(500).json({ status: "error", message: "\u062E\u0637\u0627 \u062F\u0631 \u0631\u06CC\u0633\u062A \u06A9\u0627\u0645\u0644 \u0633\u06CC\u0633\u062A\u0645" });
    }
  });
  app.get("/api/health", (req, res) => {
    res.json({ status: "healthy", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  if (process.env.NODE_ENV === "production") {
    app.listen(process.env.PORT || 3e3, () => {
      console.log(`Server running in production on port ${process.env.PORT || 3e3}`);
    });
  } else {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
    });
  }
}
startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
//# sourceMappingURL=server.cjs.map
