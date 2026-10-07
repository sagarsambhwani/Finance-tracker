import { Hono } from 'hono'
import { eq, and, desc } from 'drizzle-orm'
import { db } from '../db/client'
import { transactions, accounts, categories, currencies } from '../db/schema'
import { getAuthUser } from './auth'

const router = new Hono()

router.use('*', async (c, next) => {
    const user = await getAuthUser(c)
    if (!user) return c.json({ message: 'Unauthorized' }, 401)
    await next()
})

async function getBaseCurrency() {
    return (await db.select().from(currencies).where(eq(currencies.isBase, true)))[0] || { symbol: '€', code: 'EUR' }
}

// 1. Overview metrics
router.get('/overview', async (c) => {
    const baseCurr = await getBaseCurrency()
    const allTx = await db.select().from(transactions)

    let income = 0
    let expenses = 0

    for (const tx of allTx) {
        if (tx.type === 'income') income += Number(tx.amount)
        if (tx.type === 'expense') expenses += Number(tx.amount)
    }

    const net = income - expenses
    const savingsRate = income > 0 ? Math.round(((net / income) * 100) * 10) / 10 : 0

    return c.json({
        income: { value: income, previous: null, sparkline: [] },
        expenses: { value: expenses, previous: null, sparkline: [] },
        netCashFlow: { value: net, previous: null, sparkline: [] },
        savingsRate: { value: savingsRate, previous: null, sparkline: [] },
        currency: baseCurr.symbol,
    })
})

// 2. Money Flow (Sankey Diagram)
router.get('/money-flow', async (c) => {
    const baseCurr = await getBaseCurrency()
    const allTx = await db.select({
        type: transactions.type,
        amount: transactions.amount,
        accountName: accounts.name,
        categoryName: categories.name,
    })
    .from(transactions)
    .leftJoin(accounts, eq(transactions.accountId, accounts.id))
    .leftJoin(categories, eq(transactions.categoryId, categories.id))

    const nodesMap = new Map<string, string>()
    const linksMap = new Map<string, number>()

    let totalIncome = 0
    let totalExpenses = 0

    for (const tx of allTx) {
        const amt = Number(tx.amount)
        const acc = tx.accountName || 'Primary Account'
        const cat = tx.categoryName || 'General'

        if (tx.type === 'income') {
            totalIncome += amt
            nodesMap.set(cat, '#10b981')
            nodesMap.set(acc, '#3b82f6')
            const key = `${cat}-->${acc}`
            linksMap.set(key, (linksMap.get(key) || 0) + amt)
        } else if (tx.type === 'expense') {
            totalExpenses += amt
            nodesMap.set(acc, '#3b82f6')
            nodesMap.set(cat, '#f59e0b')
            const key = `${acc}-->${cat}`
            linksMap.set(key, (linksMap.get(key) || 0) + amt)
        }
    }

    const nodes = Array.from(nodesMap.entries()).map(([name, color]) => ({
        name,
        itemStyle: { color },
    }))

    const links = Array.from(linksMap.entries()).map(([key, value]) => {
        const [source, target] = key.split('-->')
        return { source, target, value }
    })

    return c.json({
        nodes,
        links,
        totals: {
            income: totalIncome,
            expenses: totalExpenses,
            savings: totalIncome - totalExpenses,
        },
        currency: baseCurr.symbol,
    })
})

// 3. Expense Pace
router.get('/expense-pace', async (c) => {
    const baseCurr = await getBaseCurrency()
    const now = new Date()
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const currentDay = now.getDate()

    const allTx = await db.select().from(transactions).where(eq(transactions.type, 'expense'))
    let totalSpent = 0
    const dailyExpenses = new Array(daysInMonth).fill(0)

    for (const tx of allTx) {
        const txDate = new Date(tx.date)
        if (txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear()) {
            const day = txDate.getDate()
            const amt = Number(tx.amount)
            if (day >= 1 && day <= daysInMonth) {
                dailyExpenses[day - 1] += amt
            }
            totalSpent += amt
        }
    }

    return c.json({
        months: [
            {
                label: now.toLocaleString('default', { month: 'short', year: 'numeric' }),
                budget: null,
                dailyExpenses,
                currentDay,
                daysInMonth,
                totalSpent,
                monthStart: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
                monthEnd: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0],
            }
        ],
        currency: baseCurr.symbol,
    })
})

// 4. Expenses by Category
router.get('/expenses-by-category', async (c) => {
    const baseCurr = await getBaseCurrency()
    const txList = await db.select({
        categoryId: transactions.categoryId,
        amount: transactions.amount,
        categoryName: categories.name,
        categoryIcon: categories.icon,
        categoryColor: categories.color,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(eq(transactions.type, 'expense'))

    const categoryTotals = new Map<number, { id: number, name: string, icon: string, color: string, current: number }>()

    for (const tx of txList) {
        if (!tx.categoryId) continue
        const existing = categoryTotals.get(tx.categoryId) || {
            id: tx.categoryId,
            name: tx.categoryName || 'Other',
            icon: tx.categoryIcon || 'tag',
            color: tx.categoryColor || '#64748b',
            current: 0,
        }
        existing.current += Number(tx.amount)
        categoryTotals.set(tx.categoryId, existing)
    }

    return c.json({
        categories: Array.from(categoryTotals.values()).map(cat => ({ ...cat, previous: 0 })),
        currency: baseCurr.symbol,
    })
})

// 5. Cash Flow Over Time
router.get('/cash-flow-over-time', async (c) => {
    const baseCurr = await getBaseCurrency()
    const allTx = await db.select().from(transactions).orderBy(transactions.date)

    const dateMap = new Map<string, { income: number, expenses: number }>()
    for (const tx of allTx) {
        const d = tx.date
        const cur = dateMap.get(d) || { income: 0, expenses: 0 }
        if (tx.type === 'income') cur.income += Number(tx.amount)
        if (tx.type === 'expense') cur.expenses += Number(tx.amount)
        dateMap.set(d, cur)
    }

    let runningBalance = 0
    const items = Array.from(dateMap.entries()).map(([label, val]) => {
        runningBalance += (val.income - val.expenses)
        return {
            label,
            income: val.income,
            expenses: val.expenses,
            balance: runningBalance,
        }
    })

    return c.json({
        items,
        currency: baseCurr.symbol,
    })
})

// 6. Activity Heatmap
router.get('/activity-heatmap', async (c) => {
    const baseCurr = await getBaseCurrency()
    const allTx = await db.select().from(transactions)

    const dateMap = new Map<string, { count: number, value: number }>()
    let max = 0

    for (const tx of allTx) {
        const d = tx.date
        const cur = dateMap.get(d) || { count: 0, value: 0 }
        cur.count += 1
        cur.value += Number(tx.amount)
        if (cur.count > max) max = cur.count
        dateMap.set(d, cur)
    }

    const items = Array.from(dateMap.entries()).map(([date, data]) => ({
        date,
        count: data.count,
        value: data.value,
    }))

    return c.json({
        items,
        max: max || 1,
        currency: baseCurr.symbol,
    })
})

// 7. Transaction summary
router.get('/transactions/summary', async (c) => {
    const baseCurr = await getBaseCurrency()
    const type = c.req.query('type') || 'expense'
    const txList = await db.select().from(transactions).where(eq(transactions.type, type as any))

    const total = txList.reduce((sum, t) => sum + Number(t.amount), 0)
    const daysInPeriod = 30
    const avgPerDay = Math.round((total / daysInPeriod) * 100) / 100
    const avgPerWeek = Math.round((total / 4.28) * 100) / 100

    return c.json({
        total,
        previous: null,
        avgPerDay,
        avgPerWeek,
        prevAvgPerDay: null,
        prevAvgPerWeek: null,
        daysInPeriod,
        currency: baseCurr.symbol,
    })
})

// 8. Transactions by category
router.get('/transactions/by-category', async (c) => {
    const baseCurr = await getBaseCurrency()
    const type = c.req.query('type') || 'expense'

    const txList = await db.select({
        categoryId: transactions.categoryId,
        amount: transactions.amount,
        name: categories.name,
        icon: categories.icon,
        color: categories.color,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(eq(transactions.type, type as any))

    let total = 0
    const catMap = new Map<number, { id: number, name: string, icon: string, color: string, value: number }>()

    for (const tx of txList) {
        if (!tx.categoryId) continue
        const amt = Number(tx.amount)
        total += amt
        const existing = catMap.get(tx.categoryId) || {
            id: tx.categoryId,
            name: tx.name || 'Other',
            icon: tx.icon || 'tag',
            color: tx.color || '#64748b',
            value: 0,
        }
        existing.value += amt
        catMap.set(tx.categoryId, existing)
    }

    const items = Array.from(catMap.values()).map(item => ({
        ...item,
        percentage: total > 0 ? Math.round((item.value / total) * 100) : 0,
    }))

    return c.json({
        items,
        total,
        currency: baseCurr.symbol,
    })
})

// 9. Transaction dynamics
router.get('/transactions/dynamics', async (c) => {
    const baseCurr = await getBaseCurrency()
    return c.json({
        labels: [],
        datasets: [],
        currency: baseCurr.symbol,
    })
})

// 10. Top transactions
router.get('/transactions/top', async (c) => {
    const baseCurr = await getBaseCurrency()
    const type = c.req.query('type') || 'expense'
    const limit = Number(c.req.query('limit') || 10)

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
        accountName: accounts.name,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .leftJoin(accounts, eq(transactions.accountId, accounts.id))
    .where(eq(transactions.type, type as any))
    .orderBy(desc(transactions.amount))
    .limit(limit)

    const items = txList.map(tx => ({
        id: tx.id,
        description: tx.description || 'Transaction',
        amount: Number(tx.amount),
        date: tx.date,
        category: {
            id: tx.categoryId || 0,
            name: tx.categoryName || 'General',
            icon: tx.categoryIcon || 'tag',
            color: tx.categoryColor || '#64748b',
        },
        account: {
            id: tx.accountId,
            name: tx.accountName || 'Account',
        },
    }))

    return c.json({
        items,
        currency: baseCurr.symbol,
    })
})

// 11. Net worth
router.get('/net-worth', async (c) => {
    const baseCurr = await getBaseCurrency()
    const accList = await db.select().from(accounts).where(eq(accounts.isArchived, false))
    const total = accList.reduce((sum, acc) => sum + (Number(acc.balance) || 0), 0)

    const mappedAccounts = accList.map(a => ({
        id: a.id,
        name: a.name,
        type: a.type,
        balance: Number(a.balance) || 0,
        percentage: total > 0 ? Math.round(((Number(a.balance) || 0) / total) * 100) : 0,
    }))

    return c.json({
        current: total,
        previous: null,
        change: 0,
        changePercent: 0,
        accounts: mappedAccounts,
        currency: baseCurr.symbol,
    })
})

// 12. Net worth history
router.get('/net-worth-history', async (c) => {
    const baseCurr = await getBaseCurrency()
    const accList = await db.select().from(accounts).where(eq(accounts.isArchived, false))
    const total = accList.reduce((sum, acc) => sum + (Number(acc.balance) || 0), 0)

    return c.json({
        labels: [new Date().toISOString().split('T')[0]],
        values: [total],
        currency: baseCurr.symbol,
    })
})

export default router
