"use client"

import { ChevronRight, HospitalIcon, MailCheck, Menu, Sparkles, ThermometerIcon, UploadCloudIcon, Users, } from "lucide-react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import {

  BookOpen,
  Bot,
  Settings2,
  SquareTerminal,
} from "lucide-react"
import { usePermissions } from "@/hooks/dashboard-provider";
import { useParams, usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function NavMain() {
  const { can } = usePermissions()
  const params = useParams();
  const pathname = usePathname();

  const [openGroup, setOpenGroup] = useState<string | null>(null)
  const navMain = [
    {
      title: "Dashboard",
      url: `/dashboard`,
      icon: Menu,
      isActive: false,

    },
    {
      title: "OPD",
      url: `/dashboard/opd`,
      icon: ThermometerIcon,
      isActive: false,

    },
    {
      title: "Attendance",
      url: `/dashboard/attendance`,
      icon: Users,
      isActive: false,

    },
   
    can('manage_user') && {
      title: "Manage Staff",
      url: "#",
      icon: SquareTerminal,
      isActive: true,
      items: [
        {
          title: "Add Bulk Staff",
          url: "/dashboard/manage-user/add-bulk",
        },
        {
          title: "Manage Staff",
          url: "/dashboard/manage-user/staff",
        },
        {
          title: "Staff List",
          url: "/dashboard/manage-user/staff-list",
        },
      ],
    },
    can('manage_patient') && {
      title: "Manage Patient",
      url: "#",
      icon: Bot,
      items: [
        {
          title: "Add Bulks",
          url: "/dashboard/manage-patient/add-bulk",
        },
        {
          title: "Manage Patient",
          url: "/dashboard/manage-patient/patients",
        },
        {
          title: "Patient Lists",
          url: "/dashboard/manage-patient/patient-list",
        },
      ],
    },
    {
      title: "Appointment",
      url: "/dashboard/appointments",
      icon: BookOpen,
      isActive:false
    },
    {
      title: "Billing",
      url: "#",
      icon: BookOpen,
      items: [
        {
          title: "Introduction",
          url: "#",
        },
        {
          title: "Get Started",
          url: "#",
        },
        {
          title: "Tutorials",
          url: "#",
        },
        {
          title: "Changelog",
          url: "#",
        },
      ],
    },
    {
      title: "Sales",
      url: "#",
      icon: Sparkles,
      items: [
        {
          title: "Introduction",
          url: "#",
        },
        {
          title: "Get Started",
          url: "#",
        },
        {
          title: "Tutorials",
          url: "#",
        },
        {
          title: "Changelog",
          url: "#",
        },
      ],
    },
    {
      title: "Messaging",
      url: "#",
      icon: MailCheck,
      items: [
        {
          title: "Emails",
          url: "/dashboard/messaging/emails",
        },
        {
          title: "SMS",
          url: "/dashboard/messaging/sms",
        },
      ],
    },
    {
      title: "Analytics",
      url: "#",
      icon: UploadCloudIcon,
      items: [
        {
          title: "Introduction",
          url: "#",
        },
        {
          title: "Get Started",
          url: "#",
        },
        {
          title: "Tutorials",
          url: "#",
        },
        {
          title: "Changelog",
          url: "#",
        },
      ],
    },
    {
      title: "Inventory",
      url: "#",
      icon: UploadCloudIcon,
      items: [
        {
          title: "Manage Inventory",
          url: "/dashboard/manage-inventory/inventory",
        },
      ],
    },
    {
      title: "Settings",
      url: "#",
      icon: Settings2,
      items: [
        {
          title: "General",
          url: "#",
        },
        {
          title: "Team",
          url: "#",
        },
        {
          title: "Billing",
          url: "#",
        },
        {
          title: "Limits",
          url: "#",
        },
      ],
    },
  ];

  const isActive = useCallback(
    (url: string) => {
      const dashboardPath = `/dashboard`;

      if (pathname === dashboardPath || pathname === `${dashboardPath}/`) {
        return url === pathname; // Only activate when it exactly matches the dashboard
      }

      return pathname.startsWith(url) && url !== dashboardPath;
    },
    [pathname, ]
  );

  // Automatically open collapsible if an item inside is active
  useEffect(() => {
    navMain.filter((group): group is Exclude<typeof group, false> => group !== false).forEach((group) => {
      if (group.items?.some((item) => isActive(item.url))) {
        setOpenGroup(group.title);
      }
    });
  }, [pathname]);

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Platform</SidebarGroupLabel>
      <SidebarMenu>
        {navMain.filter((item): item is Exclude<typeof item, false> => Boolean(item)).map((item) =>
            item.items ? (
              <Collapsible
                key={item.title}
                open={openGroup === item.title}
                onOpenChange={() => setOpenGroup((prev) => (prev === item.title ? null : item.title))}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      tooltip={item.title}
                      className={cn(
                        "transition-colors hover:bg-primary/10 hover:text-primary",
                        item.items?.some((subItem) => isActive(subItem.url)) && "bg-primary text-white font-medium",
                      )}
                    >
                      {item.icon && <item.icon />}
                      <span>{item.title}</span>
                      <ChevronRight
                        className={`ml-auto shrink-0 transition-transform duration-200 ${openGroup === item.title ? "rotate-90" : ""}`}
                      />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.items
                        .map((subItem) => (
                          <SidebarMenuSubItem key={subItem.title}>
                            <SidebarMenuSubButton
                              asChild
                              className={cn(
                                "transition-colors hover:text-primary",
                                isActive(subItem.url) && "bg-primary/10 text-primary font-medium",
                              )}
                            >
                              <Link href={subItem.url}>
                                <span>{subItem.title}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            ) : (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  tooltip={item.title}
                  className={cn(
                    "transition-colors hover:bg-primary/10 hover:text-primary",
                    isActive(item.url) && "bg-primary text-white font-medium",
                  )}
                >
                  <Link href={item.url}>
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ),
          )}
      </SidebarMenu>
    </SidebarGroup>
  )
}
