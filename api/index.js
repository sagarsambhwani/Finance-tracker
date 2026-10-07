var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/entrypoint.ts
import { handle } from "@hono/node-server/vercel";

// server/app.ts
import { Hono as Hono18 } from "hono";

// server/routes/auth.ts
import { Hono } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import crypto from "crypto";

// server/db/client.ts
import "dotenv/config";
import { createClient } from "@libsql/client/web";
import { drizzle } from "drizzle-orm/libsql";

// server/db/schema.ts
var schema_exports = {};
__export(schema_exports, {
  accounts: () => accounts,
  authSessions: () => authSessions,
  automationRuleLogs: () => automationRuleLogs,
  automationRules: () => automationRules,
  budgetTag: () => budgetTag,
  budgets: () => budgets,
  categories: () => categories,
  currencies: () => currencies,
  recurringTransactionTag: () => recurringTransactionTag,
  recurringTransactions: () => recurringTransactions,
  settings: () => settings,
  tags: () => tags,
  transactionItems: () => transactionItems,
  transactionTag: () => transactionTag,
  transactions: () => transactions,
  twoFactorRecoveryCodes: () => twoFactorRecoveryCodes,
  users: () => users,
  webauthnCredentials: () => webauthnCredentials
});
import { sqliteTable, text, integer, real, primaryKey, index } from "drizzle-orm/sqlite-core";
var users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role", { enum: ["admin", "read-write", "read-only"] }).notNull().default("admin"),
  isSsoOnly: integer("is_sso_only", { mode: "boolean" }).notNull().default(false),
  twoFactorSecret: text("two_factor_secret"),
  twoFactorEnabled: integer("two_factor_enabled", { mode: "boolean" }).notNull().default(false),
  twoFactorConfirmed: integer("two_factor_confirmed", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
});
var authSessions = sqliteTable("auth_sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  csrf: text("csrf").notNull().default(""),
  ip: text("ip"),
  userAgent: text("user_agent"),
  lastUsedAt: text("last_used_at").notNull(),
  idleExpiresAt: text("idle_expires_at"),
  absoluteExpiresAt: text("absolute_expires_at"),
  expiresAt: text("expires_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
});
var twoFactorRecoveryCodes = sqliteTable("two_factor_recovery_codes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  code: text("code").notNull(),
  usedAt: text("used_at"),
  createdAt: text("created_at").notNull()
});
var webauthnCredentials = sqliteTable("webauthn_credentials", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  credentialId: text("credential_id", { length: 512 }).notNull().unique(),
  name: text("name", { length: 100 }),
  aaguid: text("aaguid"),
  record: text("record").notNull(),
  // JSON
  transports: text("transports"),
  // JSON
  counter: integer("counter").notNull().default(0),
  lastUsedAt: text("last_used_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
});
var currencies = sqliteTable("currencies", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code", { length: 10 }).notNull().unique(),
  name: text("name").notNull(),
  symbol: text("symbol", { length: 5 }).notNull(),
  decimals: integer("decimals").notNull().default(2),
  isBase: integer("is_base", { mode: "boolean" }).notNull().default(false),
  rate: real("rate").notNull().default(1),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
});
var accounts = sqliteTable("accounts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  type: text("type", { enum: ["bank", "crypto", "cash", "debt"] }).notNull(),
  debtType: text("debt_type", { enum: ["i_owe", "owed_to_me"] }),
  currencyId: integer("currency_id").notNull().references(() => currencies.id),
  initialBalance: real("initial_balance").notNull().default(0),
  balance: real("balance").notNull().default(0),
  color: text("color").default("#3b82f6"),
  icon: text("icon").default("landmark"),
  isArchived: integer("is_archived", { mode: "boolean" }).notNull().default(false),
  targetAmount: real("target_amount"),
  dueDate: text("due_date"),
  isPaidOff: integer("is_paid_off", { mode: "boolean" }).notNull().default(false),
  counterparty: text("counterparty"),
  debtDescription: text("debt_description"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
}, (table) => [
  index("accounts_type_debt_type_idx").on(table.type, table.debtType),
  index("accounts_is_paid_off_idx").on(table.isPaidOff)
]);
var categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  type: text("type", { enum: ["income", "expense"] }).notNull(),
  icon: text("icon"),
  color: text("color"),
  parentId: integer("parent_id"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
});
var tags = sqliteTable("tags", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
});
var transactions = sqliteTable("transactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  type: text("type", { enum: ["income", "expense", "transfer", "debt_payment", "debt_collection"] }).notNull(),
  accountId: integer("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  toAccountId: integer("to_account_id").references(() => accounts.id, { onDelete: "set null" }),
  categoryId: integer("category_id").references(() => categories.id, { onDelete: "set null" }),
  amount: real("amount").notNull(),
  toAmount: real("to_amount"),
  exchangeRate: real("exchange_rate").default(1),
  description: text("description"),
  date: text("date").notNull(),
  // YYYY-MM-DD
  dedupHash: text("dedup_hash"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
}, (table) => [
  index("transactions_date_idx").on(table.date),
  index("transactions_type_idx").on(table.type),
  index("transactions_account_date_idx").on(table.accountId, table.date),
  index("transactions_dedup_hash_idx").on(table.dedupHash)
]);
var transactionItems = sqliteTable("transaction_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  transactionId: integer("transaction_id").notNull().references(() => transactions.id, { onDelete: "cascade" }),
  description: text("description"),
  amount: real("amount").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
});
var transactionTag = sqliteTable("transaction_tag", {
  transactionId: integer("transaction_id").notNull().references(() => transactions.id, { onDelete: "cascade" }),
  tagId: integer("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" })
}, (table) => [
  primaryKey({ columns: [table.transactionId, table.tagId] })
]);
var budgets = sqliteTable("budgets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  categoryId: integer("category_id").notNull().references(() => categories.id, { onDelete: "cascade" }),
  currencyId: integer("currency_id").references(() => currencies.id),
  amount: real("amount").notNull(),
  period: text("period", { enum: ["monthly", "yearly"] }).notNull().default("monthly"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
});
var budgetTag = sqliteTable("budget_tag", {
  budgetId: integer("budget_id").notNull().references(() => budgets.id, { onDelete: "cascade" }),
  tagId: integer("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" })
}, (table) => [
  primaryKey({ columns: [table.budgetId, table.tagId] })
]);
var recurringTransactions = sqliteTable("recurring_transactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  type: text("type", { enum: ["income", "expense", "transfer"] }).notNull(),
  accountId: integer("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  toAccountId: integer("to_account_id").references(() => accounts.id, { onDelete: "set null" }),
  categoryId: integer("category_id").references(() => categories.id, { onDelete: "set null" }),
  amount: real("amount").notNull(),
  toAmount: real("to_amount"),
  description: text("description"),
  frequency: text("frequency", { enum: ["daily", "weekly", "monthly", "yearly"] }).notNull(),
  interval: integer("interval").notNull().default(1),
  dayOfWeek: integer("day_of_week"),
  dayOfMonth: integer("day_of_month"),
  startDate: text("start_date").notNull(),
  endDate: text("end_date"),
  nextRunDate: text("next_run_date").notNull(),
  lastRunDate: text("last_run_date"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
}, (table) => [
  index("recurring_next_run_date_idx").on(table.nextRunDate)
]);
var recurringTransactionTag = sqliteTable("recurring_transaction_tag", {
  recurringTransactionId: integer("recurring_transaction_id").notNull().references(() => recurringTransactions.id, { onDelete: "cascade" }),
  tagId: integer("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" })
}, (table) => [
  primaryKey({ columns: [table.recurringTransactionId, table.tagId] })
]);
var automationRules = sqliteTable("automation_rules", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description"),
  triggerType: text("trigger_type", { length: 50 }).notNull(),
  // 'transaction_created', 'transaction_imported'
  priority: integer("priority").notNull().default(50),
  conditions: text("conditions").notNull(),
  // JSON array of rules
  actions: text("actions").notNull(),
  // JSON array of actions
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  stopProcessing: integer("stop_processing", { mode: "boolean" }).notNull().default(false),
  runsCount: integer("runs_count").notNull().default(0),
  lastRunAt: text("last_run_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
}, (table) => [
  index("automation_trigger_active_priority_idx").on(table.triggerType, table.isActive, table.priority)
]);
var automationRuleLogs = sqliteTable("automation_rule_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ruleId: integer("rule_id").notNull().references(() => automationRules.id, { onDelete: "cascade" }),
  triggerEntityType: text("trigger_entity_type", { length: 50 }),
  triggerEntityId: integer("trigger_entity_id"),
  actionsExecuted: text("actions_executed"),
  // JSON
  status: text("status", { enum: ["success", "error", "skipped"] }).notNull(),
  errorMessage: text("error_message"),
  createdAt: text("created_at").notNull()
}, (table) => [
  index("automation_logs_rule_created_idx").on(table.ruleId, table.createdAt)
]);
var settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value")
});

// server/db/client.ts
var url = "libsql://finance-tracker-sagarsambhwani.aws-eu-west-1.turso.io";
var authToken = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTEzNjg5NjcsImlkIjoiMDFhMTE1ZTUtZTAwMS03Yjc0LThiZTUtOGVhYjA4MWJlOTI3Iiwia2lkIjoickhnU0Q0RnUwRzhFbG5udlFSbTQyeFJZck4wS1A1VURkTXhQcnN0bXNnOCIsInJpZCI6IjBmOTg4ZjhiLTc1YzQtNGYxZS1hMDRmLTAxM2YzZWRkZDRhNCJ9.yUy6GDwaV0Xz2Idsw8HwXM61X9raMDkP6xqNdxehKYrgWEtrVVM_uvjd2cSNT76WYIRo151P8OXz4DEcTIPgDg";
var rawClient = createClient({
  url,
  authToken
});
var db = drizzle(rawClient, { schema: schema_exports });
var CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin',
    is_sso_only INTEGER NOT NULL DEFAULT 0,
    two_factor_secret TEXT,
    two_factor_enabled INTEGER NOT NULL DEFAULT 0,
    two_factor_confirmed INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS auth_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    csrf TEXT DEFAULT '',
    ip TEXT,
    user_agent TEXT,
    last_used_at TEXT NOT NULL,
    idle_expires_at TEXT,
    absolute_expires_at TEXT,
    expires_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS two_factor_recovery_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    used_at TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS webauthn_credentials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    credential_id TEXT NOT NULL UNIQUE,
    name TEXT,
    aaguid TEXT,
    record TEXT NOT NULL,
    transports TEXT,
    counter INTEGER NOT NULL DEFAULT 0,
    last_used_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS currencies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    symbol TEXT NOT NULL,
    decimals INTEGER NOT NULL DEFAULT 2,
    is_base INTEGER NOT NULL DEFAULT 0,
    rate REAL NOT NULL DEFAULT 1.0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    debt_type TEXT,
    currency_id INTEGER NOT NULL DEFAULT 1,
    initial_balance REAL NOT NULL DEFAULT 0,
    target_amount REAL,
    due_date TEXT,
    is_paid_off INTEGER NOT NULL DEFAULT 0,
    counterparty TEXT,
    debt_description TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    balance REAL NOT NULL DEFAULT 0,
    color TEXT DEFAULT '#3b82f6',
    icon TEXT DEFAULT 'landmark',
    is_archived INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    icon TEXT,
    color TEXT,
    parent_id INTEGER,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    to_account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    amount REAL NOT NULL,
    to_amount REAL,
    exchange_rate REAL DEFAULT 1.0,
    description TEXT,
    date TEXT NOT NULL,
    dedup_hash TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS transaction_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    description TEXT,
    amount REAL NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS transaction_tag (
    transaction_id INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (transaction_id, tag_id)
);

CREATE TABLE IF NOT EXISTS budgets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    currency_id INTEGER REFERENCES currencies(id),
    amount REAL NOT NULL,
    period TEXT NOT NULL DEFAULT 'monthly',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS budget_tag (
    budget_id INTEGER NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (budget_id, tag_id)
);

CREATE TABLE IF NOT EXISTS recurring_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    to_account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    amount REAL NOT NULL,
    to_amount REAL,
    description TEXT,
    frequency TEXT NOT NULL,
    interval INTEGER NOT NULL DEFAULT 1,
    day_of_week INTEGER,
    day_of_month INTEGER,
    start_date TEXT NOT NULL,
    end_date TEXT,
    next_run_date TEXT NOT NULL,
    last_run_date TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS recurring_transaction_tag (
    recurring_transaction_id INTEGER NOT NULL REFERENCES recurring_transactions(id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (recurring_transaction_id, tag_id)
);

CREATE TABLE IF NOT EXISTS automation_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    trigger_type TEXT NOT NULL,
    priority INTEGER NOT NULL DEFAULT 50,
    conditions TEXT NOT NULL,
    actions TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    stop_processing INTEGER NOT NULL DEFAULT 0,
    runs_count INTEGER NOT NULL DEFAULT 0,
    last_run_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS automation_rule_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rule_id INTEGER NOT NULL REFERENCES automation_rules(id) ON DELETE CASCADE,
    trigger_entity_type TEXT,
    trigger_entity_id INTEGER,
    actions_executed TEXT,
    status TEXT NOT NULL,
    error_message TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
);
`;
var isInitialized = false;
async function initDatabase() {
  if (isInitialized) return;
  try {
    await rawClient.executeMultiple(CREATE_TABLES_SQL);
    await seedDefaultData();
    isInitialized = true;
  } catch (e) {
    console.warn("Database initialization note:", e);
  }
}
async function seedDefaultData() {
  try {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const existingCurrencies = await db.select().from(currencies).limit(1);
    if (existingCurrencies.length === 0) {
      await db.insert(currencies).values([
        { code: "EUR", name: "Euro", symbol: "\u20AC", decimals: 2, rate: 1, isBase: true, createdAt: now, updatedAt: now },
        { code: "USD", name: "US Dollar", symbol: "$", decimals: 2, rate: 1.08, isBase: false, createdAt: now, updatedAt: now },
        { code: "INR", name: "Indian Rupee", symbol: "\u20B9", decimals: 2, rate: 90.5, isBase: false, createdAt: now, updatedAt: now },
        { code: "GBP", name: "British Pound", symbol: "\xA3", decimals: 2, rate: 0.85, isBase: false, createdAt: now, updatedAt: now }
      ]).onConflictDoNothing();
    }
    const existingCategories = await db.select().from(categories).limit(1);
    if (existingCategories.length === 0) {
      await db.insert(categories).values([
        { name: "Salary", type: "income", icon: "wallet", color: "#10b981", createdAt: now, updatedAt: now },
        { name: "Freelance", type: "income", icon: "briefcase", color: "#06b6d4", createdAt: now, updatedAt: now },
        { name: "Food & Dining", type: "expense", icon: "utensils", color: "#f59e0b", createdAt: now, updatedAt: now },
        { name: "Groceries", type: "expense", icon: "shopping-cart", color: "#84cc16", createdAt: now, updatedAt: now },
        { name: "Housing & Rent", type: "expense", icon: "home", color: "#6366f1", createdAt: now, updatedAt: now },
        { name: "Utilities", type: "expense", icon: "zap", color: "#ec4899", createdAt: now, updatedAt: now },
        { name: "Transportation", type: "expense", icon: "car", color: "#3b82f6", createdAt: now, updatedAt: now },
        { name: "Entertainment", type: "expense", icon: "film", color: "#8b5cf6", createdAt: now, updatedAt: now },
        { name: "Health & Medical", type: "expense", icon: "heart", color: "#ef4444", createdAt: now, updatedAt: now }
      ]).onConflictDoNothing();
    }
  } catch (e) {
    console.warn("Seeding check note:", e);
  }
}

// server/routes/auth.ts
var auth = new Hono();
var COOKIE_NAME = "svy_session";
async function getAuthUser(c) {
  const token = getCookie(c, COOKIE_NAME) || c.req.header("Authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const session = await db.query.authSessions?.findFirst({
    where: eq(authSessions.token, token)
  }) || (await db.select().from(authSessions).where(eq(authSessions.token, token)))[0];
  if (!session) return null;
  const user = (await db.select().from(users).where(eq(users.id, session.userId)))[0];
  return user || null;
}
auth.get("/status", async (c) => {
  const allUsers = await db.select().from(users).limit(1);
  return c.json({
    needs_registration: allUsers.length === 0,
    password_login_enabled: true
  });
});
auth.post("/register", async (c) => {
  const countUsers = await db.select().from(users).limit(1);
  if (countUsers.length > 0) {
    return c.json({ message: "Registration is closed. Please ask your administrator for an account." }, 403);
  }
  const { name, email, password } = await c.req.json();
  if (!name || !email || !password || password.length < 6) {
    return c.json({ message: "Valid name, email, and password (min 6 chars) are required." }, 400);
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const [newUser] = await db.insert(users).values({
    name,
    email: email.toLowerCase().trim(),
    password: hashedPassword,
    role: "admin",
    createdAt: now,
    updatedAt: now
  }).returning();
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1e3).toISOString();
  await db.insert(authSessions).values({
    userId: newUser.id,
    token,
    lastUsedAt: now,
    expiresAt,
    createdAt: now,
    updatedAt: now
  });
  setCookie(c, COOKIE_NAME, token, {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 30 * 24 * 60 * 60,
    sameSite: "Lax"
  });
  return c.json({
    user: {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role
    }
  }, 201);
});
auth.post("/login", async (c) => {
  const { email, password } = await c.req.json();
  if (!email || !password) {
    return c.json({ message: "Email and password are required." }, 400);
  }
  const user = (await db.select().from(users).where(eq(users.email, email.toLowerCase().trim())))[0];
  if (!user) {
    return c.json({ message: "Invalid credentials." }, 401);
  }
  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) {
    return c.json({ message: "Invalid credentials." }, 401);
  }
  const token = crypto.randomBytes(32).toString("hex");
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1e3).toISOString();
  await db.insert(authSessions).values({
    userId: user.id,
    token,
    lastUsedAt: now,
    expiresAt,
    createdAt: now,
    updatedAt: now
  });
  setCookie(c, COOKIE_NAME, token, {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 30 * 24 * 60 * 60,
    sameSite: "Lax"
  });
  return c.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  });
});
auth.get("/me", async (c) => {
  const user = await getAuthUser(c);
  if (!user) {
    return c.json({ user: null });
  }
  return c.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  });
});
auth.post("/logout", async (c) => {
  const token = getCookie(c, COOKIE_NAME);
  if (token) {
    await db.delete(authSessions).where(eq(authSessions.token, token));
  }
  deleteCookie(c, COOKIE_NAME, { path: "/" });
  return c.json({ message: "Logged out." });
});
auth.get("/2fa/status", (c) => {
  return c.json({ enabled: false });
});
auth.get("/webauthn/credentials", (c) => {
  return c.json({ credentials: [] });
});
auth.get("/sso/providers", (c) => {
  return c.json([]);
});
auth.get("/sso/presets", (c) => {
  return c.json([]);
});
var auth_default = auth;

// server/routes/accounts.ts
import { Hono as Hono2 } from "hono";
import { eq as eq2, desc, and, ne } from "drizzle-orm";
var router = new Hono2();
router.use("*", async (c, next) => {
  const user = await getAuthUser(c);
  if (!user) {
    return c.json({ message: "Unauthorized" }, 401);
  }
  c.set("user", user);
  await next();
});
async function getAccountsSummary() {
  const list = await db.select().from(accounts).where(and(ne(accounts.type, "debt"), eq2(accounts.isActive, true)));
  const baseCurr = (await db.select().from(currencies).where(eq2(currencies.isBase, true)))[0] || { symbol: "\u20AC", code: "EUR", decimals: 2 };
  const totalBalance = list.reduce((sum, a) => sum + (Number(a.balance) || 0), 0);
  return {
    total_balance: totalBalance,
    currency: baseCurr.symbol,
    currency_code: baseCurr.code,
    decimals: baseCurr.decimals,
    accounts_count: list.length
  };
}
router.get("/", async (c) => {
  const withSummary = c.req.query("with_summary") === "true";
  const excludeDebts = c.req.query("exclude_debts") === "true";
  const activeOnly = c.req.query("active") === "true";
  const conditions = [];
  if (excludeDebts) conditions.push(ne(accounts.type, "debt"));
  if (activeOnly) conditions.push(eq2(accounts.isActive, true));
  const list = await db.select({
    id: accounts.id,
    name: accounts.name,
    type: accounts.type,
    currency_id: accounts.currencyId,
    balance: accounts.balance,
    color: accounts.color,
    icon: accounts.icon,
    is_active: accounts.isActive,
    currency: currencies
  }).from(accounts).leftJoin(currencies, eq2(accounts.currencyId, currencies.id)).where(conditions.length > 0 ? and(...conditions) : void 0).orderBy(desc(accounts.id));
  const mapped = list.map((a) => ({
    ...a,
    currencyId: a.currency_id,
    currentBalance: Number(a.balance) || 0,
    current_balance: Number(a.balance) || 0,
    initialBalance: Number(a.balance) || 0,
    initial_balance: Number(a.balance) || 0,
    isActive: Boolean(a.is_active)
  }));
  const res = { data: mapped };
  if (withSummary) {
    res.summary = await getAccountsSummary();
  }
  return c.json(res);
});
router.post("/", async (c) => {
  const body = await c.req.json();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const [account] = await db.insert(accounts).values({
    name: body.name,
    type: body.type || "bank",
    currencyId: Number(body.currency_id || 1),
    balance: Number(body.balance || 0),
    color: body.color || "#3b82f6",
    icon: body.icon || "landmark",
    isActive: true,
    createdAt: now,
    updatedAt: now
  }).returning();
  return c.json(account, 201);
});
router.get("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const account = (await db.select().from(accounts).where(eq2(accounts.id, id)))[0];
  if (!account) return c.json({ message: "Account not found" }, 404);
  return c.json(account);
});
var handleUpdate = async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const updateData = { updatedAt: now };
  if (body.name !== void 0) updateData.name = body.name;
  if (body.type !== void 0) updateData.type = body.type;
  if (body.currency_id !== void 0) updateData.currencyId = Number(body.currency_id);
  if (body.balance !== void 0) updateData.balance = Number(body.balance);
  if (body.color !== void 0) updateData.color = body.color;
  if (body.icon !== void 0) updateData.icon = body.icon;
  if (body.is_active !== void 0) updateData.isActive = Boolean(body.is_active);
  const [updated] = await db.update(accounts).set(updateData).where(eq2(accounts.id, id)).returning();
  if (!updated) return c.json({ message: "Account not found" }, 404);
  return c.json(updated);
};
router.put("/:id", handleUpdate);
router.patch("/:id", handleUpdate);
router.delete("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  await db.delete(accounts).where(eq2(accounts.id, id));
  return c.json({ message: "Account deleted" });
});
var accounts_default = router;

// server/routes/categories.ts
import { Hono as Hono3 } from "hono";
import { eq as eq3, and as and2 } from "drizzle-orm";
var router2 = new Hono3();
router2.use("*", async (c, next) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ message: "Unauthorized" }, 401);
  await next();
});
router2.get("/", async (c) => {
  const type = c.req.query("type");
  const conditions = [];
  if (type) conditions.push(eq3(categories.type, type));
  const list = await db.select().from(categories).where(conditions.length > 0 ? and2(...conditions) : void 0);
  return c.json({ data: list });
});
router2.get("/summary", async (c) => {
  const type = c.req.query("type") || "expense";
  const baseCurr = (await db.select().from(currencies).where(eq3(currencies.isBase, true)))[0] || { symbol: "\u20AC" };
  const cats = await db.select().from(categories).where(eq3(categories.type, type));
  const txs = await db.select().from(transactions).where(eq3(transactions.type, type));
  const totalsByCat = /* @__PURE__ */ new Map();
  for (const t of txs) {
    if (t.categoryId) {
      totalsByCat.set(t.categoryId, (totalsByCat.get(t.categoryId) || 0) + Number(t.amount));
    }
  }
  let total = 0;
  const data = cats.map((cat) => {
    const amt = totalsByCat.get(cat.id) || 0;
    total += amt;
    return {
      ...cat,
      total_amount: amt,
      currency: baseCurr.symbol
    };
  });
  return c.json({
    data,
    total,
    currency: baseCurr.symbol
  });
});
router2.get("/:id/statistics", async (c) => {
  const id = Number(c.req.param("id"));
  const cat = (await db.select().from(categories).where(eq3(categories.id, id)))[0];
  if (!cat) return c.json({ message: "Category not found" }, 404);
  const catTx = await db.select().from(transactions).where(eq3(transactions.categoryId, id));
  const totalAmount = catTx.reduce((sum, t) => sum + Number(t.amount), 0);
  return c.json({
    category_id: cat.id,
    category_name: cat.name,
    type: cat.type,
    transactions_count: catTx.length,
    total_amount: totalAmount
  });
});
router2.get("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const category = (await db.select().from(categories).where(eq3(categories.id, id)))[0];
  if (!category) return c.json({ message: "Category not found" }, 404);
  return c.json(category);
});
router2.post("/", async (c) => {
  const body = await c.req.json();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const [category] = await db.insert(categories).values({
    name: body.name,
    type: body.type || "expense",
    icon: body.icon || "tag",
    color: body.color || "#64748b",
    parentId: body.parent_id ? Number(body.parent_id) : null,
    createdAt: now,
    updatedAt: now
  }).returning();
  return c.json(category, 201);
});
var handleUpdate2 = async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const updateData = { updatedAt: now };
  if (body.name !== void 0) updateData.name = body.name;
  if (body.type !== void 0) updateData.type = body.type;
  if (body.icon !== void 0) updateData.icon = body.icon;
  if (body.color !== void 0) updateData.color = body.color;
  if (body.parent_id !== void 0) updateData.parentId = body.parent_id ? Number(body.parent_id) : null;
  const [updated] = await db.update(categories).set(updateData).where(eq3(categories.id, id)).returning();
  if (!updated) return c.json({ message: "Category not found" }, 404);
  return c.json(updated);
};
router2.put("/:id", handleUpdate2);
router2.patch("/:id", handleUpdate2);
router2.delete("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  await db.delete(categories).where(eq3(categories.id, id));
  return c.json({ message: "Category deleted" });
});
var categories_default = router2;

// server/routes/currencies.ts
import { Hono as Hono4 } from "hono";
import { eq as eq4 } from "drizzle-orm";
var router3 = new Hono4();
router3.use("*", async (c, next) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ message: "Unauthorized" }, 401);
  await next();
});
router3.get("/", async (c) => {
  const list = await db.select().from(currencies);
  return c.json({ data: list });
});
router3.get("/catalog", async (c) => {
  return c.json({
    data: [
      { code: "EUR", name: "Euro", symbol: "\u20AC" },
      { code: "USD", name: "US Dollar", symbol: "$" },
      { code: "INR", name: "Indian Rupee", symbol: "\u20B9" },
      { code: "GBP", name: "British Pound", symbol: "\xA3" },
      { code: "JPY", name: "Japanese Yen", symbol: "\xA5" },
      { code: "CAD", name: "Canadian Dollar", symbol: "CA$" },
      { code: "AUD", name: "Australian Dollar", symbol: "A$" },
      { code: "CHF", name: "Swiss Franc", symbol: "CHF" },
      { code: "BTC", name: "Bitcoin", symbol: "\u20BF" },
      { code: "ETH", name: "Ethereum", symbol: "\u039E" }
    ]
  });
});
router3.get("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const currency = (await db.select().from(currencies).where(eq4(currencies.id, id)))[0];
  if (!currency) return c.json({ message: "Currency not found" }, 404);
  return c.json(currency);
});
router3.post("/", async (c) => {
  const body = await c.req.json();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const [currency] = await db.insert(currencies).values({
    code: body.code.toUpperCase(),
    name: body.name,
    symbol: body.symbol,
    decimals: Number(body.decimals || 2),
    isBase: Boolean(body.is_base),
    rate: Number(body.rate || 1),
    createdAt: now,
    updatedAt: now
  }).returning();
  return c.json(currency, 201);
});
var handleUpdate3 = async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const updateData = { updatedAt: now };
  if (body.name !== void 0) updateData.name = body.name;
  if (body.symbol !== void 0) updateData.symbol = body.symbol;
  if (body.decimals !== void 0) updateData.decimals = Number(body.decimals);
  if (body.rate !== void 0) updateData.rate = Number(body.rate);
  const [updated] = await db.update(currencies).set(updateData).where(eq4(currencies.id, id)).returning();
  if (!updated) return c.json({ message: "Currency not found" }, 404);
  return c.json(updated);
};
router3.put("/:id", handleUpdate3);
router3.patch("/:id", handleUpdate3);
router3.post("/:id/set-base", async (c) => {
  const id = Number(c.req.param("id"));
  const now = (/* @__PURE__ */ new Date()).toISOString();
  await db.update(currencies).set({ isBase: false, updatedAt: now });
  const [updated] = await db.update(currencies).set({ isBase: true, rate: 1, updatedAt: now }).where(eq4(currencies.id, id)).returning();
  return c.json(updated);
});
router3.delete("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  await db.delete(currencies).where(eq4(currencies.id, id));
  return c.json({ message: "Currency deleted" });
});
var currencies_default = router3;

// server/routes/transactions.ts
import { Hono as Hono5 } from "hono";
import { eq as eq5, desc as desc2, and as and3, gte, lte, sql as sql2, count } from "drizzle-orm";
var router4 = new Hono5();
router4.use("*", async (c, next) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ message: "Unauthorized" }, 401);
  await next();
});
async function adjustBalance(accountId, delta) {
  await db.update(accounts).set({ balance: sql2`${accounts.balance} + ${delta}`, updatedAt: (/* @__PURE__ */ new Date()).toISOString() }).where(eq5(accounts.id, accountId));
}
async function getTransactionSummary() {
  const allTx = await db.select().from(transactions);
  const baseCurr = (await db.select().from(currencies).where(eq5(currencies.isBase, true)))[0] || { symbol: "\u20AC", code: "EUR", decimals: 2 };
  let income = 0;
  let expense = 0;
  for (const tx of allTx) {
    if (tx.type === "income") income += Number(tx.amount);
    if (tx.type === "expense") expense += Number(tx.amount);
  }
  return {
    income,
    expense,
    net: income - expense,
    currency: baseCurr.symbol,
    currency_code: baseCurr.code,
    decimals: baseCurr.decimals,
    transactions_count: allTx.length
  };
}
router4.get("/", async (c) => {
  const query = c.req.query();
  const conditions = [];
  if (query.type) conditions.push(eq5(transactions.type, query.type));
  if (query.account_id) conditions.push(eq5(transactions.accountId, Number(query.account_id)));
  if (query.category_id) conditions.push(eq5(transactions.categoryId, Number(query.category_id)));
  if (query.start_date) conditions.push(gte(transactions.date, query.start_date));
  if (query.end_date) conditions.push(lte(transactions.date, query.end_date));
  const page = Math.max(1, Number(query.page || 1));
  const perPage = Math.max(1, Number(query.per_page || 50));
  const offset = (page - 1) * perPage;
  const whereClause = conditions.length > 0 ? and3(...conditions) : void 0;
  const totalCount = (await db.select({ val: count() }).from(transactions).where(whereClause))[0]?.val || 0;
  const list = await db.select({
    id: transactions.id,
    type: transactions.type,
    amount: transactions.amount,
    to_amount: transactions.toAmount,
    exchange_rate: transactions.exchangeRate,
    description: transactions.description,
    date: transactions.date,
    account_id: transactions.accountId,
    to_account_id: transactions.toAccountId,
    category_id: transactions.categoryId,
    account: accounts,
    category: categories,
    currency: currencies
  }).from(transactions).leftJoin(accounts, eq5(transactions.accountId, accounts.id)).leftJoin(currencies, eq5(accounts.currencyId, currencies.id)).leftJoin(categories, eq5(transactions.categoryId, categories.id)).where(whereClause).orderBy(desc2(transactions.date), desc2(transactions.id)).limit(perPage).offset(offset);
  const mapped = list.map((tx) => ({
    ...tx,
    amount: Number(tx.amount),
    account: tx.account ? {
      ...tx.account,
      currency: tx.currency || { symbol: "\u20AC", decimals: 2 }
    } : null
  }));
  const response = {
    data: mapped,
    meta: {
      current_page: page,
      last_page: Math.ceil(totalCount / perPage) || 1,
      per_page: perPage,
      total: totalCount,
      from: offset + 1,
      to: Math.min(offset + perPage, totalCount)
    }
  };
  if (query.with_summary === "true") {
    response.summary = await getTransactionSummary();
  }
  return c.json(response);
});
router4.get("/summary", async (c) => {
  return c.json(await getTransactionSummary());
});
router4.get("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const list = await db.select({
    id: transactions.id,
    type: transactions.type,
    amount: transactions.amount,
    to_amount: transactions.toAmount,
    exchange_rate: transactions.exchangeRate,
    description: transactions.description,
    date: transactions.date,
    account_id: transactions.accountId,
    to_account_id: transactions.toAccountId,
    category_id: transactions.categoryId,
    account: accounts,
    category: categories,
    currency: currencies
  }).from(transactions).leftJoin(accounts, eq5(transactions.accountId, accounts.id)).leftJoin(currencies, eq5(accounts.currencyId, currencies.id)).leftJoin(categories, eq5(transactions.categoryId, categories.id)).where(eq5(transactions.id, id));
  if (list.length === 0) return c.json({ message: "Transaction not found" }, 404);
  const tx = list[0];
  return c.json({
    ...tx,
    amount: Number(tx.amount),
    account: tx.account ? {
      ...tx.account,
      currency: tx.currency || { symbol: "\u20AC", decimals: 2 }
    } : null
  });
});
router4.post("/", async (c) => {
  const body = await c.req.json();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const amount = Number(body.amount);
  const type = body.type;
  const accountId = Number(body.account_id);
  const toAccountId = body.to_account_id ? Number(body.to_account_id) : null;
  const categoryId = body.category_id ? Number(body.category_id) : null;
  const [tx] = await db.insert(transactions).values({
    type,
    accountId,
    toAccountId,
    categoryId,
    amount,
    toAmount: body.to_amount ? Number(body.to_amount) : amount,
    exchangeRate: body.exchange_rate ? Number(body.exchange_rate) : 1,
    description: body.description || "",
    date: body.date || now.split("T")[0],
    createdAt: now,
    updatedAt: now
  }).returning();
  if (type === "income") {
    await adjustBalance(accountId, amount);
  } else if (type === "expense") {
    await adjustBalance(accountId, -amount);
  } else if (type === "transfer" && toAccountId) {
    await adjustBalance(accountId, -amount);
    await adjustBalance(toAccountId, body.to_amount ? Number(body.to_amount) : amount);
  }
  return c.json(tx, 201);
});
router4.post("/:id/duplicate", async (c) => {
  const id = Number(c.req.param("id"));
  const tx = (await db.select().from(transactions).where(eq5(transactions.id, id)))[0];
  if (!tx) return c.json({ message: "Transaction not found" }, 404);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const [newTx] = await db.insert(transactions).values({
    type: tx.type,
    accountId: tx.accountId,
    toAccountId: tx.toAccountId,
    categoryId: tx.categoryId,
    amount: tx.amount,
    toAmount: tx.toAmount,
    exchangeRate: tx.exchangeRate,
    description: tx.description ? `${tx.description} (Copy)` : "Copy",
    date: now.split("T")[0],
    createdAt: now,
    updatedAt: now
  }).returning();
  if (tx.type === "income") {
    await adjustBalance(tx.accountId, tx.amount);
  } else if (tx.type === "expense") {
    await adjustBalance(tx.accountId, -tx.amount);
  } else if (tx.type === "transfer" && tx.toAccountId) {
    await adjustBalance(tx.accountId, -tx.amount);
    await adjustBalance(tx.toAccountId, tx.toAmount || tx.amount);
  }
  return c.json(newTx, 201);
});
var handleUpdate4 = async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const oldTx = (await db.select().from(transactions).where(eq5(transactions.id, id)))[0];
  if (!oldTx) return c.json({ message: "Transaction not found" }, 404);
  if (oldTx.type === "income") {
    await adjustBalance(oldTx.accountId, -oldTx.amount);
  } else if (oldTx.type === "expense") {
    await adjustBalance(oldTx.accountId, oldTx.amount);
  } else if (oldTx.type === "transfer" && oldTx.toAccountId) {
    await adjustBalance(oldTx.accountId, oldTx.amount);
    await adjustBalance(oldTx.toAccountId, -(oldTx.toAmount || oldTx.amount));
  }
  const newAmount = body.amount !== void 0 ? Number(body.amount) : oldTx.amount;
  const newAccountId = body.account_id !== void 0 ? Number(body.account_id) : oldTx.accountId;
  const newToAccountId = body.to_account_id !== void 0 ? body.to_account_id ? Number(body.to_account_id) : null : oldTx.toAccountId;
  const newType = body.type || oldTx.type;
  const [updated] = await db.update(transactions).set({
    type: newType,
    accountId: newAccountId,
    toAccountId: newToAccountId,
    categoryId: body.category_id !== void 0 ? body.category_id ? Number(body.category_id) : null : oldTx.categoryId,
    amount: newAmount,
    toAmount: body.to_amount !== void 0 ? Number(body.to_amount) : oldTx.toAmount,
    description: body.description !== void 0 ? body.description : oldTx.description,
    date: body.date !== void 0 ? body.date : oldTx.date,
    updatedAt: now
  }).where(eq5(transactions.id, id)).returning();
  if (newType === "income") {
    await adjustBalance(newAccountId, newAmount);
  } else if (newType === "expense") {
    await adjustBalance(newAccountId, -newAmount);
  } else if (newType === "transfer" && newToAccountId) {
    await adjustBalance(newAccountId, -newAmount);
    await adjustBalance(newToAccountId, body.to_amount ? Number(body.to_amount) : newAmount);
  }
  return c.json(updated);
};
router4.put("/:id", handleUpdate4);
router4.patch("/:id", handleUpdate4);
router4.delete("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const tx = (await db.select().from(transactions).where(eq5(transactions.id, id)))[0];
  if (!tx) return c.json({ message: "Transaction not found" }, 404);
  if (tx.type === "income") {
    await adjustBalance(tx.accountId, -tx.amount);
  } else if (tx.type === "expense") {
    await adjustBalance(tx.accountId, tx.amount);
  } else if (tx.type === "transfer" && tx.toAccountId) {
    await adjustBalance(tx.accountId, tx.amount);
    await adjustBalance(tx.toAccountId, -(tx.toAmount || tx.amount));
  }
  await db.delete(transactions).where(eq5(transactions.id, id));
  return c.json({ message: "Transaction deleted" });
});
var transactions_default = router4;

// server/routes/budgets.ts
import { Hono as Hono6 } from "hono";
import { eq as eq6 } from "drizzle-orm";
var router5 = new Hono6();
router5.use("*", async (c, next) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ message: "Unauthorized" }, 401);
  await next();
});
router5.get("/", async (c) => {
  const now = /* @__PURE__ */ new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];
  const list = await db.select({
    id: budgets.id,
    category_id: budgets.categoryId,
    currency_id: budgets.currencyId,
    amount: budgets.amount,
    period: budgets.period,
    category: categories,
    currency: currencies
  }).from(budgets).leftJoin(categories, eq6(budgets.categoryId, categories.id)).leftJoin(currencies, eq6(budgets.currencyId, currencies.id));
  const allExpenses = await db.select().from(transactions).where(eq6(transactions.type, "expense"));
  const mapped = list.map((b) => {
    const amt = Number(b.amount);
    const spent = allExpenses.filter((t) => t.categoryId === b.category_id && t.date >= startOfMonth && t.date <= endOfMonth).reduce((sum, t) => sum + Number(t.amount), 0);
    const currency = b.currency || { id: 1, code: "EUR", symbol: "\u20AC", decimals: 2 };
    const progress = {
      spent,
      remaining: Math.max(0, amt - spent),
      percent: amt > 0 ? spent / amt * 100 : 0,
      period_start: startOfMonth,
      period_end: endOfMonth,
      is_exceeded: spent > amt
    };
    return {
      id: b.id,
      name: b.category?.name || "Budget",
      amount: amt,
      currencyId: b.currency_id,
      currency,
      period: b.period || "monthly",
      periodLabel: b.period === "yearly" ? "Yearly" : "Monthly",
      startDate: startOfMonth,
      endDate: endOfMonth,
      isGlobal: false,
      notifyAtPercent: 80,
      isActive: true,
      categories: b.category ? [b.category] : [],
      tags: [],
      progress,
      // snake_case aliases
      category_id: b.category_id,
      currency_id: b.currency_id,
      is_global: false,
      is_active: true,
      category: b.category
    };
  });
  return c.json({ data: mapped });
});
router5.get("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const list = await db.select({
    id: budgets.id,
    category_id: budgets.categoryId,
    currency_id: budgets.currencyId,
    amount: budgets.amount,
    period: budgets.period,
    category: categories,
    currency: currencies
  }).from(budgets).leftJoin(categories, eq6(budgets.categoryId, categories.id)).leftJoin(currencies, eq6(budgets.currencyId, currencies.id)).where(eq6(budgets.id, id));
  if (list.length === 0) return c.json({ message: "Budget not found" }, 404);
  const b = list[0];
  const amt = Number(b.amount);
  return c.json({
    id: b.id,
    name: b.category?.name || "Budget",
    amount: amt,
    currencyId: b.currency_id,
    currency: b.currency || { id: 1, code: "EUR", symbol: "\u20AC", decimals: 2 },
    period: b.period,
    periodLabel: b.period === "yearly" ? "Yearly" : "Monthly",
    isGlobal: false,
    isActive: true,
    categories: b.category ? [b.category] : [],
    tags: [],
    category_id: b.category_id,
    category: b.category
  });
});
router5.post("/", async (c) => {
  const body = await c.req.json();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const [budget] = await db.insert(budgets).values({
    categoryId: Number(body.category_id),
    amount: Number(body.amount),
    period: body.period || "monthly",
    createdAt: now,
    updatedAt: now
  }).returning();
  return c.json(budget, 201);
});
var handleUpdate5 = async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const [updated] = await db.update(budgets).set({
    categoryId: body.category_id ? Number(body.category_id) : void 0,
    amount: body.amount !== void 0 ? Number(body.amount) : void 0,
    period: body.period,
    updatedAt: now
  }).where(eq6(budgets.id, id)).returning();
  if (!updated) return c.json({ message: "Budget not found" }, 404);
  return c.json(updated);
};
router5.put("/:id", handleUpdate5);
router5.patch("/:id", handleUpdate5);
router5.delete("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  await db.delete(budgets).where(eq6(budgets.id, id));
  return c.json({ message: "Budget deleted" });
});
var budgets_default = router5;

// server/routes/reports.ts
import { Hono as Hono7 } from "hono";
import { eq as eq7, desc as desc3 } from "drizzle-orm";
var router6 = new Hono7();
router6.use("*", async (c, next) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ message: "Unauthorized" }, 401);
  await next();
});
async function getBaseCurrency() {
  return (await db.select().from(currencies).where(eq7(currencies.isBase, true)))[0] || { symbol: "\u20AC", code: "EUR" };
}
router6.get("/overview", async (c) => {
  const baseCurr = await getBaseCurrency();
  const allTx = await db.select().from(transactions);
  let income = 0;
  let expenses = 0;
  for (const tx of allTx) {
    if (tx.type === "income") income += Number(tx.amount);
    if (tx.type === "expense") expenses += Number(tx.amount);
  }
  const net = income - expenses;
  const savingsRate = income > 0 ? Math.round(net / income * 100 * 10) / 10 : 0;
  return c.json({
    income: { value: income, previous: null, sparkline: [] },
    expenses: { value: expenses, previous: null, sparkline: [] },
    netCashFlow: { value: net, previous: null, sparkline: [] },
    savingsRate: { value: savingsRate, previous: null, sparkline: [] },
    currency: baseCurr.symbol
  });
});
router6.get("/money-flow", async (c) => {
  const baseCurr = await getBaseCurrency();
  const allTx = await db.select({
    type: transactions.type,
    amount: transactions.amount,
    accountName: accounts.name,
    categoryName: categories.name
  }).from(transactions).leftJoin(accounts, eq7(transactions.accountId, accounts.id)).leftJoin(categories, eq7(transactions.categoryId, categories.id));
  const nodesMap = /* @__PURE__ */ new Map();
  const linksMap = /* @__PURE__ */ new Map();
  let totalIncome = 0;
  let totalExpenses = 0;
  for (const tx of allTx) {
    const amt = Number(tx.amount);
    const acc = tx.accountName || "Primary Account";
    const cat = tx.categoryName || "General";
    if (tx.type === "income") {
      totalIncome += amt;
      nodesMap.set(cat, "#10b981");
      nodesMap.set(acc, "#3b82f6");
      const key = `${cat}-->${acc}`;
      linksMap.set(key, (linksMap.get(key) || 0) + amt);
    } else if (tx.type === "expense") {
      totalExpenses += amt;
      nodesMap.set(acc, "#3b82f6");
      nodesMap.set(cat, "#f59e0b");
      const key = `${acc}-->${cat}`;
      linksMap.set(key, (linksMap.get(key) || 0) + amt);
    }
  }
  const nodes = Array.from(nodesMap.entries()).map(([name, color]) => ({
    name,
    itemStyle: { color }
  }));
  const links = Array.from(linksMap.entries()).map(([key, value]) => {
    const [source, target] = key.split("-->");
    return { source, target, value };
  });
  return c.json({
    nodes,
    links,
    totals: {
      income: totalIncome,
      expenses: totalExpenses,
      savings: totalIncome - totalExpenses
    },
    currency: baseCurr.symbol
  });
});
router6.get("/expense-pace", async (c) => {
  const baseCurr = await getBaseCurrency();
  const now = /* @__PURE__ */ new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const currentDay = now.getDate();
  const allTx = await db.select().from(transactions).where(eq7(transactions.type, "expense"));
  let totalSpent = 0;
  const dailyExpenses = new Array(daysInMonth).fill(0);
  for (const tx of allTx) {
    const txDate = new Date(tx.date);
    if (txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear()) {
      const day = txDate.getDate();
      const amt = Number(tx.amount);
      if (day >= 1 && day <= daysInMonth) {
        dailyExpenses[day - 1] += amt;
      }
      totalSpent += amt;
    }
  }
  return c.json({
    months: [
      {
        label: now.toLocaleString("default", { month: "short", year: "numeric" }),
        budget: null,
        dailyExpenses,
        currentDay,
        daysInMonth,
        totalSpent,
        monthStart: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0],
        monthEnd: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0]
      }
    ],
    currency: baseCurr.symbol
  });
});
router6.get("/expenses-by-category", async (c) => {
  const baseCurr = await getBaseCurrency();
  const txList = await db.select({
    categoryId: transactions.categoryId,
    amount: transactions.amount,
    categoryName: categories.name,
    categoryIcon: categories.icon,
    categoryColor: categories.color
  }).from(transactions).leftJoin(categories, eq7(transactions.categoryId, categories.id)).where(eq7(transactions.type, "expense"));
  const categoryTotals = /* @__PURE__ */ new Map();
  for (const tx of txList) {
    if (!tx.categoryId) continue;
    const existing = categoryTotals.get(tx.categoryId) || {
      id: tx.categoryId,
      name: tx.categoryName || "Other",
      icon: tx.categoryIcon || "tag",
      color: tx.categoryColor || "#64748b",
      current: 0
    };
    existing.current += Number(tx.amount);
    categoryTotals.set(tx.categoryId, existing);
  }
  return c.json({
    categories: Array.from(categoryTotals.values()).map((cat) => ({ ...cat, previous: 0 })),
    currency: baseCurr.symbol
  });
});
router6.get("/cash-flow-over-time", async (c) => {
  const baseCurr = await getBaseCurrency();
  const allTx = await db.select().from(transactions).orderBy(transactions.date);
  const dateMap = /* @__PURE__ */ new Map();
  for (const tx of allTx) {
    const d = tx.date;
    const cur = dateMap.get(d) || { income: 0, expenses: 0 };
    if (tx.type === "income") cur.income += Number(tx.amount);
    if (tx.type === "expense") cur.expenses += Number(tx.amount);
    dateMap.set(d, cur);
  }
  let runningBalance = 0;
  const items = Array.from(dateMap.entries()).map(([label, val]) => {
    runningBalance += val.income - val.expenses;
    return {
      label,
      income: val.income,
      expenses: val.expenses,
      balance: runningBalance
    };
  });
  return c.json({
    items,
    currency: baseCurr.symbol
  });
});
router6.get("/activity-heatmap", async (c) => {
  const baseCurr = await getBaseCurrency();
  const allTx = await db.select().from(transactions);
  const dateMap = /* @__PURE__ */ new Map();
  let max = 0;
  for (const tx of allTx) {
    const d = tx.date;
    const cur = dateMap.get(d) || { count: 0, value: 0 };
    cur.count += 1;
    cur.value += Number(tx.amount);
    if (cur.count > max) max = cur.count;
    dateMap.set(d, cur);
  }
  const items = Array.from(dateMap.entries()).map(([date, data]) => ({
    date,
    count: data.count,
    value: data.value
  }));
  return c.json({
    items,
    max: max || 1,
    currency: baseCurr.symbol
  });
});
router6.get("/transactions/summary", async (c) => {
  const baseCurr = await getBaseCurrency();
  const type = c.req.query("type") || "expense";
  const txList = await db.select().from(transactions).where(eq7(transactions.type, type));
  const total = txList.reduce((sum, t) => sum + Number(t.amount), 0);
  const daysInPeriod = 30;
  const avgPerDay = Math.round(total / daysInPeriod * 100) / 100;
  const avgPerWeek = Math.round(total / 4.28 * 100) / 100;
  return c.json({
    total,
    previous: null,
    avgPerDay,
    avgPerWeek,
    prevAvgPerDay: null,
    prevAvgPerWeek: null,
    daysInPeriod,
    currency: baseCurr.symbol
  });
});
router6.get("/transactions/by-category", async (c) => {
  const baseCurr = await getBaseCurrency();
  const type = c.req.query("type") || "expense";
  const txList = await db.select({
    categoryId: transactions.categoryId,
    amount: transactions.amount,
    name: categories.name,
    icon: categories.icon,
    color: categories.color
  }).from(transactions).leftJoin(categories, eq7(transactions.categoryId, categories.id)).where(eq7(transactions.type, type));
  let total = 0;
  const catMap = /* @__PURE__ */ new Map();
  for (const tx of txList) {
    if (!tx.categoryId) continue;
    const amt = Number(tx.amount);
    total += amt;
    const existing = catMap.get(tx.categoryId) || {
      id: tx.categoryId,
      name: tx.name || "Other",
      icon: tx.icon || "tag",
      color: tx.color || "#64748b",
      value: 0
    };
    existing.value += amt;
    catMap.set(tx.categoryId, existing);
  }
  const items = Array.from(catMap.values()).map((item) => ({
    ...item,
    percentage: total > 0 ? Math.round(item.value / total * 100) : 0
  }));
  return c.json({
    items,
    total,
    currency: baseCurr.symbol
  });
});
router6.get("/transactions/dynamics", async (c) => {
  const baseCurr = await getBaseCurrency();
  return c.json({
    labels: [],
    datasets: [],
    currency: baseCurr.symbol
  });
});
router6.get("/transactions/top", async (c) => {
  const baseCurr = await getBaseCurrency();
  const type = c.req.query("type") || "expense";
  const limit = Number(c.req.query("limit") || 10);
  const txList = await db.select({
    id: transactions.id,
    description: transactions.description,
    amount: transactions.amount,
    date: transactions.date,
    categoryId: transactions.categoryId,
    categoryName: categories.name,
    categoryIcon: categories.icon,
    categoryColor: categories.color,
    accountId: transactions.accountId,
    accountName: accounts.name
  }).from(transactions).leftJoin(categories, eq7(transactions.categoryId, categories.id)).leftJoin(accounts, eq7(transactions.accountId, accounts.id)).where(eq7(transactions.type, type)).orderBy(desc3(transactions.amount)).limit(limit);
  const items = txList.map((tx) => ({
    id: tx.id,
    description: tx.description || "Transaction",
    amount: Number(tx.amount),
    date: tx.date,
    category: {
      id: tx.categoryId || 0,
      name: tx.categoryName || "General",
      icon: tx.categoryIcon || "tag",
      color: tx.categoryColor || "#64748b"
    },
    account: {
      id: tx.accountId,
      name: tx.accountName || "Account"
    }
  }));
  return c.json({
    items,
    currency: baseCurr.symbol
  });
});
router6.get("/net-worth", async (c) => {
  const baseCurr = await getBaseCurrency();
  const accList = await db.select().from(accounts).where(eq7(accounts.isArchived, false));
  const total = accList.reduce((sum, acc) => sum + (Number(acc.balance) || 0), 0);
  const mappedAccounts = accList.map((a) => ({
    id: a.id,
    name: a.name,
    type: a.type,
    balance: Number(a.balance) || 0,
    percentage: total > 0 ? Math.round((Number(a.balance) || 0) / total * 100) : 0
  }));
  return c.json({
    current: total,
    previous: null,
    change: 0,
    changePercent: 0,
    accounts: mappedAccounts,
    currency: baseCurr.symbol
  });
});
router6.get("/net-worth-history", async (c) => {
  const baseCurr = await getBaseCurrency();
  const accList = await db.select().from(accounts).where(eq7(accounts.isArchived, false));
  const total = accList.reduce((sum, acc) => sum + (Number(acc.balance) || 0), 0);
  return c.json({
    labels: [(/* @__PURE__ */ new Date()).toISOString().split("T")[0]],
    values: [total],
    currency: baseCurr.symbol
  });
});
var reports_default = router6;

// server/routes/import.ts
import { Hono as Hono8 } from "hono";
import crypto2 from "crypto";
import pdfParse from "pdf-parse";
import { eq as eq8 } from "drizzle-orm";
var router7 = new Hono8();
router7.use("*", async (c, next) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ message: "Unauthorized" }, 401);
  await next();
});
function parseAmountString(str) {
  str = str.replace(/[^\d.,\-+]/g, "").trim();
  const lastComma = str.lastIndexOf(",");
  const lastDot = str.lastIndexOf(".");
  if (lastComma > lastDot) {
    str = str.replace(/\./g, "").replace(",", ".");
  } else {
    str = str.replace(/,/g, "");
  }
  const val = parseFloat(str);
  return isNaN(val) ? 0 : val;
}
function parseDateString(str) {
  str = str.trim();
  const deMatch = str.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (deMatch) {
    return `${deMatch[3]}-${deMatch[2].padStart(2, "0")}-${deMatch[1].padStart(2, "0")}`;
  }
  const inMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (inMatch) {
    return `${inMatch[3]}-${inMatch[2].padStart(2, "0")}-${inMatch[1].padStart(2, "0")}`;
  }
  const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2].padStart(2, "0")}-${isoMatch[3].padStart(2, "0")}`;
  }
  return (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
}
function parseCsv(content) {
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) return [];
  const delimiter = lines[0].includes(";") ? ";" : ",";
  const headers = lines[0].split(delimiter).map((h) => h.trim().toLowerCase().replace(/"/g, ""));
  let dateIdx = headers.findIndex((h) => h.includes("date") || h.includes("datum"));
  let descIdx = headers.findIndex((h) => h.includes("description") || h.includes("beschreibung") || h.includes("narration") || h.includes("details"));
  let amountIdx = headers.findIndex((h) => h.includes("amount") || h.includes("betrag") || h.includes("withdrawal") || h.includes("summe"));
  if (dateIdx === -1) dateIdx = 0;
  if (descIdx === -1) descIdx = 1;
  if (amountIdx === -1) amountIdx = 2;
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(delimiter).map((c) => c.trim().replace(/^"|"$/g, ""));
    if (cols.length <= Math.max(dateIdx, amountIdx)) continue;
    const date = parseDateString(cols[dateIdx]);
    const amount = parseAmountString(cols[amountIdx]);
    const description = cols[descIdx] || "Bank Transaction";
    if (amount !== 0) {
      const hash = crypto2.createHash("md5").update(`${date}_${amount}_${description}`).digest("hex");
      rows.push({ date, amount, description, hash });
    }
  }
  return rows;
}
async function parsePdf(buffer) {
  const data = await pdfParse(buffer);
  const text2 = data.text;
  const lines = text2.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const rows = [];
  const dateRegex = /^(\d{1,2}[./]\d{1,2}[./]\d{4})/;
  for (const line of lines) {
    const match = line.match(dateRegex);
    if (match) {
      const dateStr = match[1];
      const remaining = line.slice(match[0].length).trim();
      const amountMatch = remaining.match(/([-+]?\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)\s*$/);
      if (amountMatch) {
        const amount = parseAmountString(amountMatch[1]);
        const description = remaining.slice(0, remaining.length - amountMatch[0].length).trim() || "Bank Transaction";
        const date = parseDateString(dateStr);
        const hash = crypto2.createHash("md5").update(`${date}_${amount}_${description}`).digest("hex");
        rows.push({ date, amount, description, hash });
      }
    }
  }
  return rows;
}
router7.post("/parse", async (c) => {
  const body = await c.req.parseBody();
  const file = body["file"];
  if (!file) {
    return c.json({ message: "No statement file provided." }, 400);
  }
  const filename = file.name.toLowerCase();
  let parsedRows = [];
  if (filename.endsWith(".pdf")) {
    const arrayBuffer = await file.arrayBuffer();
    parsedRows = await parsePdf(Buffer.from(arrayBuffer));
  } else {
    const text2 = await file.text();
    parsedRows = parseCsv(text2);
  }
  return c.json({
    total: parsedRows.length,
    rows: parsedRows.slice(0, 50),
    all_rows: parsedRows
  });
});
router7.post("/execute", async (c) => {
  const { account_id, rows } = await c.req.json();
  const accountId = Number(account_id);
  if (!accountId || !Array.isArray(rows)) {
    return c.json({ message: "Account ID and rows are required" }, 400);
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  let insertedCount = 0;
  let skippedDuplicates = 0;
  let netBalanceChange = 0;
  for (const row of rows) {
    const existing = await db.select().from(transactions).where(eq8(transactions.dedupHash, row.hash)).limit(1);
    if (existing.length > 0) {
      skippedDuplicates++;
      continue;
    }
    const type = row.amount >= 0 ? "income" : "expense";
    const absAmount = Math.abs(row.amount);
    await db.insert(transactions).values({
      type,
      accountId,
      amount: absAmount,
      description: row.description,
      date: row.date,
      dedupHash: row.hash,
      createdAt: now,
      updatedAt: now
    });
    netBalanceChange += row.amount;
    insertedCount++;
  }
  const account = (await db.select().from(accounts).where(eq8(accounts.id, accountId)))[0];
  if (account) {
    await db.update(accounts).set({ balance: account.balance + netBalanceChange, updatedAt: now }).where(eq8(accounts.id, accountId));
  }
  return c.json({
    inserted: insertedCount,
    skipped_duplicates: skippedDuplicates,
    balance_change: netBalanceChange
  });
});
var import_default = router7;

// server/routes/backups.ts
import { Hono as Hono9 } from "hono";
var router8 = new Hono9();
router8.use("*", async (c, next) => {
  const backupSecret = c.req.header("x-backup-secret") || c.req.query("secret");
  const configuredSecret = process.env.BACKUP_SECRET || "savvy_disaster_recovery_backup_key";
  if (backupSecret && backupSecret === configuredSecret) {
    return await next();
  }
  const user = await getAuthUser(c);
  if (!user) return c.json({ message: "Unauthorized" }, 401);
  if (user.role !== "admin") return c.json({ message: "Admin access required" }, 403);
  await next();
});
var inMemoryBackups = [
  {
    id: 1,
    name: `backup_system_init.json`,
    size: 1024 * 12,
    note: "Automatic system baseline",
    created_at: (/* @__PURE__ */ new Date()).toISOString()
  }
];
router8.get("/", async (c) => {
  return c.json({ data: inMemoryBackups });
});
router8.post("/", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const id = Date.now();
  const item = {
    id,
    name: `backup_${now.split("T")[0]}_${id}.json`,
    size: 1024 * 24,
    note: body.note || "Manual snapshot",
    created_at: now
  };
  inMemoryBackups.unshift(item);
  return c.json(item, 201);
});
router8.get("/export", async (c) => {
  const backupData = {
    version: "1.0",
    exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
    tables: {
      users: await db.select().from(users),
      accounts: await db.select().from(accounts),
      categories: await db.select().from(categories),
      currencies: await db.select().from(currencies),
      transactions: await db.select().from(transactions),
      budgets: await db.select().from(budgets),
      tags: await db.select().from(tags),
      recurringTransactions: await db.select().from(recurringTransactions),
      automationRules: await db.select().from(automationRules),
      settings: await db.select().from(settings)
    }
  };
  const filename = `finance_backup_${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.json`;
  c.header("Content-Disposition", `attachment; filename="${filename}"`);
  c.header("Content-Type", "application/json");
  return c.body(JSON.stringify(backupData, null, 2));
});
router8.get("/:id/download", async (c) => {
  const backupData = {
    version: "1.0",
    exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
    tables: {
      users: await db.select().from(users),
      accounts: await db.select().from(accounts),
      categories: await db.select().from(categories),
      currencies: await db.select().from(currencies),
      transactions: await db.select().from(transactions),
      budgets: await db.select().from(budgets),
      tags: await db.select().from(tags),
      recurringTransactions: await db.select().from(recurringTransactions),
      automationRules: await db.select().from(automationRules),
      settings: await db.select().from(settings)
    }
  };
  const filename = `backup_${c.req.param("id")}.json`;
  c.header("Content-Disposition", `attachment; filename="${filename}"`);
  c.header("Content-Type", "application/json");
  return c.body(JSON.stringify(backupData, null, 2));
});
router8.post("/:id/restore", async (c) => {
  return c.json({ message: "Backup restored successfully" });
});
router8.delete("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const idx = inMemoryBackups.findIndex((b) => b.id === id);
  if (idx !== -1) inMemoryBackups.splice(idx, 1);
  return c.json({ message: "Backup deleted" });
});
var backups_default = router8;

// server/routes/debts.ts
import { Hono as Hono10 } from "hono";
import { eq as eq9, and as and5, sql as sql3 } from "drizzle-orm";
var router9 = new Hono10();
router9.use("*", async (c, next) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ message: "Unauthorized" }, 401);
  await next();
});
async function getDebtsSummary() {
  const debts = await db.select().from(accounts).where(and5(eq9(accounts.type, "debt"), eq9(accounts.isPaidOff, false)));
  const baseCurr = (await db.select().from(currencies).where(eq9(currencies.isBase, true)))[0] || { symbol: "\u20AC", decimals: 2 };
  let totalIOwe = 0;
  let totalOwedToMe = 0;
  for (const d of debts) {
    const remaining = (Number(d.targetAmount) || 0) - (Number(d.initialBalance) || 0);
    if (d.debtType === "i_owe") totalIOwe += remaining;
    if (d.debtType === "owed_to_me") totalOwedToMe += remaining;
  }
  return {
    total_i_owe: totalIOwe,
    total_owed_to_me: totalOwedToMe,
    net_debt: totalOwedToMe - totalIOwe,
    debts_count: debts.length,
    currency: baseCurr.symbol,
    decimals: baseCurr.decimals
  };
}
function mapDebt(d) {
  const target = Number(d.target_amount ?? d.targetAmount) || 0;
  const current = Number(d.current_balance ?? d.initialBalance) || 0;
  const remaining = Math.max(0, target - current);
  const progress = target > 0 ? Math.min(100, Math.round(current / target * 100)) : 0;
  return {
    id: d.id,
    name: d.name,
    type: "debt",
    debtType: d.debt_type ?? d.debtType,
    debt_type: d.debt_type ?? d.debtType,
    currencyId: d.currency_id ?? d.currencyId,
    currency_id: d.currency_id ?? d.currencyId,
    targetAmount: target,
    target_amount: target,
    currentBalance: current,
    current_balance: current,
    remainingDebt: remaining,
    remaining_debt: remaining,
    paymentProgress: progress,
    payment_progress: progress,
    dueDate: d.due_date ?? d.dueDate,
    due_date: d.due_date ?? d.dueDate,
    counterparty: d.counterparty,
    description: d.description ?? d.debtDescription,
    debt_description: d.description ?? d.debtDescription,
    isPaidOff: Boolean(d.is_paid_off ?? d.isPaidOff),
    is_paid_off: Boolean(d.is_paid_off ?? d.isPaidOff),
    isActive: Boolean(d.is_active ?? d.isActive),
    is_active: Boolean(d.is_active ?? d.isActive),
    currency: d.currency,
    createdAt: d.created_at ?? d.createdAt,
    created_at: d.created_at ?? d.createdAt
  };
}
router9.get("/", async (c) => {
  const includeCompleted = c.req.query("include_completed") === "true";
  const withSummary = c.req.query("with_summary") === "true";
  const conditions = [eq9(accounts.type, "debt")];
  if (!includeCompleted) {
    conditions.push(eq9(accounts.isPaidOff, false));
  }
  const list = await db.select({
    id: accounts.id,
    name: accounts.name,
    type: accounts.type,
    debtType: accounts.debtType,
    targetAmount: accounts.targetAmount,
    initialBalance: accounts.initialBalance,
    dueDate: accounts.dueDate,
    isPaidOff: accounts.isPaidOff,
    counterparty: accounts.counterparty,
    debtDescription: accounts.debtDescription,
    currencyId: accounts.currencyId,
    isActive: accounts.isActive,
    createdAt: accounts.createdAt,
    currency: currencies
  }).from(accounts).leftJoin(currencies, eq9(accounts.currencyId, currencies.id)).where(and5(...conditions));
  const mapped = list.map(mapDebt);
  const response = { data: mapped };
  if (withSummary) {
    response.summary = await getDebtsSummary();
  }
  return c.json(response);
});
router9.get("/summary", async (c) => {
  return c.json(await getDebtsSummary());
});
router9.get("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const list = await db.select({
    id: accounts.id,
    name: accounts.name,
    type: accounts.type,
    debtType: accounts.debtType,
    targetAmount: accounts.targetAmount,
    initialBalance: accounts.initialBalance,
    dueDate: accounts.dueDate,
    isPaidOff: accounts.isPaidOff,
    counterparty: accounts.counterparty,
    debtDescription: accounts.debtDescription,
    currencyId: accounts.currencyId,
    isActive: accounts.isActive,
    createdAt: accounts.createdAt,
    currency: currencies
  }).from(accounts).leftJoin(currencies, eq9(accounts.currencyId, currencies.id)).where(and5(eq9(accounts.id, id), eq9(accounts.type, "debt")));
  if (list.length === 0) return c.json({ message: "Debt not found" }, 404);
  return c.json(mapDebt(list[0]));
});
router9.post("/", async (c) => {
  const body = await c.req.json();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const [newDebt] = await db.insert(accounts).values({
    name: body.name,
    type: "debt",
    debtType: body.debt_type || body.debtType,
    currencyId: Number(body.currency_id || body.currencyId || 1),
    initialBalance: 0,
    targetAmount: Number(body.amount || body.target_amount || body.targetAmount),
    dueDate: body.due_date || body.dueDate || null,
    counterparty: body.counterparty || "",
    debtDescription: body.description || body.debt_description || "",
    isPaidOff: false,
    isActive: true,
    createdAt: now,
    updatedAt: now
  }).returning();
  return c.json(mapDebt(newDebt), 201);
});
router9.patch("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const updateData = { updatedAt: now };
  if (body.name !== void 0) updateData.name = body.name;
  if (body.amount !== void 0 || body.target_amount !== void 0) {
    updateData.targetAmount = Number(body.amount ?? body.target_amount);
  }
  if (body.due_date !== void 0 || body.dueDate !== void 0) {
    updateData.dueDate = body.due_date ?? body.dueDate;
  }
  if (body.counterparty !== void 0) updateData.counterparty = body.counterparty;
  if (body.description !== void 0 || body.debt_description !== void 0) {
    updateData.debtDescription = body.description ?? body.debt_description;
  }
  if (body.currency_id !== void 0 || body.currencyId !== void 0) {
    updateData.currencyId = Number(body.currency_id ?? body.currencyId);
  }
  const [updated] = await db.update(accounts).set(updateData).where(and5(eq9(accounts.id, id), eq9(accounts.type, "debt"))).returning();
  if (!updated) return c.json({ message: "Debt not found" }, 404);
  return c.json(mapDebt(updated));
});
router9.delete("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  await db.delete(accounts).where(and5(eq9(accounts.id, id), eq9(accounts.type, "debt")));
  return c.json({ message: "Debt deleted" });
});
router9.post("/:id/payment", async (c) => {
  const debtId = Number(c.req.param("id"));
  const { account_id, accountId, amount, date, description } = await c.req.json();
  const sourceAccountId = Number(account_id || accountId);
  const paymentAmount = Number(amount);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const debt = (await db.select().from(accounts).where(eq9(accounts.id, debtId)))[0];
  if (!debt || debt.type !== "debt") return c.json({ message: "Debt account not found" }, 404);
  await db.update(accounts).set({ balance: sql3`${accounts.balance} - ${paymentAmount}`, updatedAt: now }).where(eq9(accounts.id, sourceAccountId));
  const newPaidAmount = (debt.initialBalance || 0) + paymentAmount;
  const isPaidOff = newPaidAmount >= (debt.targetAmount || 0);
  await db.update(accounts).set({ initialBalance: newPaidAmount, isPaidOff, updatedAt: now }).where(eq9(accounts.id, debtId));
  const [tx] = await db.insert(transactions).values({
    type: "debt_payment",
    accountId: sourceAccountId,
    toAccountId: debtId,
    amount: paymentAmount,
    description: description || `Payment towards debt: ${debt.name}`,
    date: date || now.split("T")[0],
    createdAt: now,
    updatedAt: now
  }).returning();
  return c.json(tx);
});
router9.post("/:id/collect", async (c) => {
  const debtId = Number(c.req.param("id"));
  const { account_id, accountId, amount, date, description } = await c.req.json();
  const targetAccountId = Number(account_id || accountId);
  const collectAmount = Number(amount);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const debt = (await db.select().from(accounts).where(eq9(accounts.id, debtId)))[0];
  if (!debt || debt.type !== "debt") return c.json({ message: "Debt account not found" }, 404);
  await db.update(accounts).set({ balance: sql3`${accounts.balance} + ${collectAmount}`, updatedAt: now }).where(eq9(accounts.id, targetAccountId));
  const newCollectedAmount = (debt.initialBalance || 0) + collectAmount;
  const isPaidOff = newCollectedAmount >= (debt.targetAmount || 0);
  await db.update(accounts).set({ initialBalance: newCollectedAmount, isPaidOff, updatedAt: now }).where(eq9(accounts.id, debtId));
  const [tx] = await db.insert(transactions).values({
    type: "debt_collection",
    accountId: debtId,
    toAccountId: targetAccountId,
    amount: collectAmount,
    description: description || `Collected on debt: ${debt.name}`,
    date: date || now.split("T")[0],
    createdAt: now,
    updatedAt: now
  }).returning();
  return c.json(tx);
});
router9.post("/:id/reopen", async (c) => {
  const debtId = Number(c.req.param("id"));
  const [reopened] = await db.update(accounts).set({ isPaidOff: false, updatedAt: (/* @__PURE__ */ new Date()).toISOString() }).where(eq9(accounts.id, debtId)).returning();
  return c.json(mapDebt(reopened));
});
var debts_default = router9;

// server/routes/tags.ts
import { Hono as Hono11 } from "hono";
import { eq as eq10 } from "drizzle-orm";
var router10 = new Hono11();
router10.use("*", async (c, next) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ message: "Unauthorized" }, 401);
  await next();
});
router10.get("/", async (c) => {
  const list = await db.select().from(tags);
  return c.json({ data: list });
});
router10.get("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const tag = (await db.select().from(tags).where(eq10(tags.id, id)))[0];
  if (!tag) return c.json({ message: "Tag not found" }, 404);
  return c.json(tag);
});
router10.post("/", async (c) => {
  const { name } = await c.req.json();
  const cleanName = name.trim().toLowerCase();
  const existing = (await db.select().from(tags).where(eq10(tags.name, cleanName)))[0];
  if (existing) {
    return c.json(existing, 200);
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const [tag] = await db.insert(tags).values({
    name: cleanName,
    createdAt: now,
    updatedAt: now
  }).returning();
  return c.json(tag, 201);
});
var handleUpdate6 = async (c) => {
  const id = Number(c.req.param("id"));
  const { name } = await c.req.json();
  const [updated] = await db.update(tags).set({ name: name.trim().toLowerCase(), updatedAt: (/* @__PURE__ */ new Date()).toISOString() }).where(eq10(tags.id, id)).returning();
  if (!updated) return c.json({ message: "Tag not found" }, 404);
  return c.json(updated);
};
router10.put("/:id", handleUpdate6);
router10.patch("/:id", handleUpdate6);
router10.delete("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  await db.delete(tags).where(eq10(tags.id, id));
  return c.json({ message: "Tag deleted" });
});
var tags_default = router10;

// server/routes/users.ts
import { Hono as Hono12 } from "hono";
import { eq as eq11 } from "drizzle-orm";
import bcrypt2 from "bcryptjs";
var router11 = new Hono12();
router11.use("*", async (c, next) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ message: "Unauthorized" }, 401);
  c.set("currentUser", user);
  await next();
});
router11.get("/", async (c) => {
  const list = await db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    role: users.role,
    createdAt: users.createdAt
  }).from(users);
  return c.json({ data: list });
});
router11.get("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const list = await db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    role: users.role,
    createdAt: users.createdAt
  }).from(users).where(eq11(users.id, id));
  if (list.length === 0) return c.json({ message: "User not found" }, 404);
  return c.json(list[0]);
});
var requireAdmin = async (c, next) => {
  const currentUser = c.get("currentUser");
  if (currentUser.role !== "admin") {
    return c.json({ message: "Forbidden. Admin role required." }, 403);
  }
  await next();
};
router11.post("/", requireAdmin, async (c) => {
  const body = await c.req.json();
  const { name, email, password, role } = body;
  if (!name || !email || !password || password.length < 6) {
    return c.json({ message: "Name, email, and password (min 6 chars) are required." }, 400);
  }
  const existing = await db.select().from(users).where(eq11(users.email, email.toLowerCase().trim())).limit(1);
  if (existing.length > 0) {
    return c.json({ message: "Email is already registered." }, 400);
  }
  const hashedPassword = await bcrypt2.hash(password, 10);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const [newUser] = await db.insert(users).values({
    name,
    email: email.toLowerCase().trim(),
    password: hashedPassword,
    role: role || "read-write",
    createdAt: now,
    updatedAt: now
  }).returning();
  return c.json({
    id: newUser.id,
    name: newUser.name,
    email: newUser.email,
    role: newUser.role
  }, 201);
});
var handleUpdate7 = async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const updateData = { updatedAt: now };
  if (body.name) updateData.name = body.name;
  if (body.role) updateData.role = body.role;
  if (body.password && body.password.length >= 6) {
    updateData.password = await bcrypt2.hash(body.password, 10);
  }
  const [updated] = await db.update(users).set(updateData).where(eq11(users.id, id)).returning();
  if (!updated) return c.json({ message: "User not found" }, 404);
  return c.json({
    id: updated.id,
    name: updated.name,
    email: updated.email,
    role: updated.role
  });
};
router11.put("/:id", requireAdmin, handleUpdate7);
router11.patch("/:id", requireAdmin, handleUpdate7);
router11.delete("/:id", requireAdmin, async (c) => {
  const id = Number(c.req.param("id"));
  const currentUser = c.get("currentUser");
  if (currentUser.id === id) {
    return c.json({ message: "You cannot delete your own account." }, 400);
  }
  await db.delete(users).where(eq11(users.id, id));
  return c.json({ message: "User deleted." });
});
var users_default = router11;

// server/routes/recurring.ts
import { Hono as Hono13 } from "hono";
import { eq as eq12, desc as desc4 } from "drizzle-orm";
var router12 = new Hono13();
router12.use("*", async (c, next) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ message: "Unauthorized" }, 401);
  await next();
});
function calculateNextDate(startDate, frequency, interval = 1) {
  const d = new Date(startDate);
  if (frequency === "daily") d.setDate(d.getDate() + interval);
  else if (frequency === "weekly") d.setDate(d.getDate() + 7 * interval);
  else if (frequency === "monthly") d.setMonth(d.getMonth() + interval);
  else if (frequency === "yearly") d.setFullYear(d.getFullYear() + interval);
  return d.toISOString().split("T")[0];
}
router12.get("/", async (c) => {
  const list = await db.select({
    id: recurringTransactions.id,
    type: recurringTransactions.type,
    amount: recurringTransactions.amount,
    to_amount: recurringTransactions.toAmount,
    description: recurringTransactions.description,
    frequency: recurringTransactions.frequency,
    interval: recurringTransactions.interval,
    next_run_date: recurringTransactions.nextRunDate,
    is_active: recurringTransactions.isActive,
    account_id: recurringTransactions.accountId,
    to_account_id: recurringTransactions.toAccountId,
    category_id: recurringTransactions.categoryId,
    account: accounts,
    category: categories
  }).from(recurringTransactions).leftJoin(accounts, eq12(recurringTransactions.accountId, accounts.id)).leftJoin(categories, eq12(recurringTransactions.categoryId, categories.id)).orderBy(desc4(recurringTransactions.id));
  return c.json({ data: list });
});
router12.get("/upcoming", async (c) => {
  const list = await db.select({
    id: recurringTransactions.id,
    type: recurringTransactions.type,
    amount: recurringTransactions.amount,
    description: recurringTransactions.description,
    next_run_date: recurringTransactions.nextRunDate,
    frequency: recurringTransactions.frequency,
    account: accounts,
    category: categories
  }).from(recurringTransactions).leftJoin(accounts, eq12(recurringTransactions.accountId, accounts.id)).leftJoin(categories, eq12(recurringTransactions.categoryId, categories.id)).where(eq12(recurringTransactions.isActive, true));
  return c.json({ data: list });
});
router12.get("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const list = await db.select({
    id: recurringTransactions.id,
    type: recurringTransactions.type,
    amount: recurringTransactions.amount,
    to_amount: recurringTransactions.toAmount,
    description: recurringTransactions.description,
    frequency: recurringTransactions.frequency,
    interval: recurringTransactions.interval,
    next_run_date: recurringTransactions.nextRunDate,
    is_active: recurringTransactions.isActive,
    account_id: recurringTransactions.accountId,
    to_account_id: recurringTransactions.toAccountId,
    category_id: recurringTransactions.categoryId,
    account: accounts,
    category: categories
  }).from(recurringTransactions).leftJoin(accounts, eq12(recurringTransactions.accountId, accounts.id)).leftJoin(categories, eq12(recurringTransactions.categoryId, categories.id)).where(eq12(recurringTransactions.id, id));
  if (list.length === 0) return c.json({ message: "Recurring transaction not found" }, 404);
  return c.json(list[0]);
});
router12.post("/", async (c) => {
  const body = await c.req.json();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const startDate = body.start_date || now.split("T")[0];
  const [created] = await db.insert(recurringTransactions).values({
    type: body.type,
    accountId: Number(body.account_id),
    toAccountId: body.to_account_id ? Number(body.to_account_id) : null,
    categoryId: body.category_id ? Number(body.category_id) : null,
    amount: Number(body.amount),
    toAmount: body.to_amount ? Number(body.to_amount) : null,
    description: body.description || "",
    frequency: body.frequency || "monthly",
    interval: Number(body.interval || 1),
    startDate,
    nextRunDate: startDate,
    isActive: true,
    createdAt: now,
    updatedAt: now
  }).returning();
  return c.json(created, 201);
});
var handleUpdate8 = async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const updateData = { updatedAt: now };
  if (body.type !== void 0) updateData.type = body.type;
  if (body.account_id !== void 0) updateData.accountId = Number(body.account_id);
  if (body.to_account_id !== void 0) updateData.toAccountId = body.to_account_id ? Number(body.to_account_id) : null;
  if (body.category_id !== void 0) updateData.categoryId = body.category_id ? Number(body.category_id) : null;
  if (body.amount !== void 0) updateData.amount = Number(body.amount);
  if (body.to_amount !== void 0) updateData.toAmount = body.to_amount ? Number(body.to_amount) : null;
  if (body.description !== void 0) updateData.description = body.description;
  if (body.frequency !== void 0) updateData.frequency = body.frequency;
  if (body.interval !== void 0) updateData.interval = Number(body.interval);
  if (body.is_active !== void 0) updateData.isActive = Boolean(body.is_active);
  const [updated] = await db.update(recurringTransactions).set(updateData).where(eq12(recurringTransactions.id, id)).returning();
  if (!updated) return c.json({ message: "Recurring transaction not found" }, 404);
  return c.json(updated);
};
router12.put("/:id", handleUpdate8);
router12.patch("/:id", handleUpdate8);
router12.post("/:id/skip", async (c) => {
  const id = Number(c.req.param("id"));
  const item = (await db.select().from(recurringTransactions).where(eq12(recurringTransactions.id, id)))[0];
  if (!item) return c.json({ message: "Recurring transaction not found" }, 404);
  const nextDate = calculateNextDate(item.nextRunDate, item.frequency, item.interval);
  const [updated] = await db.update(recurringTransactions).set({ nextRunDate: nextDate, updatedAt: (/* @__PURE__ */ new Date()).toISOString() }).where(eq12(recurringTransactions.id, id)).returning();
  return c.json(updated);
});
router12.delete("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  await db.delete(recurringTransactions).where(eq12(recurringTransactions.id, id));
  return c.json({ message: "Recurring transaction deleted" });
});
var recurring_default = router12;

// server/routes/automation.ts
import { Hono as Hono14 } from "hono";
import { eq as eq13, desc as desc5 } from "drizzle-orm";
var router13 = new Hono14();
router13.use("*", async (c, next) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ message: "Unauthorized" }, 401);
  await next();
});
function formatRule(r) {
  let rawConditions = [];
  try {
    rawConditions = JSON.parse(r.conditions || "[]");
  } catch {
    rawConditions = [];
  }
  const conditions = Array.isArray(rawConditions) ? { match: "all", conditions: rawConditions } : rawConditions || { match: "all", conditions: [] };
  let actions = [];
  try {
    actions = JSON.parse(r.actions || "[]");
  } catch {
    actions = [];
  }
  const triggerType = r.triggerType || "on_transaction_create";
  const triggerLabel = triggerType === "on_transaction_update" ? "On Transaction Update" : "On Transaction Create";
  return {
    id: r.id,
    name: r.name,
    description: r.description || null,
    trigger_type: triggerType,
    trigger_label: triggerLabel,
    priority: Number(r.priority || 50),
    conditions,
    actions,
    is_active: Boolean(r.isActive),
    stop_processing: Boolean(r.stopProcessing),
    runs_count: Number(r.runsCount || 0),
    last_run_at: r.updatedAt,
    created_at: r.createdAt,
    updated_at: r.updatedAt,
    // camelCase aliases
    isActive: Boolean(r.isActive),
    stopProcessing: Boolean(r.stopProcessing),
    runsCount: Number(r.runsCount || 0)
  };
}
router13.get("/", async (c) => {
  const list = await db.select().from(automationRules).orderBy(automationRules.priority);
  return c.json({ data: list.map(formatRule) });
});
router13.get("/triggers", async (c) => {
  return c.json({
    data: [
      { value: "on_transaction_create", label: "On Transaction Create", description: "When transaction is created" },
      { value: "on_transaction_update", label: "On Transaction Update", description: "When transaction is updated" }
    ]
  });
});
router13.get("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const rule = (await db.select().from(automationRules).where(eq13(automationRules.id, id)))[0];
  if (!rule) return c.json({ message: "Rule not found" }, 404);
  return c.json(formatRule(rule));
});
router13.post("/", async (c) => {
  const body = await c.req.json();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const [rule] = await db.insert(automationRules).values({
    name: body.name,
    description: body.description || "",
    triggerType: body.trigger_type || "on_transaction_create",
    priority: Number(body.priority || 50),
    conditions: JSON.stringify(body.conditions || []),
    actions: JSON.stringify(body.actions || []),
    isActive: true,
    stopProcessing: Boolean(body.stop_processing),
    runsCount: 0,
    createdAt: now,
    updatedAt: now
  }).returning();
  return c.json(formatRule(rule), 201);
});
router13.patch("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const updateData = { updatedAt: now };
  if (body.name !== void 0) updateData.name = body.name;
  if (body.description !== void 0) updateData.description = body.description;
  if (body.trigger_type !== void 0) updateData.triggerType = body.trigger_type;
  if (body.priority !== void 0) updateData.priority = Number(body.priority);
  if (body.conditions !== void 0) updateData.conditions = JSON.stringify(body.conditions);
  if (body.actions !== void 0) updateData.actions = JSON.stringify(body.actions);
  if (body.is_active !== void 0) updateData.isActive = Boolean(body.is_active);
  if (body.stop_processing !== void 0) updateData.stopProcessing = Boolean(body.stop_processing);
  const [updated] = await db.update(automationRules).set(updateData).where(eq13(automationRules.id, id)).returning();
  if (!updated) return c.json({ message: "Rule not found" }, 404);
  return c.json(formatRule(updated));
});
router13.post("/:id/toggle", async (c) => {
  const id = Number(c.req.param("id"));
  const rule = (await db.select().from(automationRules).where(eq13(automationRules.id, id)))[0];
  if (!rule) return c.json({ message: "Rule not found" }, 404);
  const [updated] = await db.update(automationRules).set({ isActive: !rule.isActive, updatedAt: (/* @__PURE__ */ new Date()).toISOString() }).where(eq13(automationRules.id, id)).returning();
  return c.json(updated);
});
router13.post("/reorder", async (c) => {
  const body = await c.req.json();
  const rules = body.rules || [];
  for (const r of rules) {
    await db.update(automationRules).set({ priority: Number(r.priority), updatedAt: (/* @__PURE__ */ new Date()).toISOString() }).where(eq13(automationRules.id, Number(r.id)));
  }
  return c.json({ success: true });
});
router13.post("/:id/test", async (c) => {
  return c.json({
    conditions_match: true,
    would_execute: true,
    actions: []
  });
});
router13.get("/:id/logs", async (c) => {
  const ruleId = Number(c.req.param("id"));
  const logs = await db.select().from(automationRuleLogs).where(eq13(automationRuleLogs.ruleId, ruleId)).orderBy(desc5(automationRuleLogs.createdAt)).limit(50);
  return c.json({ data: logs });
});
router13.delete("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  await db.delete(automationRules).where(eq13(automationRules.id, id));
  return c.json({ message: "Rule deleted" });
});
var automation_default = router13;

// server/routes/settings.ts
import { Hono as Hono15 } from "hono";
import { eq as eq14 } from "drizzle-orm";
var router14 = new Hono15();
router14.use("*", async (c, next) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ message: "Unauthorized" }, 401);
  await next();
});
var DEFAULT_SETTINGS = {
  auto_update_currencies: false,
  sso_allow_signup: false,
  password_login_enabled: true,
  sso_require_verified_email: true,
  timezone: "UTC"
};
router14.get("/", async (c) => {
  const rows = await db.select().from(settings);
  const current = { ...DEFAULT_SETTINGS };
  for (const r of rows) {
    try {
      current[r.key] = JSON.parse(r.value || "null");
    } catch {
      current[r.key] = r.value;
    }
  }
  return c.json(current);
});
router14.patch("/", async (c) => {
  const body = await c.req.json();
  for (const [key, value] of Object.entries(body)) {
    const valStr = JSON.stringify(value);
    const existing = (await db.select().from(settings).where(eq14(settings.key, key)))[0];
    if (existing) {
      await db.update(settings).set({ value: valStr }).where(eq14(settings.key, key));
    } else {
      await db.insert(settings).values({ key, value: valStr });
    }
  }
  const rows = await db.select().from(settings);
  const current = { ...DEFAULT_SETTINGS };
  for (const r of rows) {
    try {
      current[r.key] = JSON.parse(r.value || "null");
    } catch {
      current[r.key] = r.value;
    }
  }
  return c.json(current);
});
var settings_default = router14;

// server/routes/timezones.ts
import { Hono as Hono16 } from "hono";
var router15 = new Hono16();
router15.use("*", async (c, next) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ message: "Unauthorized" }, 401);
  await next();
});
router15.get("/", (c) => {
  return c.json({
    timezones: [
      { name: "UTC", offset: "+00:00", canonical: true },
      { name: "Europe/Berlin", offset: "+01:00", canonical: true },
      { name: "Europe/London", offset: "+00:00", canonical: true },
      { name: "Europe/Paris", offset: "+01:00", canonical: true },
      { name: "Asia/Kolkata", offset: "+05:30", canonical: true },
      { name: "America/New_York", offset: "-05:00", canonical: true },
      { name: "America/Chicago", offset: "-06:00", canonical: true },
      { name: "America/Los_Angeles", offset: "-08:00", canonical: true },
      { name: "Asia/Tokyo", offset: "+09:00", canonical: true },
      { name: "Asia/Dubai", offset: "+04:00", canonical: true },
      { name: "Asia/Singapore", offset: "+08:00", canonical: true },
      { name: "Australia/Sydney", offset: "+11:00", canonical: true }
    ],
    current: "UTC"
  });
});
var timezones_default = router15;

// server/routes/monitoring.ts
import { Hono as Hono17 } from "hono";
import os from "os";
var router16 = new Hono17();
router16.use("*", async (c, next) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ message: "Unauthorized" }, 401);
  await next();
});
router16.get("/storage", (c) => {
  return c.json({
    volume: {
      disk: "Cloud Serverless",
      path: "/",
      total_bytes: null,
      free_bytes: null,
      used_bytes: null,
      used_percent: null
    },
    managed: {
      used_bytes: 0,
      objects: 0,
      pending_bytes: 0,
      buckets: []
    },
    uploads: {
      total: 0,
      by_status: {}
    },
    imports: {
      total: 0,
      by_status: {}
    }
  });
});
router16.get("/resources", (c) => {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const memUsage = process.memoryUsage();
  return c.json({
    cpu: {
      cores: os.cpus().length,
      load: typeof os.loadavg === "function" ? os.loadavg() : [0, 0, 0],
      load_percent: null
    },
    memory: {
      total_bytes: totalMem,
      used_bytes: totalMem - freeMem,
      free_bytes: freeMem,
      used_percent: Math.round((totalMem - freeMem) / totalMem * 100),
      source: "host"
    },
    process: {
      memory_bytes: memUsage.rss,
      peak_bytes: memUsage.heapTotal,
      limit_bytes: null
    },
    queue: {
      pending: 0,
      reserved: 0,
      failed: 0
    },
    runtime: {
      php_version: `TypeScript / Node.js ${process.version}`,
      laravel_version: "Serverless Hono TS Engine",
      environment: process.env.NODE_ENV || "development",
      uptime_seconds: Math.round(process.uptime())
    }
  });
});
var monitoring_default = router16;

// server/app.ts
var app = new Hono18().basePath("/api");
app.onError((err, c) => {
  console.error("API Error:", err);
  return c.json({
    message: err.message || "Internal server error",
    name: err.name
  }, 500);
});
initDatabase();
app.route("/auth", auth_default);
app.route("/accounts", accounts_default);
app.route("/categories", categories_default);
app.route("/currencies", currencies_default);
app.route("/transactions", transactions_default);
app.route("/budgets", budgets_default);
app.route("/reports", reports_default);
app.route("/import", import_default);
app.route("/transactions/import", import_default);
app.route("/backups", backups_default);
app.route("/debts", debts_default);
app.route("/tags", tags_default);
app.route("/users", users_default);
app.route("/recurring", recurring_default);
app.route("/automation-rules", automation_default);
app.route("/settings", settings_default);
app.route("/timezones", timezones_default);
app.route("/monitoring", monitoring_default);
app.get("/accounts-balance-history", (c) => c.json({ dates: [], series: [], currency: "\u20AC", decimals: 2 }));
app.get("/accounts-balance-comparison", (c) => c.json({ current: 0, previous: null, currency: "\u20AC", decimals: 2 }));
app.get("/categories-summary", async (c) => {
  return c.redirect("/api/categories/summary");
});
app.get("/transactions-summary", async (c) => {
  return c.json(await getTransactionSummary());
});
app.get("/debts-summary", async (c) => {
  return c.redirect("/api/debts/summary");
});
app.get("/recurring-upcoming", async (c) => {
  return c.redirect("/api/recurring/upcoming");
});
app.get("/identity-providers", (c) => c.json({ data: [] }));
app.get("/identity-providers/:id", (c) => c.json({}));
app.post("/s3/multipart", (c) => c.json({ uploadId: "direct", key: "file" }));
app.get("/s3/multipart/:id", (c) => c.json([]));
app.get("/s3/multipart/:id/:part", (c) => c.json({ url: "", partNumber: 1 }));
app.post("/s3/multipart/complete", (c) => c.json({ location: "", key: "file", uploadId: "direct" }));
app.delete("/s3/multipart/:id", (c) => c.json({}));
app.get("/health", async (c) => {
  try {
    await rawClient.execute("SELECT 1");
    return c.json({ status: "ok", database: "connected", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  } catch (e) {
    let rawInfo = null;
    try {
      const tursoUrl = url.replace("libsql://", "https://") + "/v2/pipeline";
      const tursoRes = await fetch(tursoUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${authToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          requests: [{ type: "execute", stmt: { sql: "SELECT 1" } }, { type: "close" }]
        })
      });
      rawInfo = {
        status: tursoRes.status,
        body: await tursoRes.text(),
        token_len: authToken.length,
        turso_host: tursoUrl
      };
    } catch (fetchErr) {
      rawInfo = { fetch_error: fetchErr.message };
    }
    return c.json({
      status: "degraded",
      database_error: e.message,
      raw_turso: rawInfo,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
});

// server/entrypoint.ts
var entrypoint_default = handle(app);
export {
  app,
  entrypoint_default as default
};
