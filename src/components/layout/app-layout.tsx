"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useSocket } from "@/hooks/useSocket";
import { useMyProfile } from "@/hooks/useEmployees";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { ForcePasswordChangeModal } from "@/components/auth/force-password-change-modal";
import { WalkthroughModal } from "@/components/auth/walkthrough-modal";

// Routes accessible to Employee role
const EMPLOYEE_ALLOWED_PREFIXES = [
  "/employee-dashboard",
  "/employees",
  "/profile",
  "/leave",
  "/roster",
  "/attendance",
  "/celebrations",
  "/performance",
  "/kpi",
  "/policy",
  "/payslips",
  "/notifications",
  "/settings",
];

interface AppLayoutProps {
  children: React.ReactNode;
  pageTitle?: string;
}

export function AppLayout({ children, pageTitle }: AppLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, checkAuth, setProfile, viewAs } = useAuth();
  useSocket(); // Real-time notification listener

  const { data: profile } = useMyProfile({ enabled: isAuthenticated });
  useEffect(() => {
    if (profile) setProfile(profile);
  }, [profile, setProfile]);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [showWalkthrough, setShowWalkthrough] = useState(false);

  useEffect(() => {
    setMounted(true);
    checkAuth();
    if (typeof window !== "undefined") {
      const mustChange = localStorage.getItem("mustChangePassword") === "true";
      setMustChangePassword(mustChange);
      if (!mustChange && localStorage.getItem("walkthroughSeen") !== "true") {
        setShowWalkthrough(true);
      }
    }
  }, [checkAuth]);

  useEffect(() => {
    if (mounted && !isAuthenticated) {
      router.push("/login");
    }
  }, [mounted, isAuthenticated, router]);

  // Auto-redirect when switching to Employee view if current route is not accessible
  useEffect(() => {
    if (!viewAs) return;
    const isAllowed = EMPLOYEE_ALLOWED_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
    );
    if (!isAllowed) {
      router.push("/employee-dashboard");
    }
  }, [viewAs, pathname, router]);

  // Close mobile sidebar on window resize to desktop
  useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= 1024) {
        setMobileOpen(false);
      }
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const handleToggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, []);

  const handleMobileMenuToggle = useCallback(() => {
    setMobileOpen((prev) => !prev);
  }, []);

  const handleMobileClose = useCallback(() => {
    setMobileOpen(false);
  }, []);

  // Show nothing while checking auth to avoid flash
  if (!mounted || !isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-900" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={handleToggleSidebar}
        />
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity"
            onClick={handleMobileClose}
            aria-hidden="true"
          />
          {/* Sidebar panel */}
          <div className="fixed inset-y-0 left-0 z-50 w-52 animate-slide-in">
            <Sidebar
              collapsed={false}
              onToggle={handleToggleSidebar}
              onMobileClose={handleMobileClose}
            />
          </div>
        </div>
      )}

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          onMobileMenuToggle={handleMobileMenuToggle}
          pageTitle={pageTitle}
        />

        {/* Force password change on first login — cannot be dismissed */}
        <ForcePasswordChangeModal
          isOpen={mustChangePassword}
          onSuccess={() => {
            setMustChangePassword(false);
            setShowWalkthrough(true);
          }}
        />

        {/* Walkthrough tour — shown once after first password change */}
        <WalkthroughModal
          isOpen={!mustChangePassword && showWalkthrough}
          onClose={() => setShowWalkthrough(false)}
        />

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
