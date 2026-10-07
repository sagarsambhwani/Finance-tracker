import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Transaction } from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
    MoreHorizontal,
    Pencil,
    Trash2,
    Copy,
    ArrowDownLeft,
    ArrowUpRight,
    ArrowLeftRight,
    Banknote,
    HandCoins,
    ChevronDown,
} from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'

const TYPE_CONFIG = {
    income: { icon: ArrowDownLeft, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-500/10 text-green-600 dark:text-green-400', label: 'Income' },
    expense: { icon: ArrowUpRight, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-500/10 text-red-600 dark:text-red-400', label: 'Expense' },
    transfer: { icon: ArrowLeftRight, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400', label: 'Transfer' },
    debt_payment: { icon: Banknote, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-500/10 text-orange-600 dark:text-orange-400', label: 'Debt Payment' },
    debt_collection: { icon: HandCoins, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400', label: 'Debt Collection' },
}

interface MobileTransactionCardProps {
    transaction: Transaction
    onDelete: (id: number) => void
    onDuplicate: (id: number) => void
    isReadOnly?: boolean
}

export function MobileTransactionCard({
    transaction,
    onDelete,
    onDuplicate,
    isReadOnly,
}: MobileTransactionCardProps) {
    const [itemsExpanded, setItemsExpanded] = useState(false)
    const { type, amount, toAmount, account, toAccount, category, description, tags, items, date } = transaction

    const config = TYPE_CONFIG[type] ?? TYPE_CONFIG.expense
    const TypeIcon = config.icon

    const isIncoming = type === 'income' || type === 'debt_collection'
    const isTransfer = type === 'transfer'
    const isDebtPayment = type === 'debt_payment'

    const getDefaultDescription = () => {
        if (type === 'transfer') return `${account.name} → ${toAccount?.name ?? 'Account'}`
        if (type === 'debt_payment') return `Payment: ${toAccount?.name ?? 'Debt'}`
        if (type === 'debt_collection') return `Collection: ${toAccount?.name ?? 'Debt'}`
        return category?.name ?? 'Transaction'
    }

    const itemsCount = transaction.itemsCount ?? items?.length ?? 0
    const decimals = account.currency?.decimals ?? 2

    return (
        <div className="rounded-xl border bg-card p-3.5 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-start justify-between gap-3">
                {/* Left: Icon & Details */}
                <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className={cn('p-2.5 rounded-xl shrink-0 mt-0.5', config.bg)}>
                        <TypeIcon className="size-4" />
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                        {/* Title / Description */}
                        <p className="font-semibold text-sm leading-tight truncate">
                            {description || getDefaultDescription()}
                        </p>

                        {/* Sub details: Account / Category */}
                        <div className="flex items-center flex-wrap gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground">
                            <span>{account.name}</span>
                            {category && (
                                <>
                                    <span>·</span>
                                    <span>{category.icon} {category.name}</span>
                                </>
                            )}
                            {isTransfer && toAccount && (
                                <>
                                    <span>→</span>
                                    <span>{toAccount.name}</span>
                                </>
                            )}
                        </div>

                        {/* Date & Tags */}
                        <div className="flex items-center flex-wrap gap-1.5 pt-0.5">
                            <span className="text-[11px] font-mono text-muted-foreground">
                                {formatDate(date)}
                            </span>

                            {tags && tags.length > 0 && tags.map((tag) => (
                                <Badge key={tag.id} variant="secondary" className="text-[10px] px-1 py-0 h-4">
                                    #{tag.name}
                                </Badge>
                            ))}

                            {itemsCount > 1 && (
                                <button
                                    type="button"
                                    onClick={() => setItemsExpanded(!itemsExpanded)}
                                    className="inline-flex items-center text-[10px] text-primary hover:underline font-medium ml-1"
                                >
                                    {itemsCount} items
                                    <ChevronDown className={cn('size-3 ml-0.5 transition-transform', itemsExpanded && 'rotate-180')} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right: Amount & Actions */}
                <div className="flex flex-col items-end shrink-0 gap-1">
                    <div className={cn(
                        'font-mono font-bold text-sm sm:text-base text-right',
                        isIncoming ? 'text-green-600 dark:text-green-400'
                        : isTransfer ? 'text-blue-600 dark:text-blue-400'
                        : isDebtPayment ? 'text-orange-600 dark:text-orange-400'
                        : 'text-red-600 dark:text-red-400'
                    )}>
                        {isIncoming ? '+' : '-'}{amount.toFixed(decimals)} {account.currency?.symbol}
                    </div>

                    {isTransfer && toAmount && toAccount && (
                        <div className="text-[11px] text-muted-foreground font-mono">
                            + {toAmount.toFixed(toAccount.currency?.decimals ?? 2)} {toAccount.currency?.symbol}
                        </div>
                    )}

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-7 -mr-1 text-muted-foreground">
                                <MoreHorizontal className="size-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-36">
                            <DropdownMenuItem asChild>
                                <Link to={`/transactions/${transaction.id}/edit`}>
                                    <Pencil className="mr-2 size-4" />
                                    Edit
                                </Link>
                            </DropdownMenuItem>
                            {!isReadOnly && (
                                <>
                                    <DropdownMenuItem onClick={() => onDuplicate(transaction.id)}>
                                        <Copy className="mr-2 size-4" />
                                        Duplicate
                                    </DropdownMenuItem>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <DropdownMenuItem
                                                onSelect={(e) => e.preventDefault()}
                                                className="text-destructive focus:text-destructive"
                                            >
                                                <Trash2 className="mr-2 size-4" />
                                                Delete
                                            </DropdownMenuItem>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Delete transaction?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This action cannot be undone. This will permanently delete
                                                    this transaction and update account balances.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction
                                                    onClick={() => onDelete(transaction.id)}
                                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                >
                                                    Delete
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Expandable items if present */}
            {itemsExpanded && items && items.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-border/60 text-xs space-y-1.5">
                    {items.map((item, idx) => (
                        <div key={item.id ?? idx} className="flex justify-between items-center text-muted-foreground">
                            <span className="truncate flex-1 pr-2">{item.name}</span>
                            <span className="font-mono">{item.quantity} × {item.pricePerUnit.toFixed(decimals)}</span>
                            <span className="font-mono font-medium text-foreground ml-2">
                                {item.totalPrice.toFixed(decimals)} {account.currency?.symbol}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
