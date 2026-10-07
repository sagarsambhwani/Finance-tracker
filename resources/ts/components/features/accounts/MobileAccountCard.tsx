import { Link } from 'react-router-dom'
import { Account } from '@/types'
import { ACCOUNT_TYPE_CONFIG } from '@/constants'
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
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MobileAccountCardProps {
    account: Account
    onDelete: (id: number) => void
    isReadOnly?: boolean
}

function formatBalance(amount: number, currency?: { symbol: string; decimals: number }) {
    if (!currency) return amount.toFixed(2)
    return `${currency.symbol}${amount.toFixed(currency.decimals)}`
}

export function MobileAccountCard({
    account,
    onDelete,
    isReadOnly,
}: MobileAccountCardProps) {
    const config = ACCOUNT_TYPE_CONFIG[account.type] ?? ACCOUNT_TYPE_CONFIG.bank
    const Icon = config.icon

    return (
        <div className="rounded-xl border bg-card p-4 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-start justify-between gap-3">
                {/* Left: Icon, Name & Type */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={cn('p-2.5 rounded-xl shrink-0', config.color)}>
                        <Icon className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center gap-2">
                            <p className="font-semibold text-sm truncate">{account.name}</p>
                            {!account.isActive && (
                                <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
                                    Inactive
                                </Badge>
                            )}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                                {config.label}
                            </Badge>
                            <span>·</span>
                            <span>{account.currency?.code ?? 'N/A'}</span>
                        </div>
                    </div>
                </div>

                {/* Right: Actions */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8 -mr-1 text-muted-foreground">
                            <MoreHorizontal className="size-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-36">
                        <DropdownMenuItem asChild>
                            <Link to={`/accounts/${account.id}/edit`}>
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
                                            <AlertDialogTitle>Delete account?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This action cannot be undone. The account "{account.name}"
                                                will be permanently deleted.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction
                                                onClick={() => onDelete(account.id)}
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

            {/* Bottom: Balances */}
            <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Current Balance</span>
                <div className="text-right">
                    <span className={cn(
                        'font-mono font-bold text-base',
                        account.currentBalance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    )}>
                        {formatBalance(account.currentBalance, account.currency)}
                    </span>
                    {account.initialBalance !== account.currentBalance && (
                        <p className="text-[11px] text-muted-foreground font-mono">
                            Initial: {formatBalance(account.initialBalance, account.currency)}
                        </p>
                    )}
                </div>
            </div>
        </div>
    )
}
