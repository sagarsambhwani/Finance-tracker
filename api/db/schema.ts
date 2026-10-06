import { sqliteTable, text, integer, real, primaryKey, index, uniqueIndex } from 'drizzle-orm/sqlite-core'

// ==========================================
// 1. Users & Authentication
// ==========================================
export const users = sqliteTable('users', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    password: text('password').notNull(),
    role: text('role', { enum: ['admin', 'read-write', 'read-only'] }).notNull().default('admin'),
    isSsoOnly: integer('is_sso_only', { mode: 'boolean' }).notNull().default(false),
    twoFactorSecret: text('two_factor_secret'),
    twoFactorEnabled: integer('two_factor_enabled', { mode: 'boolean' }).notNull().default(false),
    twoFactorConfirmed: integer('two_factor_confirmed', { mode: 'boolean' }).notNull().default(false),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
})

export const authSessions = sqliteTable('auth_sessions', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    token: text('token').notNull().unique(),
    csrf: text('csrf').notNull().default(''),
    ip: text('ip'),
    userAgent: text('user_agent'),
    lastUsedAt: text('last_used_at').notNull(),
    idleExpiresAt: text('idle_expires_at'),
    absoluteExpiresAt: text('absolute_expires_at'),
    expiresAt: text('expires_at'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
})

export const twoFactorRecoveryCodes = sqliteTable('two_factor_recovery_codes', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    code: text('code').notNull(),
    usedAt: text('used_at'),
    createdAt: text('created_at').notNull(),
})

export const webauthnCredentials = sqliteTable('webauthn_credentials', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    credentialId: text('credential_id', { length: 512 }).notNull().unique(),
    name: text('name', { length: 100 }),
    aaguid: text('aaguid'),
    record: text('record').notNull(), // JSON
    transports: text('transports'), // JSON
    counter: integer('counter').notNull().default(0),
    lastUsedAt: text('last_used_at'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
})

// ==========================================
// 2. Currencies
// ==========================================
export const currencies = sqliteTable('currencies', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    code: text('code', { length: 10 }).notNull().unique(),
    name: text('name').notNull(),
    symbol: text('symbol', { length: 5 }).notNull(),
    decimals: integer('decimals').notNull().default(2),
    isBase: integer('is_base', { mode: 'boolean' }).notNull().default(false),
    rate: real('rate').notNull().default(1.0),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
})

// ==========================================
// 3. Accounts & Debts (Unified Ledger)
// ==========================================
export const accounts = sqliteTable('accounts', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    type: text('type', { enum: ['bank', 'crypto', 'cash', 'debt'] }).notNull(),
    debtType: text('debt_type', { enum: ['i_owe', 'owed_to_me'] }),
    currencyId: integer('currency_id').notNull().references(() => currencies.id),
    initialBalance: real('initial_balance').notNull().default(0),
    balance: real('balance').notNull().default(0),
    color: text('color').default('#3b82f6'),
    icon: text('icon').default('landmark'),
    isArchived: integer('is_archived', { mode: 'boolean' }).notNull().default(false),
    targetAmount: real('target_amount'),
    dueDate: text('due_date'),
    isPaidOff: integer('is_paid_off', { mode: 'boolean' }).notNull().default(false),
    counterparty: text('counterparty'),
    debtDescription: text('debt_description'),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
}, (table) => [
    index('accounts_type_debt_type_idx').on(table.type, table.debtType),
    index('accounts_is_paid_off_idx').on(table.isPaidOff),
])

// ==========================================
// 4. Categories & Tags
// ==========================================
export const categories = sqliteTable('categories', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    type: text('type', { enum: ['income', 'expense'] }).notNull(),
    icon: text('icon'),
    color: text('color'),
    parentId: integer('parent_id'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
})

export const tags = sqliteTable('tags', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull().unique(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
})

// ==========================================
// 5. Transactions & Items
// ==========================================
export const transactions = sqliteTable('transactions', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    type: text('type', { enum: ['income', 'expense', 'transfer', 'debt_payment', 'debt_collection'] }).notNull(),
    accountId: integer('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
    toAccountId: integer('to_account_id').references(() => accounts.id, { onDelete: 'set null' }),
    categoryId: integer('category_id').references(() => categories.id, { onDelete: 'set null' }),
    amount: real('amount').notNull(),
    toAmount: real('to_amount'),
    exchangeRate: real('exchange_rate').default(1.0),
    description: text('description'),
    date: text('date').notNull(), // YYYY-MM-DD
    dedupHash: text('dedup_hash'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
}, (table) => [
    index('transactions_date_idx').on(table.date),
    index('transactions_type_idx').on(table.type),
    index('transactions_account_date_idx').on(table.accountId, table.date),
    index('transactions_dedup_hash_idx').on(table.dedupHash),
])

export const transactionItems = sqliteTable('transaction_items', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    transactionId: integer('transaction_id').notNull().references(() => transactions.id, { onDelete: 'cascade' }),
    description: text('description'),
    amount: real('amount').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
})

export const transactionTag = sqliteTable('transaction_tag', {
    transactionId: integer('transaction_id').notNull().references(() => transactions.id, { onDelete: 'cascade' }),
    tagId: integer('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
}, (table) => [
    primaryKey({ columns: [table.transactionId, table.tagId] }),
])

// ==========================================
// 6. Budgets
// ==========================================
export const budgets = sqliteTable('budgets', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    categoryId: integer('category_id').notNull().references(() => categories.id, { onDelete: 'cascade' }),
    currencyId: integer('currency_id').references(() => currencies.id),
    amount: real('amount').notNull(),
    period: text('period', { enum: ['monthly', 'yearly'] }).notNull().default('monthly'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
})

export const budgetTag = sqliteTable('budget_tag', {
    budgetId: integer('budget_id').notNull().references(() => budgets.id, { onDelete: 'cascade' }),
    tagId: integer('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
}, (table) => [
    primaryKey({ columns: [table.budgetId, table.tagId] }),
])

// ==========================================
// 7. Recurring Transactions
// ==========================================
export const recurringTransactions = sqliteTable('recurring_transactions', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    type: text('type', { enum: ['income', 'expense', 'transfer'] }).notNull(),
    accountId: integer('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
    toAccountId: integer('to_account_id').references(() => accounts.id, { onDelete: 'set null' }),
    categoryId: integer('category_id').references(() => categories.id, { onDelete: 'set null' }),
    amount: real('amount').notNull(),
    toAmount: real('to_amount'),
    description: text('description'),
    frequency: text('frequency', { enum: ['daily', 'weekly', 'monthly', 'yearly'] }).notNull(),
    interval: integer('interval').notNull().default(1),
    dayOfWeek: integer('day_of_week'),
    dayOfMonth: integer('day_of_month'),
    startDate: text('start_date').notNull(),
    endDate: text('end_date'),
    nextRunDate: text('next_run_date').notNull(),
    lastRunDate: text('last_run_date'),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
}, (table) => [
    index('recurring_next_run_date_idx').on(table.nextRunDate),
])

export const recurringTransactionTag = sqliteTable('recurring_transaction_tag', {
    recurringTransactionId: integer('recurring_transaction_id').notNull().references(() => recurringTransactions.id, { onDelete: 'cascade' }),
    tagId: integer('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
}, (table) => [
    primaryKey({ columns: [table.recurringTransactionId, table.tagId] }),
])

// ==========================================
// 8. Automation Rules Engine
// ==========================================
export const automationRules = sqliteTable('automation_rules', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    description: text('description'),
    triggerType: text('trigger_type', { length: 50 }).notNull(), // 'transaction_created', 'transaction_imported'
    priority: integer('priority').notNull().default(50),
    conditions: text('conditions').notNull(), // JSON array of rules
    actions: text('actions').notNull(), // JSON array of actions
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    stopProcessing: integer('stop_processing', { mode: 'boolean' }).notNull().default(false),
    runsCount: integer('runs_count').notNull().default(0),
    lastRunAt: text('last_run_at'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
}, (table) => [
    index('automation_trigger_active_priority_idx').on(table.triggerType, table.isActive, table.priority),
])

export const automationRuleLogs = sqliteTable('automation_rule_logs', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    ruleId: integer('rule_id').notNull().references(() => automationRules.id, { onDelete: 'cascade' }),
    triggerEntityType: text('trigger_entity_type', { length: 50 }),
    triggerEntityId: integer('trigger_entity_id'),
    actionsExecuted: text('actions_executed'), // JSON
    status: text('status', { enum: ['success', 'error', 'skipped'] }).notNull(),
    errorMessage: text('error_message'),
    createdAt: text('created_at').notNull(),
}, (table) => [
    index('automation_logs_rule_created_idx').on(table.ruleId, table.createdAt),
])

// ==========================================
// 9. Key-Value Settings Store
// ==========================================
export const settings = sqliteTable('settings', {
    key: text('key').primaryKey(),
    value: text('value'),
})
