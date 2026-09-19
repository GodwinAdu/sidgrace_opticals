"use client";

import Link from "next/link";
import { Stethoscope } from "lucide-react";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";

export function SidebarBrand() {
    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <SidebarMenuButton size="lg" asChild className="hover:bg-sidebar-accent">
                    <Link href="/dashboard">
                        <div className="flex aspect-square size-9 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-md shadow-teal-500/30">
                            <Stethoscope className="size-5" />
                        </div>
                        <div className="grid flex-1 text-left leading-tight">
                            <span className="truncate text-sm font-bold">
                                Sid<span className="text-teal-500">Grace</span> Dental
                            </span>
                            <span className="truncate text-xs text-muted-foreground">Clinic Management</span>
                        </div>
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}
