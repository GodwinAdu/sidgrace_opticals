"use client"

import { ChevronRight, History, LucideMessagesSquare, MailCheck, Menu, Settings2Icon, Sparkles, ThermometerIcon, Trash, UploadCloudIcon, Users, } from "lucide-react"

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
  SquareTerminal,
} from "lucide-react"
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface NavItem {
  title: string;
  url: string;
  icon?: React.ComponentType;
  roleField?: keyof IRole | string;
  isActive?: boolean;
  items?: NavItem[];
}


export function NavMain({ role }:{role:IRole}) {
  // const params = useParams();
  const pathname = usePathname();

  const [openGroup, setOpenGroup] = useState<string | null>(null)
  const navMain: (NavItem | false)[] = [
    {
      title: "Dashboard",
      url: `/dashboard`,
      icon: Menu,
      isActive: false,
      roleField: "dashboard"

    },
    {
      title: "OPD",
      url: `/dashboard/opd`,
      icon: ThermometerIcon,
      isActive: false,
      roleField: "opdManagement"

    },
    {
      title: "Attendance",
      url: `/dashboard/attendance`,
      icon: Users,
      isActive: false,
      roleField: "attendantManagement"

    },

    {
      title: "Manage Staff",
      url: "#",
      icon: SquareTerminal,
      isActive: true,
      roleField:"staffManagement",
      items: [
        {
          title: "Departments",
          url: "/dashboard/manage-user/department",
        },
        {
          title: "Manage Roles",
          url: "/dashboard/manage-user/manage-role",
        },
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
    {
      title: "Manage Patient",
      url: "#",
      icon: Bot,
      roleField:"patientManagement",
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
      isActive: false,
      roleField:"appointmentManagement"
    },
    {
      title: "Account",
      url: "#",
      icon: BookOpen,
      items: [
        {
          title: "Account List",
          url: "/dashboard/account/account-list",
        },
        {
          title: "Balance Sheet",
          url: "/dashboard/account/balance-sheet",
        },
        {
          title: "Trial Balance",
          url: "/dashboard/account/trial-balance",
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
      roleField:"messaging",
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
      title: "Reports",
      url: "#",
      icon: LucideMessagesSquare    ,
      roleField:"report",
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
          title: "Category",
          url: "/dashboard/inventory/category",
        },
        {
          title: "Stores",
          url: "/dashboard/inventory/stores",
        },
        {
          title: "Products",
          url: "/dashboard/inventory/products",
        },
        {
          title: "Purchase",
          url: "/dashboard/inventory/purchase",
        },
        {
          title: "Suppliers",
          url: "/dashboard/inventory/suppliers",
        },
      ],
    },
    {
      title: "History",
      url: `/dashboard/history`,
      icon: History,
      isActive: false,
      roleField: "history"

    },
    {
      title: "Trash",
      url: `/dashboard/trash`,
      icon: Trash,
      isActive: false,
      roleField: "trash"

    },
    {
      title: "Settings",
      url: `/dashboard/settings`,
      icon: Settings2Icon,
      isActive: false,
      roleField: "trash"

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
    [pathname]
  );

  // Automatically open collapsible if an item inside is active
  useEffect(() => {
    navMain.filter((group): group is NavItem => group !== false).forEach((group) => {
      if (group.items?.some((item) => isActive(item.url))) {
        setOpenGroup(group.title);
      }
    });
  }, [pathname]);

  return (
    <SidebarGroup className="scrollbar-hide">
      <SidebarGroupLabel>Nav links</SidebarGroupLabel>
      <SidebarMenu >
        {navMain
          .filter((item): item is NavItem => item !== false)
          .filter((item) => !item.roleField || (role && role[item.roleField as keyof IRole]))
          .map((item) =>
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
                        ?.filter((subItem) => !subItem?.roleField || (role && role[subItem?.roleField as keyof IRole]))
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
