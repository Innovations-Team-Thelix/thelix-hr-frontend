"use client";

import React, { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import {
  Settings,
  Sun,
  Moon,
  Monitor,
  Lock,
  Bell,
  Eye,
  EyeOff,
  Loader2,
  Check,
  Shield,
  Globe,
  Palette,
  BellRing,
  BellOff,
  Mail,
  Smartphone,
} from "lucide-react";
import { AppLayout } from "@/components/layout/app-layout";
import { useAuth } from "@/hooks/useAuth";
import api from "@/lib/api";
import toast from "react-hot-toast";

type Theme = "light" | "dark" | "system";

interface NotifPrefs {
  emailLeave: boolean;
  emailPayroll: boolean;
  emailPerformance: boolean;
  emailAnnouncements: boolean;
  inAppLeave: boolean;
  inAppPayroll: boolean;
  inAppPerformance: boolean;
  inAppAnnouncements: boolean;
}

const NOTIF_KEY = "thelix_notif_prefs";

function loadNotifPrefs(): NotifPrefs {
  try {
    const raw = localStorage.getItem(NOTIF_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    emailLeave: true,
    emailPayroll: true,
    emailPerformance: true,
    emailAnnouncements: true,
    inAppLeave: true,
    inAppPayroll: true,
    inAppPerformance: true,
    inAppAnnouncements: true,
  };
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus:outline-none ${
        checked ? "bg-primary" : "bg-gray-200"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();

  // ── Theme (next-themes) ──
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const applyTheme = (t: Theme) => {
    setTheme(t);
    toast.success(`Theme set to ${t}`);
  };

  // ── Change Password ──
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPw || !newPw || !confirmPw) {
      toast.error("All password fields are required.");
      return;
    }
    if (newPw.length < 8) {
      toast.error("New password must be at least 8 characters.");
      return;
    }
    if (newPw !== confirmPw) {
      toast.error("New passwords do not match.");
      return;
    }
    setPwLoading(true);
    try {
      await api.post("/auth/change-password", { currentPassword: currentPw, newPassword: newPw });
      toast.success("Password changed successfully.");
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to change password.");
    } finally {
      setPwLoading(false);
    }
  };

  // ── Notifications ──
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>(loadNotifPrefs);

  const updateNotif = (key: keyof NotifPrefs, val: boolean) => {
    const updated = { ...notifPrefs, [key]: val };
    setNotifPrefs(updated);
    localStorage.setItem(NOTIF_KEY, JSON.stringify(updated));
    toast.success("Notification preference saved.");
  };

  const themeOptions: { value: Theme; label: string; icon: React.ElementType; desc: string }[] = [
    { value: "light", label: "Light", icon: Sun, desc: "Always use light mode" },
    { value: "dark", label: "Dark", icon: Moon, desc: "Always use dark mode" },
    { value: "system", label: "System", icon: Monitor, desc: "Follow device preference" },
  ];

  const notifRows: { key: keyof NotifPrefs; label: string; channel: "email" | "inApp" }[] = [
    { key: "emailLeave", label: "Leave requests & approvals", channel: "email" },
    { key: "emailPayroll", label: "Payroll & payslips", channel: "email" },
    { key: "emailPerformance", label: "Performance reviews", channel: "email" },
    { key: "emailAnnouncements", label: "Company announcements", channel: "email" },
    { key: "inAppLeave", label: "Leave requests & approvals", channel: "inApp" },
    { key: "inAppPayroll", label: "Payroll & payslips", channel: "inApp" },
    { key: "inAppPerformance", label: "Performance reviews", channel: "inApp" },
    { key: "inAppAnnouncements", label: "Company announcements", channel: "inApp" },
  ];

  return (
    <AppLayout pageTitle="Settings">
      <div className="space-y-6 max-w-3xl">

        {/* Page header */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100">
            <Settings className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Settings</h1>
            <p className="text-sm text-gray-500">Manage your preferences and account security</p>
          </div>
        </div>

        {/* ── Appearance ── */}
        <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4">
            <Palette className="h-4 w-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-900">Appearance</h2>
          </div>
          <div className="p-5">
            <p className="mb-4 text-sm text-gray-500">Choose how Thelix HRIS looks for you.</p>
            <div className="grid grid-cols-3 gap-3">
              {themeOptions.map(({ value, label, icon: Icon, desc }) => {
                const isActive = mounted && theme === value;
                return (
                  <button
                    key={value}
                    onClick={() => applyTheme(value)}
                    className={`relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center transition-all ${
                      isActive
                        ? "border-primary bg-primary-50 text-primary-900"
                        : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {isActive && (
                      <span className="absolute right-2.5 top-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary">
                        <Check className="h-2.5 w-2.5 text-white" />
                      </span>
                    )}
                    <Icon className={`h-6 w-6 ${isActive ? "text-primary" : "text-gray-400"}`} />
                    <span className="text-xs font-semibold">{label}</span>
                    <span className="text-[10px] text-gray-400 leading-tight">{desc}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Change Password ── */}
        <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4">
            <Lock className="h-4 w-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-900">Change Password</h2>
          </div>
          <form onSubmit={handleChangePassword} className="p-5 space-y-4">
            <p className="text-sm text-gray-500">Keep your account secure by using a strong, unique password.</p>

            {/* Current password */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-700">Current Password</label>
              <div className="relative">
                <input
                  type={showCurrent ? "text" : "password"}
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 pr-10 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* New password */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-700">New Password</label>
                <div className="relative">
                  <input
                    type={showNew ? "text" : "password"}
                    value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
                    placeholder="Min. 8 characters"
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 pr-10 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {newPw && (
                  <div className="mt-1.5 flex gap-1">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${
                        newPw.length >= [4, 6, 8, 12][i]
                          ? ["bg-red-400", "bg-amber-400", "bg-primary", "bg-green-500"][i]
                          : "bg-gray-200"
                      }`} />
                    ))}
                  </div>
                )}
              </div>

              {/* Confirm password */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-700">Confirm New Password</label>
                <div className="relative">
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={confirmPw}
                    onChange={(e) => setConfirmPw(e.target.value)}
                    placeholder="Re-enter new password"
                    className={`w-full rounded-lg border bg-white px-3 py-2.5 pr-10 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 ${
                      confirmPw && confirmPw !== newPw
                        ? "border-red-400 focus:border-red-400 focus:ring-red-200"
                        : "border-gray-300 focus:border-primary focus:ring-primary/20"
                    }`}
                  />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {confirmPw && confirmPw !== newPw && (
                  <p className="mt-1 text-xs text-red-500">Passwords do not match</p>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={pwLoading}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-600 disabled:opacity-60"
              >
                {pwLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                {pwLoading ? "Updating..." : "Update Password"}
              </button>
            </div>
          </form>
        </section>

        {/* ── Notification Preferences ── */}
        <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4">
            <Bell className="h-4 w-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-900">Notification Preferences</h2>
          </div>
          <div className="p-5 space-y-5">
            {/* Email notifications */}
            <div>
              <div className="mb-3 flex items-center gap-2">
                <Mail className="h-4 w-4 text-gray-400" />
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Email Notifications</p>
              </div>
              <div className="divide-y divide-gray-100 rounded-xl border border-gray-100">
                {notifRows.filter(r => r.channel === "email").map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-gray-700">{label}</span>
                    <Toggle checked={notifPrefs[key]} onChange={(v) => updateNotif(key, v)} />
                  </div>
                ))}
              </div>
            </div>

            {/* In-app notifications */}
            <div>
              <div className="mb-3 flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-gray-400" />
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">In-App Notifications</p>
              </div>
              <div className="divide-y divide-gray-100 rounded-xl border border-gray-100">
                {notifRows.filter(r => r.channel === "inApp").map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-gray-700">{label}</span>
                    <Toggle checked={notifPrefs[key]} onChange={(v) => updateNotif(key, v)} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Account Info ── */}
        <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4">
            <Globe className="h-4 w-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-900">Account Information</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {[
              { label: "Email", value: user?.email ?? "—" },
              { label: "Role", value: user?.role ?? "—" },
              { label: "Account Status", value: "Active" },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between px-5 py-3.5">
                <span className="text-sm text-gray-500">{label}</span>
                <span className="text-sm font-medium text-gray-900">{value}</span>
              </div>
            ))}
          </div>
        </section>

      </div>
    </AppLayout>
  );
}
