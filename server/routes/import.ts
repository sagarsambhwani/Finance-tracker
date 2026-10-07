import { Hono } from 'hono'
import crypto from 'crypto'
import pdfParse from 'pdf-parse'
import { eq } from 'drizzle-orm'
import { db } from '../db/client'
import { transactions, accounts } from '../db/schema'
import { getAuthUser } from './auth'

const router = new Hono()

router.use('*', async (c, next) => {
    const user = await getAuthUser(c)
    if (!user) return c.json({ message: 'Unauthorized' }, 401)
    await next()
})

interface ParsedRow {
    date: string
    amount: number
    description: string
    hash: string
}

// Clean and normalize number amounts (supports German 1.234,56 and US/Indian 1,234.56)
function parseAmountString(str: string): number {
    str = str.replace(/[^\d.,\-+]/g, '').trim()
    const lastComma = str.lastIndexOf(',')
    const lastDot = str.lastIndexOf('.')

    if (lastComma > lastDot) {
        // European format: 1.234,56
        str = str.replace(/\./g, '').replace(',', '.')
    } else {
        // US / Indian format: 1,234.56
        str = str.replace(/,/g, '')
    }

    const val = parseFloat(str)
    return isNaN(val) ? 0 : val
}

// Normalize dates to YYYY-MM-DD
function parseDateString(str: string): string {
    str = str.trim()
    // Match DD.MM.YYYY (Deutsche Bank)
    const deMatch = str.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/)
    if (deMatch) {
        return `${deMatch[3]}-${deMatch[2].padStart(2, '0')}-${deMatch[1].padStart(2, '0')}`
    }
    // Match DD/MM/YYYY (HDFC)
    const inMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
    if (inMatch) {
        return `${inMatch[3]}-${inMatch[2].padStart(2, '0')}-${inMatch[1].padStart(2, '0')}`
    }
    // Match YYYY-MM-DD
    const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
    if (isoMatch) {
        return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`
    }
    return new Date().toISOString().split('T')[0]
}

// Parse CSV text
function parseCsv(content: string): ParsedRow[] {
    const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0)
    if (lines.length < 2) return []

    // Detect delimiter
    const delimiter = lines[0].includes(';') ? ';' : ','
    const headers = lines[0].split(delimiter).map(h => h.trim().toLowerCase().replace(/"/g, ''))

    let dateIdx = headers.findIndex(h => h.includes('date') || h.includes('datum'))
    let descIdx = headers.findIndex(h => h.includes('description') || h.includes('beschreibung') || h.includes('narration') || h.includes('details'))
    let amountIdx = headers.findIndex(h => h.includes('amount') || h.includes('betrag') || h.includes('withdrawal') || h.includes('summe'))

    if (dateIdx === -1) dateIdx = 0
    if (descIdx === -1) descIdx = 1
    if (amountIdx === -1) amountIdx = 2

    const rows: ParsedRow[] = []

    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(delimiter).map(c => c.trim().replace(/^"|"$/g, ''))
        if (cols.length <= Math.max(dateIdx, amountIdx)) continue

        const date = parseDateString(cols[dateIdx])
        const amount = parseAmountString(cols[amountIdx])
        const description = cols[descIdx] || 'Bank Transaction'

        if (amount !== 0) {
            const hash = crypto.createHash('md5').update(`${date}_${amount}_${description}`).digest('hex')
            rows.push({ date, amount, description, hash })
        }
    }

    return rows
}

// Parse PDF statement
async function parsePdf(buffer: Buffer): Promise<ParsedRow[]> {
    const data = await pdfParse(buffer)
    const text = data.text
    const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0)
    const rows: ParsedRow[] = []

    // Match lines starting with a date like 01.10.2026 or 01/10/2026
    const dateRegex = /^(\d{1,2}[./]\d{1,2}[./]\d{4})/

    for (const line of lines) {
        const match = line.match(dateRegex)
        if (match) {
            const dateStr = match[1]
            const remaining = line.slice(match[0].length).trim()

            // Look for amount at the end of the line
            const amountMatch = remaining.match(/([-+]?\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)\s*$/)
            if (amountMatch) {
                const amount = parseAmountString(amountMatch[1])
                const description = remaining.slice(0, remaining.length - amountMatch[0].length).trim() || 'Bank Transaction'
                const date = parseDateString(dateStr)
                const hash = crypto.createHash('md5').update(`${date}_${amount}_${description}`).digest('hex')
                rows.push({ date, amount, description, hash })
            }
        }
    }

    return rows
}

// Parse Endpoint (Accepts both CSV and PDF!)
router.post('/parse', async (c) => {
    const body = await c.req.parseBody()
    const file = body['file'] as File | undefined

    if (!file) {
        return c.json({ message: 'No statement file provided.' }, 400)
    }

    const filename = file.name.toLowerCase()
    let parsedRows: ParsedRow[] = []

    if (filename.endsWith('.pdf')) {
        const arrayBuffer = await file.arrayBuffer()
        parsedRows = await parsePdf(Buffer.from(arrayBuffer))
    } else {
        const text = await file.text()
        parsedRows = parseCsv(text)
    }

    return c.json({
        total: parsedRows.length,
        rows: parsedRows.slice(0, 50),
        all_rows: parsedRows,
    })
})

// Execute Import (Saves rows to database and prevents duplicates)
router.post('/execute', async (c) => {
    const { account_id, rows } = await c.req.json()
    const accountId = Number(account_id)
    if (!accountId || !Array.isArray(rows)) {
        return c.json({ message: 'Account ID and rows are required' }, 400)
    }

    const now = new Date().toISOString()
    let insertedCount = 0
    let skippedDuplicates = 0
    let netBalanceChange = 0

    for (const row of rows) {
        // Check for duplicate via dedupHash
        const existing = await db.select().from(transactions).where(eq(transactions.dedupHash, row.hash)).limit(1)
        if (existing.length > 0) {
            skippedDuplicates++
            continue
        }

        const type = row.amount >= 0 ? 'income' : 'expense'
        const absAmount = Math.abs(row.amount)

        await db.insert(transactions).values({
            type,
            accountId,
            amount: absAmount,
            description: row.description,
            date: row.date,
            dedupHash: row.hash,
            createdAt: now,
            updatedAt: now,
        })

        netBalanceChange += row.amount
        insertedCount++
    }

    // Update account balance
    const account = (await db.select().from(accounts).where(eq(accounts.id, accountId)))[0]
    if (account) {
        await db.update(accounts)
            .set({ balance: account.balance + netBalanceChange, updatedAt: now })
            .where(eq(accounts.id, accountId))
    }

    return c.json({
        inserted: insertedCount,
        skipped_duplicates: skippedDuplicates,
        balance_change: netBalanceChange,
    })
})

export default router
