"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  UserCircle,
  CalendarDays,
  Building2,
  CalendarCheck,
  PartyPopper,
  FileSpreadsheet,
  DollarSign,
  Bell,
  Shield,
  ShieldAlert,
  BookOpen,
  Wallet,
  Receipt,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Clock,
  ClipboardCheck,
  BarChart3,
  Package,
  Eye,
  EyeOff,
  Target,
  Zap,
  ChevronDown,
  TrendingUp,
  FileEdit,
  Briefcase,
  GitBranch,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { getInitials as getNameInitials } from "@/lib/utils";
import { UserRole } from "@/types";

interface NavChild {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: UserRole[];
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: UserRole[];
  children?: NavChild[];
}

const kpiChildren: NavChild[] = [
  { label: "Dashboard",           href: "/kpi",            icon: BarChart3,      roles: ["Admin", "SBUHead", "Finance", "Employee"] },
  { label: "KPI List",            href: "/kpi/list",       icon: Target,         roles: ["Admin", "SBUHead", "Finance", "Employee"] },
  { label: "My OKRs",             href: "/kpi/my-okrs",    icon: Zap,            roles: ["Admin", "SBUHead", "Finance", "Employee"] },
  { label: "Team OKRs",           href: "/kpi/team-okrs",  icon: Users,          roles: ["Admin", "SBUHead", "Finance", "Employee"] },
  { label: "Cascade View",        href: "/kpi/cascade",    icon: GitBranch,      roles: ["Admin", "SBUHead", "Finance", "Employee"] },
  { label: "Cycles",              href: "/kpi/cycles",     icon: CalendarDays,   roles: ["Admin", "SBUHead"] },
  { label: "HR Review",           href: "/kpi/hr-review",  icon: Briefcase,      roles: ["Admin", "SBUHead", "Finance"] },
  { label: "Reports & Analytics", href: "/kpi/reports",    icon: TrendingUp,     roles: ["Admin", "SBUHead", "Finance", "Employee"] },
  { label: "KPI Dictionary",      href: "/kpi/dictionary", icon: FileEdit,       roles: ["Admin", "SBUHead", "Finance", "Employee"] },
];

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["Admin", "SBUHead"],
  },
  {
    label: "My Dashboard",
    href: "/employee-dashboard",
    icon: LayoutDashboard,
    roles: ["Finance", "Employee"],
  },
  {
    label: "Employees",
    href: "/employees",
    icon: Users,
    roles: ["Admin", "SBUHead", "Employee"],
  },
  {
    label: "SBU",
    href: "/sbus",
    icon: Building2,
    roles: ["Admin"],
  },
  {
    label: "My Profile",
    href: "/profile",
    icon: UserCircle,
    roles: ["Admin", "SBUHead", "Finance", "Employee"],
  },
  {
    label: "Leave",
    href: "/leave",
    icon: CalendarDays,
    roles: ["Admin", "SBUHead", "Finance", "Employee"],
  },
  {
    label: "Roster",
    href: "/roster",
    icon: CalendarCheck,
    roles: ["Admin", "SBUHead", "Finance", "Employee"],
  },
  {
    label: "My Attendance",
    href: "/attendance",
    icon: Clock,
    roles: ["Admin", "SBUHead", "Finance", "Employee"],
  },
  {
    label: "Attendance Approvals",
    href: "/attendance/approvals",
    icon: ClipboardCheck,
    roles: ["Admin", "SBUHead"],
  },
  {
    label: "Celebrations",
    href: "/celebrations",
    icon: PartyPopper,
    roles: ["Admin", "SBUHead", "Finance", "Employee"],
  },
  {
    label: "Reports",
    href: "/reports",
    icon: FileSpreadsheet,
    roles: ["Admin", "Finance", "SBUHead"],
  },
  {
    label: "KPI & Performance",
    href: "/kpi",
    icon: Target,
    roles: ["Admin", "SBUHead", "Finance", "Employee"],
    children: kpiChildren,
  },
  {
    label: "Attendance Reports",
    href: "/reports/attendance",
    icon: BarChart3,
    roles: ["Admin", "Finance", "SBUHead"],
  },
  {
    label: "Salary Analytics",
    href: "/reports/salary",
    icon: DollarSign,
    roles: ["Admin", "Finance"],
  },
  {
    label: "Discipline",
    href: "/discipline",
    icon: ShieldAlert,
    roles: ["Admin", "SBUHead"],
  },
  {
    label: "Assets",
    href: "/assets",
    icon: Package,
    roles: ["Admin", "SBUHead"],
  },
  {
    label: "Policy",
    href: "/policy",
    icon: BookOpen,
    roles: ["Admin", "SBUHead", "Finance", "Employee"],
  },
  {
    label: "Payroll",
    href: "/payroll",
    icon: Wallet,
    roles: ["Admin", "Finance"],
  },
  {
    label: "Payslips",
    href: "/payslips",
    icon: Receipt,
    roles: ["Admin", "Finance", "SBUHead", "Employee"],
  },
  {
    label: "Notifications",
    href: "/notifications",
    icon: Bell,
    roles: ["Admin", "SBUHead", "Finance", "Employee"],
  },
  {
    label: "Audit Logs",
    href: "/audit",
    icon: Shield,
    roles: ["Admin"],
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
    roles: ["Admin"],
  },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  onMobileClose?: () => void;
}

export function Sidebar({ collapsed, onToggle, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, profile, logout, viewAs, setViewAs } = useAuth();

  const displayName = profile?.fullName || "User";
  const displayRole = user?.role || "";

  const actualRole = user?.role;
  const canPreview = actualRole === "Admin" || actualRole === "SBUHead";
  const effectiveRole = (viewAs ?? actualRole) as UserRole | undefined;

  // Track which expandable sections are open; auto-open KPI if on a KPI route
  const isOnKpi = pathname.startsWith("/kpi");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    "/kpi": isOnKpi,
  });

  const filteredNavItems = navItems.filter(
    (item) => effectiveRole && item.roles.includes(effectiveRole)
  );

  const isActive = (href: string): boolean => {
    if (href === "/dashboard" || href === "/attendance") {
      return pathname === href;
    }
    // Exact match for /kpi (dashboard) so it doesn't stay active on sub-pages
    if (href === "/kpi") return pathname === "/kpi";
    return pathname === href || pathname.startsWith(href + "/");
  };

  const isGroupActive = (item: NavItem): boolean => {
    return pathname.startsWith(item.href);
  };

  const handleNavClick = () => {
    if (onMobileClose) onMobileClose();
  };

  const toggleExpanded = (href: string) => {
    setExpanded((prev) => ({ ...prev, [href]: !prev[href] }));
  };

  return (
    <aside
      className={cn(
        "flex h-full flex-col bg-white border-r border-gray-200 transition-all duration-300 ease-in-out",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "flex h-16 items-center border-b border-gray-200 px-4",
          collapsed ? "justify-center" : "gap-3"
        )}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-white font-bold text-sm">
          T
        </div>
        {!collapsed && (
          <span className="text-lg font-semibold text-primary truncate">
            Thelix HRIS
          </span>
        )}
      </div>

      {/* Employee Preview Banner */}
      {viewAs === 'Employee' && !collapsed && (
        <div className="mx-3 mt-2 flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2">
          <Eye className="h-3.5 w-3.5 shrink-0 text-amber-600" />
          <span className="text-xs font-medium text-amber-700">Employee Preview</span>
          <button
            onClick={() => setViewAs(null)}
            className="ml-auto text-xs text-amber-600 underline hover:text-amber-800"
          >
            Exit
          </button>
        </div>
      )}
      {viewAs === 'Employee' && collapsed && (
        <div className="mx-2 mt-2 flex justify-center rounded-lg bg-amber-50 border border-amber-300 py-1">
          <Eye className="h-4 w-4 text-amber-600" />
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        <ul className="space-y-0.5">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            const groupActive = isGroupActive(item);
            const hasChildren = item.children && item.children.length > 0;
            const isOpen = expanded[item.href] ?? false;

            // Filter children by role
            const visibleChildren = hasChildren
              ? item.children!.filter((c) => effectiveRole && c.roles.includes(effectiveRole))
              : [];

            return (
              <li key={item.href}>
                {hasChildren ? (
                  // Expandable group item
                  <>
                    <button
                      onClick={() => {
                        if (collapsed) return; // in collapsed mode, clicking navigates to base href
                        toggleExpanded(item.href);
                      }}
                      className={cn(
                        "group w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                        collapsed && "justify-center px-2",
                        groupActive
                          ? "bg-primary-50 text-primary-900 border-l-[3px] border-primary-900"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-l-[3px] border-transparent"
                      )}
                      title={collapsed ? item.label : undefined}
                    >
                      <Icon
                        className={cn(
                          "h-5 w-5 shrink-0 transition-colors",
                          groupActive ? "text-primary-900" : "text-gray-400 group-hover:text-gray-600"
                        )}
                      />
                      {!collapsed && (
                        <>
                          <span className="flex-1 truncate text-left">{item.label}</span>
                          <ChevronDown
                            className={cn(
                              "h-4 w-4 text-gray-400 transition-transform duration-200",
                              isOpen && "rotate-180"
                            )}
                          />
                        </>
                      )}
                    </button>

                    {/* Sub-menu */}
                    {!collapsed && isOpen && visibleChildren.length > 0 && (
                      <ul className="mt-0.5 ml-4 space-y-0.5 border-l-2 border-gray-100 pl-3">
                        {visibleChildren.map((child) => {
                          const ChildIcon = child.icon;
                          const childActive = isActive(child.href);
                          return (
                            <li key={child.href}>
                              <Link
                                href={child.href}
                                onClick={handleNavClick}
                                className={cn(
                                  "group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-all duration-150",
                                  childActive
                                    ? "bg-primary-50 text-primary-900 font-semibold"
                                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-800 font-medium"
                                )}
                              >
                                <ChildIcon
                                  className={cn(
                                    "h-4 w-4 shrink-0",
                                    childActive ? "text-primary-900" : "text-gray-400 group-hover:text-gray-600"
                                  )}
                                />
                                <span className="truncate">{child.label}</span>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}

                    {/* Collapsed: clicking the icon goes to the base href */}
                    {collapsed && (
                      <Link
                        href={item.href}
                        onClick={handleNavClick}
                        className="sr-only"
                        tabIndex={-1}
                      >
                        {item.label}
                      </Link>
                    )}
                  </>
                ) : (
                  // Regular nav item
                  <Link
                    href={item.href}
                    onClick={handleNavClick}
                    className={cn(
                      "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                      collapsed && "justify-center px-2",
                      active
                        ? "bg-primary-50 text-primary-900 border-l-[3px] border-primary-900"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-l-[3px] border-transparent"
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon
                      className={cn(
                        "h-5 w-5 shrink-0 transition-colors",
                        active ? "text-primary-900" : "text-gray-400 group-hover:text-gray-600"
                      )}
                    />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Info */}
      {user && (
        <div
          className={cn(
            "border-t border-gray-200 p-3",
            collapsed ? "flex flex-col items-center gap-2" : ""
          )}
        >
          <div
            className={cn(
              "flex items-center",
              collapsed ? "flex-col gap-2" : "gap-3"
            )}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-900 text-sm font-semibold">
              {getNameInitials(displayName)}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {displayName}
                </p>
                <p className="text-xs text-gray-500 truncate">{displayRole}</p>
              </div>
            )}
            {canPreview && (
              <button
                onClick={() => setViewAs(viewAs === 'Employee' ? null : 'Employee')}
                className={cn(
                  "shrink-0 rounded-lg p-1.5 transition-colors",
                  viewAs === 'Employee'
                    ? "text-amber-600 hover:bg-amber-50"
                    : "text-gray-400 hover:bg-gray-100 hover:text-gray-600",
                  collapsed && "mt-1"
                )}
                title={viewAs === 'Employee' ? `Exit Employee Preview (viewing as ${actualRole})` : "Preview as Employee"}
              >
                {viewAs === 'Employee' ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            )}
            <button
              onClick={logout}
              className={cn(
                "shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors",
                collapsed && "mt-1"
              )}
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Collapse Toggle */}
      <div className="border-t border-gray-200 p-2">
        <button
          onClick={onToggle}
          className="flex w-full items-center justify-center rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>
    </aside>
  );
}
