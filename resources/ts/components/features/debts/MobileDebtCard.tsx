import { Link } from 'react-router-dom'
import { Debt } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
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
import { MoreHorizontal, Pencil, Trash2, HandCoins, Banknote, RotateCcw } from 'lucide-react'
import { formatAmount as sharedFormatAmount, formatDate, today } from '@/lib/utils'
import { cn } from '@/lib/utils'

const DEBT_TYPE_CONFIG = {
    i_owe: {
        icon: Banknote,
        color: 'bg-red-500/10 text-red-600 dark:text-red-400',
        textColor: 'text-red-600 dark:text-red-400',
        label: 'I Owe',
    },
    owed_to_me: {
        icon: HandCoins,
        color: 'bg-green-500/10 text-green-600 dark:text-green-400',
        textColor: 'text-green-600 dark:text-green-400',
        label: 'Owed to Me',
    },
}

function formatAmount(amount: number, currency?: { symbol: string; decimals: number }) {
    return sharedFormatAmount(amount, currency?.decimals ?? 2, currency?.symbol ?? '')
}

interface MobileDebtCardProps {
    debt: Debt
    onDelete: (id: number) => void
    onPayment: (debt: Debt) => void
    onCollect: (debt: Debt) => void
    onReopen: (id: number) => void
    isReadOnly?: boolean
}

export function MobileDebtCard({
    debt,
    onDelete,
    onPayment,
    onCollect,
    onReopen,
    isReadOnly,
}: MobileDebtCardProps) {
    const config = DEBT_TYPE_CONFIG[debt.debtType] ?? DEBT_TYPE_CONFIG.i_owe
    const Icon = config.icon
    const isOverdue = !debt.isPaidOff && debt.dueDate && debt.dueDate < today()

    return (
        <div className="rounded-xl border bg-card p-4 shadow-sm transition-all hover:shadow-md space-y-3">
            {/* Top row: Icon, Name & Actions */}
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={cn('p-2.5 rounded-xl shrink-0', config.color)}>
                        <Icon className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center gap-2">
                            <p className="font-semibold text-sm truncate">{debt.name}</p>
                            <Badge
                                variant={debt.isPaidOff ? 'default' : debt.isActive ? 'secondary' : 'outline'}
                                className="text-[10px] px-1.5 py-0 h-4"
                            >
                                {debt.isPaidOff ? 'Completed' : debt.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 h-4', config.textColor)}>
                                {config.label}
                            </Badge>
                            {debt.counterparty && (
                                <>
                                    <span>·</span>
                                    <span className="truncate">{debt.counterparty}</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8 -mr-1 text-muted-foreground">
                            <MoreHorizontal className="size-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                        {!isReadOnly && !debt.isPaidOff && (
                            <>
                                {debt.debtType === 'i_owe' ? (
                                    <DropdownMenuItem onClick={() => onPayment(debt)}>
                                        <Banknote className="mr-2 size-4" />
                                        Make Payment
                                    </DropdownMenuItem>
                                ) : (
                                    <DropdownMenuItem onClick={() => onCollect(debt)}>
                                        <HandCoins className="mr-2 size-4" />
                                        Collect Payment
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                            </>
                        )}
                        {!isReadOnly && debt.isPaidOff && (
                            <>
                                <DropdownMenuItem onClick={() => onReopen(debt.id)}>
                                    <RotateCcw className="mr-2 size-4" />
                                    Reopen
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                            </>
                        )}
                        <DropdownMenuItem asChild>
                            <Link to={`/debts/${debt.id}/edit`}>
                                <Pencil className="mr-2 size-4" />
                                Edit
                            </Link>
                        </DropdownMenuItem>
                        {!isReadOnly && (
                            <>
                                <DropdownMenuSeparator />
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
                                            <AlertDialogTitle>Delete debt?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This action cannot be undone. The debt "{debt.name}"
                                                will be permanently deleted.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction
                                                onClick={() => onDelete(debt.id)}
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

            {/* Middle: Progress Bar */}
            <div className="space-y-1.5 pt-0.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Paid: <span className="font-mono font-medium text-foreground">{formatAmount(debt.currentBalance, debt.currency)}</span></span>
                    <span className="font-mono font-medium text-foreground">{debt.paymentProgress.toFixed(0)}%</span>
                </div>
                <Progress value={debt.paymentProgress} className="h-2" />
            </div>

            {/* Bottom Row: Due date and Remaining debt */}
            <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs">
                <div>
                    {debt.dueDate ? (
                        <span className={cn('text-[11px]', isOverdue ? 'text-red-600 dark:text-red-400 font-medium' : 'text-muted-foreground')}>
                            {isOverdue ? 'Overdue: ' : 'Due: '}
                            {formatDate(debt.dueDate)}
                        </span>
                    ) : (
                        <span className="text-[11px] text-muted-foreground">No due date</span>
                    )}
                </div>

                <div className="text-right">
                    <span className="text-muted-foreground text-[11px] mr-1.5">Remaining:</span>
                    <span className={cn(
                        'font-mono font-bold text-sm',
                        debt.isPaidOff ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'
                    )}>
                        {debt.isPaidOff ? 'Paid Off' : formatAmount(debt.remainingDebt, debt.currency)}
                    </span>
                </div>
            </div>
        </div>
    )
}
