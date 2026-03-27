"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useSocket } from "@/hooks/useSocket";
import { useMyProfile } from "@/hooks/useEmployees";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
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
  const { isAuthenticated, checkAuth, setProfile, viewAs, mustChangePassword, clearMustChangePassword } = useAuth();
  useSocket(); // Real-time notification listener

  // ── Force Change Password state ──
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);

  const handleForceChangePassword = async () => {
    setPwError(null);
    if (!currentPw || !newPw || !confirmPw) {
      setPwError("All fields are required.");
      return;
    }
    if (newPw.length < 8) {
      setPwError("New password must be at least 8 characters.");
      return;
    }
    if (newPw !== confirmPw) {
      setPwError("New passwords do not match.");
      return;
    }
    setPwLoading(true);
    try {
      await api.post("/auth/change-password", { currentPassword: currentPw, newPassword: newPw });
      toast.success("Password changed successfully!");
      clearMustChangePassword();
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    } catch (err: any) {
      setPwError(err?.response?.data?.message || "Failed to change password.");
    } finally {
      setPwLoading(false);
    }
  };

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

      {/* Force Change Password Modal */}
      <Modal
        isOpen={mustChangePassword}
        onClose={() => {}}
        title="Change Your Password"
        size="sm"
        footer={
          <div className="flex justify-end">
            <Button onClick={handleForceChangePassword} loading={pwLoading}>
              Change Password
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            For security purposes, you must change your password before continuing.
          </p>

          {pwError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {pwError}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Current Password</label>
            <div className="relative">
              <input
                type={showCurrentPw ? "text" : "password"}
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="Enter current password"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPw(!showCurrentPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showCurrentPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">New Password</label>
            <div className="relative">
              <input
                type={showNewPw ? "text" : "password"}
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="At least 8 characters"
              />
              <button
                type="button"
                onClick={() => setShowNewPw(!showNewPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Confirm New Password</label>
            <input
              type="password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="Re-enter new password"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
