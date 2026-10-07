import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Home, Receipt, Plus, CreditCard, Menu, ArrowDownLeft, ArrowUpRight, ArrowLeftRight } from 'lucide-react'
import { useSidebar } from '@/components/ui/sidebar'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

export function MobileNav() {
    const location = useLocation()
    const navigate = useNavigate()
    const { toggleSidebar } = useSidebar()

    const isActive = (path: string) => {
        if (path === '/') return location.pathname === '/'
        return location.pathname.startsWith(path)
    }

    const handleCreateTransaction = (type: 'income' | 'expense' | 'transfer') => {
        navigate(`/transactions/create?type=${type}`)
    }

    return (
        <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-background/95 backdrop-blur border-t border-border shadow-lg supports-[backdrop-filter]:bg-background/80">
            <div className="flex h-16 items-center justify-around px-2">
                {/* Home */}
                <NavLink
                    to="/"
                    className={cn(
                        'flex flex-col items-center justify-center flex-1 py-1 text-xs font-medium transition-colors',
                        isActive('/') && location.pathname === '/'
                            ? 'text-primary'
                            : 'text-muted-foreground hover:text-foreground'
                    )}
                >
                    <Home className="size-5 mb-1" />
                    <span>Home</span>
                </NavLink>

                {/* Transactions */}
                <NavLink
                    to="/transactions"
                    className={cn(
                        'flex flex-col items-center justify-center flex-1 py-1 text-xs font-medium transition-colors',
                        isActive('/transactions')
                            ? 'text-primary'
                            : 'text-muted-foreground hover:text-foreground'
                    )}
                >
                    <Receipt className="size-5 mb-1" />
                    <span>Activity</span>
                </NavLink>

                {/* Quick Add Floating Button */}
                <div className="flex flex-col items-center justify-center flex-1 py-1">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button
                                type="button"
                                aria-label="Add transaction"
                                className="size-11 rounded-full bg-primary text-primary-foreground shadow-md flex items-center justify-center active:scale-95 transition-transform cursor-pointer"
                            >
                                <Plus className="size-6" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="center" side="top" sideOffset={12} className="w-48">
                            <DropdownMenuItem onClick={() => handleCreateTransaction('income')}>
                                <ArrowDownLeft className="size-4 mr-2 text-green-600" />
                                New Income
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleCreateTransaction('expense')}>
                                <ArrowUpRight className="size-4 mr-2 text-red-600" />
                                New Expense
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleCreateTransaction('transfer')}>
                                <ArrowLeftRight className="size-4 mr-2 text-blue-600" />
                                New Transfer
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {/* Accounts */}
                <NavLink
                    to="/accounts"
                    className={cn(
                        'flex flex-col items-center justify-center flex-1 py-1 text-xs font-medium transition-colors',
                        isActive('/accounts')
                            ? 'text-primary'
                            : 'text-muted-foreground hover:text-foreground'
                    )}
                >
                    <CreditCard className="size-5 mb-1" />
                    <span>Accounts</span>
                </NavLink>

                {/* Menu / Drawer */}
                <button
                    type="button"
                    onClick={toggleSidebar}
                    className="flex flex-col items-center justify-center flex-1 py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    aria-label="Open navigation menu"
                >
                    <Menu className="size-5 mb-1" />
                    <span>Menu</span>
                </button>
            </div>
        </div>
    )
}
