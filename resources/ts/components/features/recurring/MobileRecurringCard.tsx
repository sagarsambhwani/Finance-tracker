import { Link } from 'react-router-dom'
import { RecurringTransaction } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import { MoreHorizontal, Pencil, Trash2, SkipForward, ArrowDownLeft, ArrowUpRight, ArrowLeftRight } from 'lucide-react'
import { cn, formatDate, toDateString, today } from '@/lib/utils'

const typeConfig = {
    income: { icon: ArrowDownLeft, color: 'text-green-500 bg-green-500/10', label: 'Income' },
    expense: { icon: ArrowUpRight, color: 'text-red-500 bg-red-500/10', label: 'Expense' },
    transfer: { icon: ArrowLeftRight, color: 'text-blue-500 bg-blue-500/10', label: 'Transfer' },
}

const frequencyLabels: Record<string, string> = {
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
    yearly: 'Yearly',
}

interface MobileRecurringCardProps {
    recurring: RecurringTransaction
    onDelete: (id: number) => void
    onSkip: (id: number) => void
    isReadOnly?: boolean
}

export function MobileRecurringCard({
    recurring,
    onDelete,
    onSkip,
    isReadOnly,
}: MobileRecurringCardProps) {
    const config = typeConfig[recurring.type] ?? typeConfig.expense
    const Icon = config.icon

    const interval = recurring.interval
    const freq = frequencyLabels[recurring.frequency]
    const freqLabel = interval === 1 ? freq : `Every ${interval} ${freq?.toLowerCase()}`

    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const isToday = recurring.nextRunDate === today()
    const isTomorrow = recurring.nextRunDate === toDateString(tomorrow)

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
                            <p className="font-semibold text-sm truncate">
                                {recurring.description || config.label}
                            </p>
                            <Badge
                                variant={recurring.isActive ? 'default' : 'secondary'}
                                className="text-[10px] px-1.5 py-0 h-4"
                            >
                                {recurring.isActive ? 'Active' : 'Paused'}
                            </Badge>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span>{recurring.account.name}</span>
                            {recurring.type === 'transfer' && recurring.toAccount && (
                                <>
                                    <span>→</span>
                                    <span>{recurring.toAccount.name}</span>
                                </>
                            )}
                            {recurring.category && (
                                <>
                                    <span>·</span>
                                    <span>{recurring.category.icon} {recurring.category.name}</span>
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
                    <DropdownMenuContent align="end" className="w-36">
                        <DropdownMenuItem asChild>
                            <Link to={`/recurring/${recurring.id}/edit`}>
                                <Pencil className="mr-2 size-4" />
                                Edit
                            </Link>
                        </DropdownMenuItem>
                        {!isReadOnly && recurring.isActive && (
                            <DropdownMenuItem onClick={() => onSkip(recurring.id)}>
                                <SkipForward className="mr-2 size-4" />
                                Skip Next
                            </DropdownMenuItem>
                        )}
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
                                            <AlertDialogTitle>Delete recurring transaction?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This action cannot be undone. This recurring transaction will be
                                                permanently deleted. Existing transactions created from it will not be affected.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction
                                                onClick={() => onDelete(recurring.id)}
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

            {/* Bottom row: Frequency / Next run & Amount */}
            <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[11px] font-normal">
                        {freqLabel}
                    </Badge>
                    <span className={cn('text-[11px]', isToday && 'text-orange-500 font-medium')}>
                        Next: {isToday ? 'Today' : isTomorrow ? 'Tomorrow' : formatDate(recurring.nextRunDate)}
                    </span>
                </div>

                <div className="text-right">
                    <span className={cn(
                        'font-mono font-bold text-sm',
                        recurring.type === 'income' ? 'text-green-600 dark:text-green-400'
                        : recurring.type === 'expense' ? 'text-red-600 dark:text-red-400'
                        : 'text-blue-600 dark:text-blue-400'
                    )}>
                        {recurring.type === 'expense' && '-'}
                        {recurring.amount.toLocaleString()} {recurring.account.currency?.symbol || '€'}
                    </span>
                </div>
            </div>
        </div>
    )
}
