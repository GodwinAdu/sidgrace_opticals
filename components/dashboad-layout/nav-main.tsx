"use client"

import { Activity, Ambulance, Baby, BarChart3, BedDouble, BellRing, CalendarClock, ChevronRight, ClipboardList, Droplet, History, LucideMessagesSquare, MailCheck, Menu, Pill, ReceiptText, Scissors, Settings2Icon, Share2, ShoppingCart, Sparkles, Stethoscope, ThermometerIcon, Ticket, Trash, UploadCloudIcon, Users, Wallet, Wrench, } from "lucide-react"

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
      title: "Emergency / A&E",
      url: `/dashboard/emergency`,
      icon: Ambulance,
      isActive: false,
      roleField: "emergencyManagement"

    },
    {
      title: "Operating Theatre",
      url: `/dashboard/theatre`,
      icon: Scissors,
      isActive: false,
      roleField: "theatreManagement"

    },
    {
      title: "Maternity",
      url: `/dashboard/maternity`,
      icon: Baby,
      isActive: false,
      roleField: "maternityManagement"

    },
    {
      title: "Blood Bank",
      url: `/dashboard/blood-bank`,
      icon: Droplet,
      isActive: false,
      roleField: "bloodBankManagement"

    },
    {
      title: "Referrals",
      url: `/dashboard/referrals`,
      icon: Share2,
      isActive: false,
      roleField: "referralManagement"

    },
    {
      title: "Procurement",
      url: `/dashboard/procurement`,
      icon: ShoppingCart,
      isActive: false,
      roleField: "procurementManagement"

    },
    {
      title: "Equipment & Assets",
      url: `/dashboard/assets`,
      icon: Wrench,
      isActive: false,
      roleField: "assetManagement"

    },
    {
      title: "Order Entry (CPOE)",
      url: `/dashboard/cpoe`,
      icon: ClipboardList,
      isActive: false,
      roleField: "attPrescribe"

    },
    {
      title: "Queue & Transfers",
      url: `/dashboard/queue`,
      icon: Ticket,
      isActive: false,
      roleField: "opdManagement"

    },
    {
      title: "HR & Payroll",
      url: `/dashboard/hr`,
      icon: Wallet,
      isActive: false,
      roleField: "hrManagement"

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
          title: "Manage Staff",
          url: "/dashboard/manage-user/staff",
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
      title: "Accounting",
      url: "#",
      icon: Wallet,
      roleField: "accountManagement",
      items: [
        {
          title: "Accounts",
          url: "/dashboard/account/account-list",
          roleField: "accountManagement",
        },
        {
          title: "Journal Entries",
          url: "/dashboard/account/journal-entries",
          roleField: "accountingManagement",
        },
        {
          title: "General Ledger",
          url: "/dashboard/account/general-ledger",
          roleField: "accountingManagement",
        },
        {
          title: "Income Statement",
          url: "/dashboard/account/income-statement",
          roleField: "AccountReport",
        },
        {
          title: "Trial Balance",
          url: "/dashboard/account/trial-balance",
          roleField: "AccountReport",
        },
        {
          title: "Balance Sheet",
          url: "/dashboard/account/balance-sheet",
          roleField: "AccountReport",
        },
        {
          title: "Cash Flow",
          url: "/dashboard/account/cash-flow",
          roleField: "AccountReport",
        },
        {
          title: "Expense Workflow",
          url: "/dashboard/account/expense-workflow",
          roleField: "accountingManagement",
        },
        {
          title: "Approvals",
          url: "/dashboard/account/approvals",
          roleField: "accountingManagement",
        },
        {
          title: "Vendors",
          url: "/dashboard/account/vendors",
          roleField: "accountingManagement",
        },
        {
          title: "Budgets",
          url: "/dashboard/account/budgets",
          roleField: "accountingManagement",
        },
        {
          title: "Budget vs Actual",
          url: "/dashboard/account/budget-vs-actual",
          roleField: "accountingManagement",
        },
        {
          title: "Vendor Spend",
          url: "/dashboard/account/vendor-spend",
          roleField: "accountingManagement",
        },
        {
          title: "Settings",
          url: "/dashboard/account/settings",
          roleField: "accountingSettings",
        },
      ],
    },
    {
      title: "Billing",
      url: "#",
      icon: ReceiptText,
      items: [
        {
          title: "Invoices",
          url: "/dashboard/billing/invoices",
          roleField: "billingManagement",
        },
        {
          title: "Insurance",
          url: "/dashboard/billing/insurance",
          roleField: "insuranceManagement",
        },
        {
          title: "Claims",
          url: "/dashboard/billing/claims",
          roleField: "insuranceManagement",
        },
      ],
    },
    {
      title: "Inpatient",
      url: "#",
      icon: BedDouble,
      items: [
        {
          title: "Nursing",
          url: "/dashboard/nursing",
          roleField: "nursingDashboard",
        },
        {
          title: "Admissions",
          url: "/dashboard/admission",
          roleField: "admissionManagement",
        },
        {
          title: "Wards & Beds",
          url: "/dashboard/wards",
          roleField: "wardManagement",
        },
      ],
    },
    {
      title: "Patient Care",
      url: "#",
      icon: BellRing,
      items: [
        {
          title: "Recalls & Reminders",
          url: "/dashboard/recalls",
          roleField: "recallManagement",
        },
        {
          title: "Waitlist & No-Shows",
          url: "/dashboard/waitlist",
          roleField: "recallManagement",
        },
        {
          title: "Consent Forms",
          url: "/dashboard/consent",
          roleField: "clinicalManagement",
        },
        {
          title: "Patient 360 Portal",
          url: "/dashboard/portal",
          roleField: "portalAccess",
        },
      ],
    },
    {
      title: "Clinical",
      url: "#",
      icon: Stethoscope,
      items: [
        {
          title: "Clinical Records",
          url: "/dashboard/clinical",
          roleField: "dentalChartManagement",
        },
        {
          title: "Treatment Plans",
          url: "/dashboard/treatment-plans",
          roleField: "treatmentPlanManagement",
        },
        {
          title: "Procedure Catalog",
          url: "/dashboard/procedures",
          roleField: "procedureManagement",
        },
        {
          title: "Lab & Radiology",
          url: "/dashboard/lab",
          roleField: "labManagement",
        },
        {
          title: "Lab Cases",
          url: "/dashboard/lab-cases",
          roleField: "labManagement",
        },
      ],
    },
    // {
    //   title: "Sales",
    //   url: "#",
    //   icon: Sparkles,
    //   items: [
    //     {
    //       title: "Introduction",
    //       url: "#",
    //     },
    //     {
    //       title: "Get Started",
    //       url: "#",
    //     },
    //     {
    //       title: "Tutorials",
    //       url: "#",
    //     },
    //     {
    //       title: "Changelog",
    //       url: "#",
    //     },
    //   ],
    // },
    {
      title: "Messaging",
      url: "#",
      icon: MailCheck,
      roleField:"messaging",
      items: [
        // {
        //   title: "Emails",
        //   url: "/dashboard/messaging/emails",
        // },
        {
          title: "SMS",
          url: "/dashboard/messaging/sms",
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
      title: "Pharmacy",
      url: "#",
      icon: Pill,
      roleField: "pharmacyManagement",
      items: [
        {
          title: "Prescription Queue",
          url: "/dashboard/pharmacy",
          roleField: "pharmacyManagement",
        },
        {
          title: "Drug Inventory",
          url: "/dashboard/pharmacy/drugs",
          roleField: "pharmacyManagement",
        },
        {
          title: "Point of Sale",
          url: "/dashboard/pharmacy/pos",
          roleField: "pharmacyManagement",
        },
      ],
    },
    {
      title: "Operations",
      url: "#",
      icon: CalendarClock,
      items: [
        {
          title: "Staff Roster",
          url: "/dashboard/roster",
          roleField: "rosterManagement",
        },
        {
          title: "Audit Log",
          url: "/dashboard/audit-log",
          roleField: "history",
        },
        {
          title: "Branches",
          url: "/dashboard/branches",
          roleField: "branchManagement",
        },
      ],
    },
    // {
    //   title: "Operations",
    //   url: `/dashboard/ops`,
    //   icon: Activity,
    //   isActive: false,
    //   roleField: "reportManagement"
    // },
    {
      title: "Reports",
      url: `/dashboard/reports`,
      icon: BarChart3,
      isActive: false,
      roleField: "reportManagement"
    },
    {
      title: "Settings",
      url: `/dashboard/settings`,
      icon: Settings2Icon,
      isActive: false,
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
      <SidebarGroupLabel className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">Menu</SidebarGroupLabel>
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
                        "rounded-lg transition-all hover:bg-primary/10 hover:text-primary",
                        item.items?.some((subItem) => isActive(subItem.url)) && "bg-primary/10 text-primary font-semibold",
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
                    "rounded-lg transition-all hover:bg-primary/10 hover:text-primary",
                    isActive(item.url) && "bg-gradient-to-r from-teal-500 to-cyan-600 text-white font-semibold shadow-sm shadow-teal-500/30 hover:from-teal-600 hover:to-cyan-700 hover:text-white",
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
