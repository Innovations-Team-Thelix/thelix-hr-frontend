"use client";

import React, { useState, useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Bell,
  Menu,
  ChevronRight,
  LogOut,
  UserCircle,
  Settings,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { getInitials as getNameInitials } from "@/lib/utils";
import { useUnreadNotificationCount, useNotifications, useMarkNotificationRead } from "@/hooks";

interface HeaderProps {
  onMobileMenuToggle: () => void;
  pageTitle?: string;
}

const pathTitleMap: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/employees": "Employees",
  "/profile": "My Profile",
  "/leave": "Leave Management",
  "/roster": "Roster",
  "/celebrations": "Celebrations",
  "/reports": "Reports",
  "/reports/salary": "Salary Analytics",
  "/audit": "Audit Logs",
  "/settings": "Settings",
};

function getPageTitle(pathname: string): string {
  if (pathTitleMap[pathname]) {
    return pathTitleMap[pathname];
  }

  // Try matching parent paths for nested routes
  const segments = pathname.split("/").filter(Boolean);
  for (let i = segments.length; i > 0; i--) {
    const parentPath = "/" + segments.slice(0, i).join("/");
    if (pathTitleMap[parentPath]) {
      return pathTitleMap[parentPath];
    }
  }

  // Fallback: capitalize the last segment
  const lastSegment = segments[segments.length - 1] || "Dashboard";
  return lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1);
}

function getBreadcrumbs(pathname: string): { label: string; href: string }[] {
  const segments = pathname.split("/").filter(Boolean);
  const crumbs: { label: string; href: string }[] = [];

  let currentPath = "";
  for (const segment of segments) {
    currentPath += "/" + segment;
    const label =
      pathTitleMap[currentPath] ||
      segment.charAt(0).toUpperCase() + segment.slice(1);
    crumbs.push({ label, href: currentPath });
  }

  return crumbs;
}

export function Header({ onMobileMenuToggle, pageTitle }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, logout } = useAuth();

  const displayName = profile?.fullName || "User";
  const displayEmail = profile?.workEmail || "";
  const displayRole = user?.role || "";
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const { data: unreadCount = 0 } = useUnreadNotificationCount();
  const { data: notifData } = useNotifications(1, 8);
  const recentNotifs = notifData?.data ?? [];
  const markRead = useMarkNotificationRead();

  const title = pageTitle || getPageTitle(pathname);
  const breadcrumbs = getBreadcrumbs(pathname);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    setShowUserMenu(false);
    logout();
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center border-b border-gray-200 bg-white px-4 sm:px-6">
      {/* Mobile hamburger */}
      <button
        onClick={onMobileMenuToggle}
        className="mr-3 rounded-lg p-2 text-gray-500 hover:bg-gray-100 lg:hidden"
        aria-label="Toggle sidebar"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Page title + breadcrumbs */}
      <div className="flex-1 min-w-0">
        {/* Breadcrumbs */}
        <nav className="hidden sm:flex items-center gap-1 text-xs text-gray-400 mb-0.5">
          <Link href="/" className="hover:text-gray-600 transition-colors">
            Home
          </Link>
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={crumb.href}>
              <ChevronRight className="h-3 w-3" />
              {index === breadcrumbs.length - 1 ? (
                <span className="text-gray-600 font-medium">
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className="hover:text-gray-600 transition-colors"
                >
                  {crumb.label}
                </Link>
              )}
            </React.Fragment>
          ))}
        </nav>

        {/* Title */}
        <h1 className="text-lg font-semibold text-gray-900 truncate">
          {title}
        </h1>
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-2">
        {/* Notification Bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100 transition-colors"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-danger-500 px-1 text-[10px] font-bold text-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-full mt-1 w-80 rounded-xl border border-gray-200 bg-white shadow-lg z-50 animate-fade-in">
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                <p className="text-sm font-semibold text-gray-900">Notifications</p>
                <Link
                  href="/notifications"
                  onClick={() => setShowNotifications(false)}
                  className="text-xs text-primary-600 hover:underline"
                >
                  View all
                </Link>
              </div>
              <div className="max-h-72 overflow-y-auto">
                {recentNotifs.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-gray-500">No notifications</p>
                ) : (
                  recentNotifs.map((n) => (
                    <div
                      key={n.id}
                      className={cn(
                        "flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors",
                        !n.sentAt && "bg-primary-50"
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        {n.title && (
                          <p className="text-xs font-medium text-gray-900 truncate">{n.title}</p>
                        )}
                        {n.message && (
                          <p className="text-xs text-gray-500 line-clamp-2">{n.message}</p>
                        )}
                        <p className="mt-0.5 text-[10px] text-gray-400">
                          {new Date(n.createdAt).toLocaleString()}
                        </p>
                      </div>
                      {!n.sentAt && (
                        <button
                          onClick={() => markRead.mutate(n.id)}
                          className="shrink-0 rounded p-1 text-gray-400 hover:text-primary-600 hover:bg-primary-100 transition-colors"
                          title="Mark as read"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Avatar Dropdown */}
        {user && (
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-gray-100 transition-colors"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-primary-900 text-sm font-semibold">
                {getNameInitials(displayName)}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-gray-900 leading-tight">
                  {displayName}
                </p>
                <p className="text-xs text-gray-500 leading-tight">
                  {displayRole}
                </p>
              </div>
            </button>

            {/* Dropdown menu */}
            {showUserMenu && (
              <div className="absolute right-0 top-full mt-1 w-56 rounded-xl border border-gray-200 bg-white py-1 shadow-lg animate-fade-in z-50">
                <div className="border-b border-gray-100 px-4 py-3">
                  <p className="text-sm font-medium text-gray-900">
                    {displayName}
                  </p>
                  <p className="text-xs text-gray-500">{displayEmail}</p>
                </div>

                <div className="py-1">
                  <Link
                    href="/profile"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <UserCircle className="h-4 w-4 text-gray-400" />
                    My Profile
                  </Link>
                  {displayRole === "Admin" && (
                    <Link
                      href="/settings"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <Settings className="h-4 w-4 text-gray-400" />
                      Settings
                    </Link>
                  )}
                </div>

                <div className="border-t border-gray-100 py-1">
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-danger-600 hover:bg-danger-50 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
