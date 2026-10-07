import { Outlet } from 'react-router-dom'
import { AppSidebar } from './Sidebar'
import { Header } from './Header'
import { MobileNav } from './MobileNav'
import { ReadOnlyBanner } from './ReadOnlyBanner'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { useUiStore } from '@/stores/ui'

export function AppLayout() {
    const sidebarOpen = useUiStore((state) => state.sidebarOpen)
    const setSidebarOpen = useUiStore((state) => state.setSidebarOpen)

    return (
        <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <AppSidebar />
            <SidebarInset className="min-h-screen flex flex-col min-w-0 max-w-full overflow-x-hidden">
                <ReadOnlyBanner />
                <Header />
                <main className="flex-1 overflow-y-auto overflow-x-hidden min-w-0 max-w-full p-4 sm:p-6 pb-24 md:pb-6">
                    <Outlet />
                </main>
                <MobileNav />
            </SidebarInset>
        </SidebarProvider>
    )
}

