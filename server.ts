import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { DatabaseSync } from "node:sqlite";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.set("trust proxy", 1);

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
  const BCRYPT_ROUNDS = 10;

  const DB_FILE_PATH = path.join(process.cwd(), "data.db");
  const OLD_STORE_JSON_PATH = path.join(process.cwd(), "db_store.json");
  const OLD_LOGS_JSON_PATH = path.join(process.cwd(), "db_logs.json");

  function openDatabaseConnection() {
    let fresh = !fs.existsSync(DB_FILE_PATH);
    let connection: DatabaseSync | null = null;

    const setupTables = (conn: DatabaseSync) => {
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
      } catch {}
    };

    try {
      connection = new DatabaseSync(DB_FILE_PATH);
      setupTables(connection);
    } catch (err: any) {
      console.warn("⚠️ SQLite database error detected (file may be malformed or corrupted):", err.message);
      console.warn("🔄 Automatically cleaning corrupted database and initializing a fresh database...");

      if (connection) {
        try { connection.close(); } catch {}
      }

      try {
        if (fs.existsSync(DB_FILE_PATH)) fs.unlinkSync(DB_FILE_PATH);
        if (fs.existsSync(DB_FILE_PATH + "-wal")) fs.unlinkSync(DB_FILE_PATH + "-wal");
        if (fs.existsSync(DB_FILE_PATH + "-shm")) fs.unlinkSync(DB_FILE_PATH + "-shm");
      } catch (unlinkErr) {
        console.error("Could not remove corrupted database files:", unlinkErr);
      }

      fresh = true;
      connection = new DatabaseSync(DB_FILE_PATH);
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

  const getConfigValue = (key: string): any[] => {
    const row = stmtGetConfig.get(key) as { value: string } | undefined;
    if (!row) return [];
    try {
      return JSON.parse(row.value);
    } catch {
      return [];
    }
  };

  // --- ONE-TIME MIGRATION ---
  if (isFreshDatabase && fs.existsSync(OLD_STORE_JSON_PATH)) {
    console.log("First run detected: migrating existing db_store.json into data.db (SQLite)...");
    try {
      const oldStore = JSON.parse(fs.readFileSync(OLD_STORE_JSON_PATH, "utf8"));

      db.exec("BEGIN");
      try {
        if (Array.isArray(oldStore.drivers)) {
          stmtSetConfig.run("drivers", JSON.stringify(oldStore.drivers));
        }
        if (Array.isArray(oldStore.products)) {
          stmtSetConfig.run("products", JSON.stringify(oldStore.products));
        }
        if (Array.isArray(oldStore.users)) {
          oldStore.users.forEach((u: any) => {
            const password = u.password && String(u.password).startsWith("$2")
              ? u.password
              : bcrypt.hashSync(String(u.password || ""), BCRYPT_ROUNDS);
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

      fs.renameSync(OLD_STORE_JSON_PATH, `${OLD_STORE_JSON_PATH}.migrated-backup`);
    } catch (e) {
      console.error("Migration from db_store.json failed:", e);
    }
  }

  if (isFreshDatabase && fs.existsSync(OLD_LOGS_JSON_PATH)) {
    console.log("Migrating existing db_logs.json into data.db (SQLite)...");
    try {
      const oldLogs = JSON.parse(fs.readFileSync(OLD_LOGS_JSON_PATH, "utf8"));
      const logs = Array.isArray(oldLogs.activity_logs) ? oldLogs.activity_logs : [];
      db.exec("BEGIN");
      try {
        logs.forEach((log: any) => {
          stmtInsertLog.run(
            String(log.id ?? (Date.now().toString() + Math.random().toString(36).slice(2, 7))),
            String(log.userId ?? "unknown@system.com"),
            String(log.action ?? ""),
            log.details ? String(log.details) : "",
            String(log.timestamp ?? new Date().toISOString())
          );
        });
        db.exec("COMMIT");
        console.log(`Migration of db_logs.json complete (${logs.length} log entries).`);
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }
      fs.renameSync(OLD_LOGS_JSON_PATH, `${OLD_LOGS_JSON_PATH}.migrated-backup`);
    } catch (e) {
      console.error("Migration from db_logs.json failed:", e);
    }
  }

  const adminExists = stmtGetUserByEmail.get("admin@system.com");
  if (!adminExists) {
    stmtInsertUser.run(
      "admin_default_uid",
      "admin@system.com",
      bcrypt.hashSync("010203", BCRYPT_ROUNDS),
      "admin",
      "active",
      "",
      "010203"
    );
    console.log('Seeded default admin account (admin@system.com / 010203) — please change this password after first login.');
  } else {
    try {
      db.prepare("UPDATE users SET plainPassword = '010203' WHERE email = 'admin@system.com' AND (plainPassword IS NULL OR plainPassword = '')").run();
    } catch {}
  }

  // ============================================================
  //  AUTH HELPERS
  // ============================================================

  const generateToken = (): string => crypto.randomBytes(32).toString("hex");

  const createSession = (uid: string): string => {
    const token = generateToken();
    stmtDeleteExpiredSessions.run(Date.now());
    stmtInsertSession.run(token, uid, Date.now() + SESSION_TTL_MS);
    return token;
  };

  const resolveSession = (req: express.Request): any | null => {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return null;

    const session = stmtGetSession.get(token) as { token: string; uid: string; expiresAt: number } | undefined;
    if (!session || session.expiresAt < Date.now()) return null;

    const user = stmtGetUserByUid.get(session.uid) as any;
    if (!user || user.status === "disabled") return null;

    return user;
  };

  const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const user = resolveSession(req);
    if (!user) {
      return res.status(401).json({ status: "error", code: "unauthorized", message: "لطفاً دوباره وارد سیستم شوید." });
    }
    (req as any).user = { uid: user.uid, email: user.email, role: user.role, driverName: user.driverName || "" };
    next();
  };

  const requireRole = (...roles: string[]) => {
    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
      const user = (req as any).user;
      if (!user || !roles.includes(user.role)) {
        return res.status(403).json({ status: "error", code: "forbidden", message: "شما اجازه دسترسی به این بخش را ندارید." });
      }
      next();
    };
  };

  const PRIMARY_ADMIN_EMAIL = "admin@system.com";
  const requirePrimaryAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const user = (req as any).user;
    if (!user || user.email !== PRIMARY_ADMIN_EMAIL) {
      return res.status(403).json({ status: "error", code: "forbidden", message: "این عملیات فقط برای مدیر اصلی سیستم مجاز است." });
    }
    next();
  };

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: "error", message: "تعداد تلاش‌های ورود بیش از حد مجاز است. چند دقیقه دیگر دوباره تلاش کنید." }
  });

  // ============================================================
  //  API ENDPOINTS
  // ============================================================

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

  const getPreviousShamsiDateString = (dateStr: string): string => {
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
      const isLeap = (prevYear % 33 === 1 || prevYear % 33 === 5 || prevYear % 33 === 9 || prevYear % 33 === 13 || prevYear % 33 === 17 || prevYear % 33 === 22 || prevYear % 33 === 26 || prevYear % 33 === 30);
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

  const loadPlanCached = (planCache: Map<string, any>, dateStr: string): any => {
    if (planCache.has(dateStr)) return planCache.get(dateStr);
    const row = stmtGetDailyPlan.get(dateStr) as { data: string } | undefined;
    const parsed = row ? JSON.parse(row.data) : null;
    planCache.set(dateStr, parsed);
    return parsed;
  };

  const getProductStartingStock = (planCache: Map<string, any>, dateStr: string, product: any, visitedDates = new Set<string>()): number => {
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

    if (prevPlan && prevPlan.manualStockOverrides && prevPlan.manualStockOverrides[product.id] !== undefined) {
      prevStartingStock += (Number(prevPlan.manualStockOverrides[product.id]) || 0);
    }

    let prevAllocated = 0;
    if (prevPlan && prevPlan.invoices) {
      prevPlan.invoices.forEach((inv: any) => {
        if (inv.isActive !== false && inv.quantities && inv.quantities[product.id] !== undefined) {
          prevAllocated += Number(inv.quantities[product.id]) || 0;
        }
      });
    }

    return prevStartingStock - prevAllocated;
  };

  // Inventory summary for visitor role
  app.get("/api/inventory/summary/:date", requireAuth, (req, res) => {
    const { date } = req.params;
    const products = getConfigValue("products");
    const planCache = new Map<string, any>();

    const row = stmtGetDailyPlan.get(date) as { data: string } | undefined;
    const dayData = row ? JSON.parse(row.data) : null;
    const manualOverrides: { [productId: string]: number } = dayData?.manualStockOverrides || {};

    const allocated: { [productId: string]: number } = {};
    if (dayData?.invoices) {
      dayData.invoices.forEach((inv: any) => {
        if (inv.isActive !== false) {
          Object.entries(inv.quantities || {}).forEach(([pid, qty]) => {
            allocated[pid] = (allocated[pid] || 0) + (Number(qty) || 0);
          });
        }
      });
    }

    const summary = products.map((p: any) => {
      const startingStock = getProductStartingStock(planCache, date, p);
      const manualAdd = manualOverrides[p.id] !== undefined ? Number(manualOverrides[p.id]) : 0;
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
    const planCache = new Map<string, any>();
    const computedStartingStocks: { [productId: string]: number } = {};

    products.forEach((p: any) => {
      computedStartingStocks[p.id] = getProductStartingStock(planCache, date, p);
    });

    const row = stmtGetDailyPlan.get(date) as { data: string } | undefined;
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

  // Save daily planning
  app.post("/api/save", requireAuth, requireRole("admin", "sales", "driver"), (req, res) => {
    try {
      const { date, data, userEmail } = req.body;
      if (!date) {
        throw new Error("تاریخ معتبر الزامی است.");
      }
      const oldRow = stmtGetDailyPlan.get(date) as { data: string } | undefined;
      const oldData = oldRow ? JSON.parse(oldRow.data) : { invoices: [], manualStockOverrides: {}, driverSearchSlots: [] };
      const newData = data || { invoices: [], manualStockOverrides: {}, driverSearchSlots: [] };

      const email = userEmail || "unknown@system.com";
      const detailedLogs: any[] = [];

      const getProductDisplayName = (productId: string, productsList: any[]) => {
        const p = productsList?.find((prod: any) => prod.id === productId);
        if (p) {
          return `${p.category} ${p.flavor} (${p.unitWeight} کیلوگرمی)`;
        }
        return `کد محصول: ${productId}`;
      };

      const productsList = getConfigValue("products");

      const oldInvoices = oldData.invoices || [];
      const newInvoices = newData.invoices || [];

      newInvoices.forEach((newInv: any) => {
        const oldInv = oldInvoices.find((i: any) => i.id === newInv.id);
        if (!oldInv) {
          let summary = `کاربر ${email} فاکتور جدیدی برای مشتری "${newInv.customerName || 'نامشخص'}" با راننده "${newInv.driverName || 'بدون راننده'}" و مسیر "${newInv.destinationLocation || 'نامشخص'}" اضافه کرد.`;
          detailedLogs.push({
            action: "افزودن فاکتور",
            details: summary
          });
        } else {
          if (oldInv.customerName !== newInv.customerName) {
            detailedLogs.push({
              action: "ویرایش نام مشتری فاکتور",
              details: `کاربر ${email} نام مشتری فاکتور را از "${oldInv.customerName || 'نامشخص'}" به "${newInv.customerName || 'نامشخص'}" تغییر داد.`
            });
          }
          if (oldInv.driverName !== newInv.driverName) {
            detailedLogs.push({
              action: "تغییر راننده فاکتور",
              details: `کاربر ${email} راننده فاکتور مشتری "${newInv.customerName || 'نامشخص'}" را از "${oldInv.driverName || 'بدون راننده'}" به "${newInv.driverName || 'بدون راننده'}" تغییر داد.`
            });
          }
          if (oldInv.round !== newInv.round) {
            detailedLogs.push({
              action: "تغییر نوبت فاکتور",
              details: `کاربر ${email} نوبت فاکتور مشتری "${newInv.customerName || 'نامشخص'}" را از "${oldInv.round || 1}" به "${newInv.round || 1}" تغییر داد.`
            });
          }
          if (oldInv.destinationLocation !== newInv.destinationLocation) {
            detailedLogs.push({
              action: "تغییر مسیر فاکتور",
              details: `کاربر ${email} مسیر فاکتور مشتری "${newInv.customerName || 'نامشخص'}" را از "${oldInv.destinationLocation || 'نامشخص'}" به "${newInv.destinationLocation || 'نامشخص'}" تغییر داد.`
            });
          }
          if (oldInv.description !== newInv.description) {
            detailedLogs.push({
              action: "تغییر توضیحات فاکتور",
              details: `کاربر ${email} توضیحات فاکتور مشتری "${newInv.customerName || 'نامشخص'}" را از "${oldInv.description || 'بدون توضیح'}" به "${newInv.description || 'بدون توضیح'}" تغییر داد.`
            });
          }

          const oldQuantities = oldInv.quantities || {};
          const newQuantities = newInv.quantities || {};
          const allProductIds = Array.from(new Set([...Object.keys(oldQuantities), ...Object.keys(newQuantities)]));

          allProductIds.forEach((pId) => {
            const oldQty = Number(oldQuantities[pId]) || 0;
            const newQty = Number(newQuantities[pId]) || 0;
            if (oldQty !== newQty) {
              const productName = getProductDisplayName(pId, productsList);
              detailedLogs.push({
                action: "تغییر تعداد کالا در فاکتور",
                details: `کاربر ${email} تعداد محصول "${productName}" در فاکتور مشتری "${newInv.customerName || 'نامشخص'}" را از ${oldQty} به ${newQty} تغییر داد.`
              });
            }
          });
        }
      });

      oldInvoices.forEach((oldInv: any) => {
        const existsInNew = newInvoices.some((i: any) => i.id === oldInv.id);
        if (!existsInNew) {
          detailedLogs.push({
            action: "حذف فاکتور",
            details: `کاربر ${email} فاکتور مشتری "${oldInv.customerName || 'نامشخص'}" (راننده: "${oldInv.driverName || 'بدون راننده'}") را حذف کرد.`
          });
        }
      });

      const oldOverrides = oldData.manualStockOverrides || {};
      const newOverrides = newData.manualStockOverrides || {};
      const allOverrideIds = Array.from(new Set([...Object.keys(oldOverrides), ...Object.keys(newOverrides)]));

      allOverrideIds.forEach((pId) => {
        const oldStock = oldOverrides[pId];
        const newStock = newOverrides[pId];
        if (oldStock !== newStock) {
          const productName = getProductDisplayName(pId, productsList);
          const oldStr = oldStock !== undefined ? `${oldStock} کارتن` : "پیش‌فرض";
          const newStr = newStock !== undefined ? `${newStock} کارتن` : "پیش‌فرض";
          detailedLogs.push({
            action: "تغییر دستی موجودی انبار",
            details: `کاربر ${email} موجودی انبارگردانی دستی محصول "${productName}" را از [${oldStr}] به [${newStr}] تغییر داد.`
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
            new Date().toISOString()
          );
        });
        db.exec("COMMIT");
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }

      res.json({ status: "success" });
    } catch (err: any) {
      console.error("Error saving data:", err);
      res.status(500).json({ status: "error", message: err.message || "خطا در ذخیره اطلاعات" });
    }
  });

  // Statistics endpoints
  app.get("/api/statistics/sales", requireAuth, requireRole("admin", "sales", "driver", "visitor"), (req, res) => {
    const { endDate } = req.query as { endDate?: string };
    const salesMap: { [productId: string]: number } = {};
    getConfigValue("products").forEach((p: any) => { salesMap[p.id] = 0; });

    const rows = (endDate ? stmtDailyPlansBeforeDesc.all(endDate) : stmtDailyPlansAllDesc.all()) as { date: string; data: string }[];
    rows.forEach((row) => {
      const dayData = JSON.parse(row.data);
      if (dayData && dayData.invoices) {
        dayData.invoices.forEach((inv: any) => {
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
    const { endDate } = req.query as { endDate?: string };
    const incomingMap: { [productId: string]: number } = {};
    getConfigValue("products").forEach((p: any) => { incomingMap[p.id] = 0; });

    const rows = (endDate ? stmtDailyPlansBeforeDesc.all(endDate) : stmtDailyPlansAllDesc.all()) as { date: string; data: string }[];
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
    const { endDate } = req.query as { endDate?: string };
    const driverStats: { [driverName: string]: number } = {};
    let totalOrders = 0;

    const rows = (endDate ? stmtDailyPlansUpToDesc.all(endDate) : stmtDailyPlansAllDesc.all()) as { date: string; data: string }[];
    rows.forEach((row) => {
      const dayData = JSON.parse(row.data);
      if (dayData && dayData.invoices) {
        dayData.invoices.forEach((inv: any) => {
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

  // ============================================================
  //  GLOBAL CUSTOMER SEARCH
  // ============================================================

  app.get("/api/search/customer", requireAuth, (req, res) => {
    const { name, fromDate } = req.query as { name?: string; fromDate?: string };
    if (!name || !name.trim()) {
      return res.status(400).json({ status: "error", message: "نام مشتری برای جستجو الزامی است." });
    }
    if (!fromDate) {
      return res.status(400).json({ status: "error", message: "تاریخ شروع جستجو الزامی است." });
    }

    const user = (req as any).user;
    const isVisitor = user?.role === 'visitor';
    const needle = name.trim().toLowerCase();
    const rows = stmtDailyPlansFromDateDesc.all(fromDate) as { date: string; data: string }[];

    // Loaded ONCE, outside the loops below — previously this was re-fetched
    // and re-parsed on every single invoice, which is needlessly slow.
    const productsList = getConfigValue("products");

    const results: any[] = [];
    rows.forEach((row) => {
      let dayData: any;
      try {
        dayData = JSON.parse(row.data);
      } catch { return; }
      if (!dayData || !Array.isArray(dayData.invoices)) return;
      dayData.invoices.forEach((inv: any) => {
        if (inv.customerName && String(inv.customerName).trim().toLowerCase().includes(needle)) {
          results.push({ date: row.date, invoice: inv });
        }
      });
    });

    res.json({ results, count: results.length, isVisitor: false });
  });

  // ============================================================
  //  LOCAL USER AUTH, USER MANAGEMENT & LOGS API
  // ============================================================

  app.post("/api/auth/login", loginLimiter, async (req, res) => {
    const { usernameOrEmail, password } = req.body;
    if (!usernameOrEmail || !password) {
      return res.status(400).json({ status: "error", message: "نام کاربری و رمز عبور الزامی است." });
    }
    const email = usernameOrEmail.includes("@") ? usernameOrEmail : `${usernameOrEmail}@system.com`;

    const user = stmtGetUserByEmail.get(email) as any;
    if (!user) {
      return res.status(404).json({ status: "error", code: "user-not-found", message: "کاربری با این مشخصات یافت نشد." });
    }
    const passwordOk = await bcrypt.compare(password, user.password);
    if (!passwordOk) {
      return res.status(401).json({ status: "error", code: "wrong-password", message: "رمز عبور نادرست است." });
    }
    if (user.status === "disabled") {
      return res.status(403).json({ status: "error", code: "user-disabled", message: "حساب کاربری غیرفعال شده است." });
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
    const authedUser = (req as any).user;
    const freshUser = stmtGetUserByUid.get(authedUser.uid) as any;
    if (!freshUser || freshUser.status === "disabled") {
      return res.status(401).json({ status: "error", code: "unauthorized", message: "نشست شما معتبر نیست." });
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
      const authedUser = (req as any).user;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        throw new Error("لطفاً رمز عبور فعلی و رمز عبور جدید را وارد کنید.");
      }

      if (newPassword.length < 4) {
        throw new Error("رمز عبور جدید باید حداقل ۴ کاراکتر باشد.");
      }

      const user = stmtGetUserByUid.get(authedUser.uid) as any;
      if (!user) {
        throw new Error("کاربر یافت نشد.");
      }

      const passwordOk = await bcrypt.compare(currentPassword, user.password);
      if (!passwordOk) {
        throw new Error("رمز عبور فعلی نادرست است.");
      }

      const newHashed = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
      stmtUpdateUserPassword.run(newHashed, newPassword, user.uid);

      stmtInsertLog.run(
        Date.now().toString() + Math.random().toString(36).slice(2, 6),
        user.email,
        "تغییر رمز عبور",
        `کاربر ${user.email} رمز عبور خود را تغییر داد.`,
        new Date().toISOString()
      );

      res.json({ status: "success", message: "رمز عبور با موفقیت تغییر یافت." });
    } catch (err: any) {
      res.status(400).json({ status: "error", message: err.message || "خطا در تغییر رمز عبور" });
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
        throw new Error("تمامی فیلدها الزامی هستند.");
      }
      const existing = stmtGetUserByEmail.get(email);
      if (existing) {
        throw new Error("این کاربر از قبل در سیستم موجود است.");
      }
      const uid = Date.now().toString();
      const hashed = await bcrypt.hash(password, BCRYPT_ROUNDS);
      stmtInsertUser.run(uid, email, hashed, role, "active", driverName || "", password);
      res.json({ status: "success", user: { uid, email, role, status: "active", driverName: driverName || "", plainPassword: password } });
    } catch (err: any) {
      res.status(400).json({ status: "error", message: err.message });
    }
  });

  app.post("/api/users/update", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { uid, role, driverName, password } = req.body;
      if (!uid || !role) {
        throw new Error("شناسه کاربر و نقش الزامی هستند.");
      }
      const existing = stmtGetUserByUid.get(uid);
      if (!existing) {
        throw new Error("کاربر یافت نشد.");
      }
      stmtUpdateUserRole.run(role, driverName || "", uid);
      if (password) {
        stmtUpdateUserPassword.run(await bcrypt.hash(password, BCRYPT_ROUNDS), password, uid);
      }
      const updated = stmtGetUserByUid.get(uid) as any;
      const { password: _pw, ...safeUser } = updated;
      res.json({ status: "success", user: safeUser });
    } catch (err: any) {
      res.status(err.message === "کاربر یافت نشد." ? 404 : 400).json({ status: "error", message: err.message });
    }
  });

  app.post("/api/users/toggle-status", requireAuth, requireRole("admin"), (req, res) => {
    try {
      const { uid, status } = req.body;
      if (!uid || !status) {
        throw new Error("اطلاعات الزامی ناقص است.");
      }
      const existing = stmtGetUserByUid.get(uid);
      if (!existing) {
        throw new Error("کاربر یافت نشد.");
      }
      stmtUpdateUserStatus.run(status, uid);
      if (status === "disabled") {
        stmtDeleteSessionsByUid.run(uid);
      }
      res.json({ status: "success" });
    } catch (err: any) {
      res.status(err.message === "کاربر یافت نشد." ? 404 : 400).json({ status: "error", message: err.message });
    }
  });

  app.post("/api/users/delete", requireAuth, requireRole("admin"), (req, res) => {
    try {
      const { uid } = req.body;
      if (!uid) {
        throw new Error("شناسه کاربر الزامی است.");
      }
      const user = stmtGetUserByUid.get(uid) as any;
      if (!user) {
        throw new Error("کاربر یافت نشد.");
      }
      if (user.email === "admin@system.com") {
        throw new Error("امکان حذف کاربر مدیر کل اصلی سیستم وجود ندارد.");
      }
      stmtDeleteUser.run(uid);
      stmtDeleteSessionsByUid.run(uid);
      res.json({ status: "success" });
    } catch (err: any) {
      res.status(err.message === "کاربر یافت نشد." ? 404 : 400).json({ status: "error", message: err.message });
    }
  });

  // Activity logs
  const LOG_CATEGORY_CONDITIONS: Record<string, string> = {
    invoice: "action LIKE '%فاکتور%'",
    stock: "action LIKE '%موجودی%'",
    users: "action LIKE '%کاربر%'",
    system: "(action LIKE '%پاک‌سازی%' OR action LIKE '%ریست%' OR action LIKE '%بازنشانی%' OR action LIKE '%ورود به سیستم%')"
  };

  app.get("/api/logs", requireAuth, requireRole("admin"), (req, res) => {
    const { userId, category, page, pageSize } = req.query as { userId?: string; category?: string; page?: string; pageSize?: string };

    if (!page && !pageSize && !category) {
      const logs = userId ? stmtGetLogsByUser.all(userId) : stmtGetLogsAll.all();
      return res.json({ logs });
    }

    const pageNum = Math.max(1, parseInt(page || "1", 10) || 1);
    const size = Math.min(200, Math.max(1, parseInt(pageSize || "30", 10) || 30));
    const offset = (pageNum - 1) * size;

    const conditions: string[] = [];
    const params: any[] = [];
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
    const total = (db.prepare(`SELECT COUNT(*) as c FROM activity_logs ${whereSql}`).get(...params) as { c: number }).c;

    res.json({ logs, total, page: pageNum, pageSize: size });
  });

  app.post("/api/logs/create", requireAuth, (req, res) => {
    try {
      const { userId, action, details } = req.body;
      if (!userId || !action) {
        throw new Error("اطلاعات ناقص است.");
      }
      const newLog = {
        id: Date.now().toString() + Math.random().toString(36).slice(2, 7),
        userId,
        action,
        details: typeof details === "string" ? details : JSON.stringify(details || {}),
        timestamp: new Date().toISOString()
      };
      stmtInsertLog.run(newLog.id, newLog.userId, newLog.action, newLog.details, newLog.timestamp);
      res.json({ status: "success", log: newLog });
    } catch (err: any) {
      res.status(400).json({ status: "error", message: err.message });
    }
  });

  app.delete("/api/logs/clear", requireAuth, requireRole("admin"), (req, res) => {
    try {
      stmtClearLogs.run();
      res.json({ status: "success", message: "تمامی لاگ‌های تغییرات با موفقیت حذف شدند." });
    } catch (err: any) {
      console.error("Error clearing logs", err);
      res.status(500).json({ status: "error", message: "خطا در پاکسازی لاگ‌ها" });
    }
  });

  // ============================================================
  //  MANUAL BACKUP / RESTORE
  // ============================================================

  app.get("/api/backup/download", requireAuth, requireRole("admin"), (req, res) => {
    try {
      const { fromDate, toDate } = req.query as { fromDate?: string; toDate?: string };
      const isRanged = !!(fromDate && toDate);

      const dailyPlanRows = isRanged
        ? (stmtGetDailyPlansInRange.all(fromDate, toDate) as { date: string; data: string }[])
        : (stmtGetAllDailyPlans.all() as { date: string; data: string }[]);

      const backup = {
        formatVersion: 1,
        generatedAt: new Date().toISOString(),
        range: isRanged ? { fromDate, toDate } : null,
        drivers: getConfigValue("drivers"),
        products: getConfigValue("products"),
        users: (stmtGetAllUsersFull.all() as any[]).map((u) => ({
          uid: u.uid, email: u.email, password: u.password, role: u.role, status: u.status, driverName: u.driverName
        })),
        dailyPlans: dailyPlanRows.map((r) => ({ date: r.date, data: JSON.parse(r.data) })),
        activityLogs: isRanged ? [] : (stmtGetAllLogsAsc.all() as any[])
      };

      const filename = isRanged
        ? `backup-${String(fromDate).replace(/\//g, "-")}_${String(toDate).replace(/\//g, "-")}.json`
        : `backup-full-${new Date().toISOString().slice(0, 10)}.json`;

      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.send(JSON.stringify(backup, null, 2));
    } catch (err: any) {
      console.error("Backup download error:", err);
      res.status(500).json({ status: "error", message: "خطا در تهیه فایل پشتیبان" });
    }
  });

  const normalizeBackupPayload = (input: any) => {
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

    const dailyPlans: { date: string; data: any }[] = [];
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
        throw new Error("فایل پشتیبان معتبر نیست.");
      }
      const backup = normalizeBackupPayload(rawBody);
      if (backup.drivers.length === 0 && backup.products.length === 0 && backup.users.length === 0 && backup.dailyPlans.length === 0 && backup.activityLogs.length === 0) {
        throw new Error("فایل انتخاب‌شده هیچ داده‌ی قابل‌شناسایی‌ای نداشت.");
      }

      const summary = { driversAdded: 0, productsAdded: 0, usersAdded: 0, dailyPlansAdded: 0, dailyPlansMerged: 0, logsAdded: 0 };

      db.exec("BEGIN");
      try {
        if (Array.isArray(backup.drivers)) {
          const currentDrivers = getConfigValue("drivers");
          const existingNames = new Set(currentDrivers.map((d: any) => d.name));
          const merged = [...currentDrivers];
          backup.drivers.forEach((d: any) => {
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
          const existingIds = new Set(currentProducts.map((p: any) => p.id));
          const merged = [...currentProducts];
          backup.products.forEach((p: any) => {
            if (p && p.id && !existingIds.has(p.id)) {
              merged.push(p);
              existingIds.add(p.id);
              summary.productsAdded++;
            }
          });
          if (summary.productsAdded > 0) stmtSetConfig.run("products", JSON.stringify(merged));
        }

        if (Array.isArray(backup.users)) {
          backup.users.forEach((u: any) => {
            if (!u || !u.email) return;
            const existing = stmtGetUserByEmail.get(u.email);
            if (!existing) {
              const password = u.password && String(u.password).startsWith("$2")
                ? u.password
                : bcrypt.hashSync(String(u.password || crypto.randomBytes(8).toString("hex")), BCRYPT_ROUNDS);
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
          backup.dailyPlans.forEach((entry: any) => {
            if (!entry || !entry.date || !entry.data) return;
            const existingRow = stmtGetDailyPlan.get(entry.date) as { data: string } | undefined;
            if (!existingRow) {
              stmtUpsertDailyPlan.run(entry.date, JSON.stringify(entry.data));
              summary.dailyPlansAdded++;
            } else {
              const existingData = JSON.parse(existingRow.data);
              existingData.invoices = existingData.invoices || [];
              const existingInvoiceIds = new Set(existingData.invoices.map((i: any) => i.id));
              let addedAny = false;

              (entry.data.invoices || []).forEach((inv: any) => {
                if (inv && inv.id && !existingInvoiceIds.has(inv.id)) {
                  existingData.invoices.push(inv);
                  existingInvoiceIds.add(inv.id);
                  addedAny = true;
                }
              });

              if (entry.data.manualStockOverrides) {
                existingData.manualStockOverrides = existingData.manualStockOverrides || {};
                Object.entries(entry.data.manualStockOverrides).forEach(([pid, val]) => {
                  if (existingData.manualStockOverrides[pid] === undefined) {
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
          backup.activityLogs.forEach((log: any) => {
            if (!log || !log.id) return;
            try {
              stmtInsertLog.run(
                log.id,
                log.userId || "unknown@system.com",
                log.action || "",
                typeof log.details === "string" ? log.details : JSON.stringify(log.details || {}),
                log.timestamp || new Date().toISOString()
              );
              summary.logsAdded++;
            } catch {
              // Duplicate id (already restored previously) — skip silently
            }
          });
        }

        db.exec("COMMIT");
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }

      res.json({ status: "success", summary });
    } catch (err: any) {
      console.error("Backup restore error:", err);
      res.status(400).json({ status: "error", message: err.message || "خطا در بازگردانی فایل پشتیبان" });
    }
  });

  // ============================================================
  //  DANGER ZONE — data reset (primary admin only)
  // ============================================================

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
        (req as any).user.email,
        "پاک‌سازی برنامه‌های روزانه",
        "تمام برنامه‌های روزانه (فاکتورها) و تاریخچه‌ی لاگ‌ها توسط مدیر اصلی پاک شد.",
        new Date().toISOString()
      );
      res.json({ status: "success" });
    } catch (err: any) {
      console.error("Reset daily data error:", err);
      res.status(500).json({ status: "error", message: "خطا در پاک‌سازی اطلاعات" });
    }
  });

  app.post("/api/system/factory-reset", requireAuth, requirePrimaryAdmin, (req, res) => {
    try {
      const { confirmation } = req.body;
      if (confirmation !== "RESET") {
        return res.status(400).json({ status: "error", message: "عبارت تأیید نادرست است." });
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

      const newToken = createSession((req as any).user.uid);
      stmtInsertLog.run(
        Date.now().toString() + Math.random().toString(36).slice(2, 6),
        PRIMARY_ADMIN_EMAIL,
        "ریست کامل کارخانه‌ای سیستم",
        "تمام داده‌های سیستم (رانندگان، کالاها، کاربران، برنامه‌های روزانه، لاگ‌ها) توسط مدیر اصلی پاک شد.",
        new Date().toISOString()
      );

      res.json({ status: "success", token: newToken });
    } catch (err: any) {
      console.error("Factory reset error:", err);
      res.status(500).json({ status: "error", message: "خطا در ریست کامل سیستم" });
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "healthy", timestamp: new Date().toISOString() });
  });

  // ============================================================
  //  SERVE STATIC UI ASSETS AND DYNAMIC VITE SERVER
  // ============================================================

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  if (process.env.NODE_ENV === "production") {
    app.listen(process.env.PORT || 3000, () => {
      console.log(`Server running in production on port ${process.env.PORT || 3000}`);
    });
  } else {
    app.listen(PORT as number, "0.0.0.0", () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
    });
  }
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});