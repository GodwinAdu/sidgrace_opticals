import { AppSidebar } from "@/components/dashboad-layout/app-sidebar";
import FullScreenButton from "@/components/FullscreenButton";
import { ModeToggle } from "@/components/theme/mode-toggle";
import { GlobalSearch } from "@/components/dashboad-layout/global-search";
import { NotificationBell } from "@/components/dashboad-layout/notification-bell";
import { Separator } from "@/components/ui/separator";
import {
    SidebarInset,
    SidebarProvider,
    SidebarTrigger,
} from "@/components/ui/sidebar";
import { currentUserRole } from "@/lib/helpers/current-role";
import { currentUser } from "@/lib/helpers/current-user";

export default async function DashboardLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {

    const [user, role] = await Promise.all([
        currentUser(),
        currentUserRole(),
    ]);

    return (
        <SidebarProvider>
            <AppSidebar userRole={role as IRole} user={user} />
            <SidebarInset>
                <header className="flex justify-between items-center w-full sticky top-0 z-50 h-16 border-b border-border/60 shrink-0 gap-2 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 transition-[width,height] ease-linear">
                    <div className="flex items-center gap-2 px-4">
                        <SidebarTrigger className="-ml-1" />
                        <Separator orientation="vertical" className="mr-2 h-4" />
                        <GlobalSearch />
                    </div>
                    <div className="mr-5">
                        <div className="flex items-center gap-4">
                            <NotificationBell />
                            <FullScreenButton />
                            <ModeToggle />
                        </div>
                    </div>
                </header>
                <main className="mx-auto w-full max-w-[1600px] px-4 py-4 sm:px-6">
                    {children}
                </main>
            </SidebarInset>
        </SidebarProvider>
    );
}
