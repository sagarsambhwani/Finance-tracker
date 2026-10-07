import 'dotenv/config'
import { createClient } from '@libsql/client/web'
import { drizzle } from 'drizzle-orm/libsql'
import * as schema from './schema'

const url = 'libsql://finance-tracker-sagarsambhwani.aws-eu-west-1.turso.io'
const authToken = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTEzNjg5NjcsImlkIjoiMDFhMTE1ZTUtZTAwMS03Yjc0LThiZTUtOGVhYjA4MWJlOTI3Iiwia2lkIjoickhnU0Q0RnUwRzhFbG5udlFSbTQyeFJZck4wS1A1VURkTXhQcnN0bXNnOCIsInJpZCI6IjBmOTg4ZjhiLTc1YzQtNGYxZS1hMDRmLTAxM2YzZWRkZDRhNCJ9.yUy6GDwaV0Xz2Idsw8HwXM61X9raMDkP6xqNdxehKYrgWEtrVVM_uvjd2cSNT76WYIRo151P8OXz4DEcTIPgDg'

export const rawClient = createClient({
    url,
    authToken,
})

export const db = drizzle(rawClient, { schema })

const CREATE_TABLES_SQL = `
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
`

let isInitialized = false

export async function initDatabase() {
    if (isInitialized) return
    try {
        await rawClient.executeMultiple(CREATE_TABLES_SQL)
        await seedDefaultData()
        isInitialized = true
    } catch (e) {
        console.warn('Database initialization note:', e)
    }
}

/**
 * Seed initial currencies and default categories if empty
 */
export async function seedDefaultData() {
    try {
        const now = new Date().toISOString()
        const existingCurrencies = await db.select().from(schema.currencies).limit(1)
        if (existingCurrencies.length === 0) {
            await db.insert(schema.currencies).values([
                { code: 'EUR', name: 'Euro', symbol: '€', decimals: 2, rate: 1.0, isBase: true, createdAt: now, updatedAt: now },
                { code: 'USD', name: 'US Dollar', symbol: '$', decimals: 2, rate: 1.08, isBase: false, createdAt: now, updatedAt: now },
                { code: 'INR', name: 'Indian Rupee', symbol: '₹', decimals: 2, rate: 90.5, isBase: false, createdAt: now, updatedAt: now },
                { code: 'GBP', name: 'British Pound', symbol: '£', decimals: 2, rate: 0.85, isBase: false, createdAt: now, updatedAt: now },
            ]).onConflictDoNothing()
        }

        const existingCategories = await db.select().from(schema.categories).limit(1)
        if (existingCategories.length === 0) {
            await db.insert(schema.categories).values([
                { name: 'Salary', type: 'income', icon: 'wallet', color: '#10b981', createdAt: now, updatedAt: now },
                { name: 'Freelance', type: 'income', icon: 'briefcase', color: '#06b6d4', createdAt: now, updatedAt: now },
                { name: 'Food & Dining', type: 'expense', icon: 'utensils', color: '#f59e0b', createdAt: now, updatedAt: now },
                { name: 'Groceries', type: 'expense', icon: 'shopping-cart', color: '#84cc16', createdAt: now, updatedAt: now },
                { name: 'Housing & Rent', type: 'expense', icon: 'home', color: '#6366f1', createdAt: now, updatedAt: now },
                { name: 'Utilities', type: 'expense', icon: 'zap', color: '#ec4899', createdAt: now, updatedAt: now },
                { name: 'Transportation', type: 'expense', icon: 'car', color: '#3b82f6', createdAt: now, updatedAt: now },
                { name: 'Entertainment', type: 'expense', icon: 'film', color: '#8b5cf6', createdAt: now, updatedAt: now },
                { name: 'Health & Medical', type: 'expense', icon: 'heart', color: '#ef4444', createdAt: now, updatedAt: now },
            ]).onConflictDoNothing()
        }
    } catch (e) {
        console.warn('Seeding check note:', e)
    }
}
