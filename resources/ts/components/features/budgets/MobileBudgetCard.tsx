import { Link } from 'react-router-dom'
import { Budget } from '@/types'
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
import { MoreHorizontal, Pencil, Trash2, PiggyBank } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MobileBudgetCardProps {
    budget: Budget
    onDelete: (id: number) => void
    isReadOnly?: boolean
}

const periodLabels: Record<string, string> = {
    weekly: 'Weekly',
    monthly: 'Monthly',
    yearly: 'Yearly',
    one_time: 'One-time',
}

export function MobileBudgetCard({
    budget,
    onDelete,
    isReadOnly,
}: MobileBudgetCardProps) {
    const { name, isGlobal, categories, amount, period, progress, isActive, currency } = budget
    const symbol = currency?.symbol ?? ''
    const isExceeded = progress?.is_exceeded ?? false
    const percent = Math.min(progress?.percent ?? 0, 100)

    return (
        <div className="rounded-xl border bg-card p-4 shadow-sm transition-all hover:shadow-md space-y-3">
            {/* Top row: Name, Badges & Actions */}
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={cn(
                        'p-2.5 rounded-xl shrink-0',
                        isExceeded
                            ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                            : 'bg-primary/10 text-primary'
                    )}>
                        <PiggyBank className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center gap-2">
                            <p className="font-semibold text-sm truncate">{name}</p>
                            <Badge variant={isActive ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0 h-4">
                                {isActive ? 'Active' : 'Inactive'}
                            </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                            {isGlobal
                                ? 'All expenses'
                                : categories.map((c) => c.name).join(', ') || 'No categories'}
                        </p>
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
                            <Link to={`/budgets/${budget.id}/edit`}>
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
                                            <AlertDialogTitle>Delete budget?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This action cannot be undone. The budget "{name}"
                                                will be permanently deleted.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction
                                                onClick={() => onDelete(budget.id)}
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

            {/* Middle: Limit & Period */}
            <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Limit:</span>
                    <span className="font-mono font-semibold text-foreground">
                        {amount.toLocaleString()} {symbol}
                    </span>
                </div>
                <Badge variant="outline" className="text-[11px] font-normal">
                    {periodLabels[period] || period}
                </Badge>
            </div>

            {/* Bottom: Progress Bar & Spent info */}
            {progress && (
                <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">
                            <span className="font-medium text-foreground">{progress.spent.toLocaleString()} {symbol}</span> spent
                        </span>
                        <span className={cn('font-mono font-medium', isExceeded ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground')}>
                            {progress.percent.toFixed(0)}%
                        </span>
                    </div>

                    <Progress
                        value={percent}
                        className={cn('h-2', isExceeded && '[&>div]:bg-red-500')}
                    />

                    <p className={cn(
                        'text-[11px]',
                        isExceeded ? 'text-red-600 dark:text-red-400 font-medium' : 'text-muted-foreground'
                    )}>
                        {isExceeded
                            ? `Exceeded by ${(progress.spent - amount).toLocaleString()} ${symbol}`
                            : `${progress.remaining.toLocaleString()} ${symbol} remaining`}
                    </p>
                </div>
            )}
        </div>
    )
}
