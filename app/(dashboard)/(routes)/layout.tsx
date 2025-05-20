
import { AppSidebar } from "@/components/dashboad-layout/app-sidebar";
import FullScreenButton from "@/components/FullscreenButton";
import { ModeToggle } from "@/components/theme/mode-toggle";
import { Separator } from "@/components/ui/separator"
import {
    SidebarInset,
    SidebarProvider,
    SidebarTrigger,
} from "@/components/ui/sidebar"
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
                <header className="flex justify-between items-center w-full sticky top-0 z-50 bg-background h-16 border-b shrink-0 gap-2 shadow-md transition-[width,height] ease-linear">
                    <div className="flex items-center gap-2 px-4">
                        <SidebarTrigger className="-ml-1" />
                        <Separator orientation="vertical" className="mr-2 h-4" />
                    </div>
                    <div className="mr-5">
                        <div className="flex gap-5">
                            <FullScreenButton />
                            <ModeToggle />
                        </div>
                    </div>
                </header>
                <main className="px-4">
                    {children}
                </main>
            </SidebarInset>
        </SidebarProvider>
    );
}
