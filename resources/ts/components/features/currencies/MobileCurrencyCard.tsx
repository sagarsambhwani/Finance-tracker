import { Link } from 'react-router-dom'
import { Currency } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
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
import { MoreHorizontal, Pencil, Trash2, Star, Coins } from 'lucide-react'

interface MobileCurrencyCardProps {
    currency: Currency
    onDelete: (id: number) => void
    onSetBase: (id: number) => void
    isSettingBase?: boolean
    currencyCount: number
    isReadOnly?: boolean
}

export function MobileCurrencyCard({
    currency,
    onDelete,
    onSetBase,
    isSettingBase,
    currencyCount,
    isReadOnly,
}: MobileCurrencyCardProps) {
    const isLast = currencyCount <= 1
    const cannotDelete = currency.isBase || isLast

    return (
        <div className="rounded-xl border bg-card p-4 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-start justify-between gap-3">
                {/* Left: Code, Name, Symbol */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="flex items-center justify-center size-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-sm shrink-0 font-mono">
                        {currency.symbol || <Coins className="size-5" />}
                    </div>
                    <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-base">{currency.code}</span>
                            {currency.isBase && (
                                <Badge variant="secondary" className="gap-1 text-[10px] px-1.5 py-0 h-4">
                                    <Star className="size-3 fill-current text-amber-500" />
                                    Base
                                </Badge>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{currency.name}</p>
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
                            <Link to={`/currencies/${currency.id}/edit`}>
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
                                            disabled={cannotDelete}
                                        >
                                            <Trash2 className="mr-2 size-4" />
                                            {isLast ? "Can't delete last" : 'Delete'}
                                        </DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Delete currency?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This action cannot be undone. The currency "{currency.name}" ({currency.code})
                                                will be permanently deleted.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction
                                                onClick={() => onDelete(currency.id)}
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

            {/* Bottom details: Rate, Decimals, Base toggle */}
            <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                    <span className="text-muted-foreground">Exchange Rate</span>
                    <p className="font-mono font-medium text-sm">
                        {currency.isBase ? '1.000000' : currency.rate.toFixed(6)}
                    </p>
                </div>

                <div className="space-y-0.5 text-center">
                    <span className="text-muted-foreground">Decimals</span>
                    <p className="font-mono font-medium text-sm">{currency.decimals}</p>
                </div>

                <div className="flex flex-col items-end gap-1">
                    <span className="text-muted-foreground">Base Currency</span>
                    <Switch
                        checked={currency.isBase}
                        disabled={currency.isBase || isSettingBase || isReadOnly}
                        onCheckedChange={() => onSetBase(currency.id)}
                    />
                </div>
            </div>
        </div>
    )
}
