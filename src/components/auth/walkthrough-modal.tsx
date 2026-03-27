"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  User,
  Calendar,
  BarChart2,
  FileText,
  Bell,
  DollarSign,
  ChevronRight,
  ChevronLeft,
  X,
  Sparkles,
  Shield,
} from "lucide-react";

interface WalkthroughModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const steps = [
  {
    icon: Sparkles,
    gradient: "from-[#412003] to-[#C8622A]",
    iconBg: "bg-white/20",
    iconColor: "text-white",
    tag: "Welcome",
    tagColor: "bg-white/20 text-white",
    title: "Welcome to Thelix HRIS",
    subtitle: "Your HR portal is ready",
    description:
      "Manage your profile, track leave, view payslips, and stay connected with your team — all in one place.",
    dark: true,
  },
  {
    icon: User,
    gradient: "from-[#1a0a00] to-[#412003]",
    iconBg: "bg-[#C8622A]/20",
    iconColor: "text-[#C8622A]",
    tag: "Step 1",
    tagColor: "bg-[#C8622A]/15 text-[#C8622A]",
    title: "Your Profile",
    subtitle: "Keep your info up to date",
    description:
      "Visit My Profile to update your personal details, emergency contacts, and bank information.",
    dark: true,
  },
  {
    icon: Calendar,
    gradient: "from-[#412003] to-[#7a3010]",
    iconBg: "bg-white/20",
    iconColor: "text-white",
    tag: "Step 2",
    tagColor: "bg-white/20 text-white",
    title: "Leave Management",
    subtitle: "Time off made simple",
    description:
      "Apply for leave, track your balances, and view the status of your requests — all from the Leave section.",
    dark: true,
  },
  {
    icon: DollarSign,
    gradient: "from-[#1a0a00] to-[#412003]",
    iconBg: "bg-[#C8622A]/20",
    iconColor: "text-[#C8622A]",
    tag: "Step 3",
    tagColor: "bg-[#C8622A]/15 text-[#C8622A]",
    title: "Payslips & Compensation",
    subtitle: "Your earnings at a glance",
    description:
      "Access your monthly payslips and view your compensation breakdown under Payslips and My Profile → Compensation.",
    dark: true,
  },
  {
    icon: BarChart2,
    gradient: "from-[#412003] to-[#C8622A]",
    iconBg: "bg-white/20",
    iconColor: "text-white",
    tag: "Step 4",
    tagColor: "bg-white/20 text-white",
    title: "Performance & KPIs",
    subtitle: "Track your growth",
    description:
      "Track your goals and performance reviews under Performance Appraisals and KPI & OKR in the sidebar.",
    dark: true,
  },
  {
    icon: Bell,
    gradient: "from-[#1a0a00] to-[#412003]",
    iconBg: "bg-[#C8622A]/20",
    iconColor: "text-[#C8622A]",
    tag: "Step 5",
    tagColor: "bg-[#C8622A]/15 text-[#C8622A]",
    title: "Notifications",
    subtitle: "Stay in the loop",
    description:
      "Stay up to date with approvals, announcements, and updates via the Notifications bell in the top bar.",
    dark: true,
  },
  {
    icon: Shield,
    gradient: "from-[#412003] to-[#C8622A]",
    iconBg: "bg-white/20",
    iconColor: "text-white",
    tag: "All done!",
    tagColor: "bg-white/20 text-white",
    title: "You're all set! 🎉",
    subtitle: "Enjoy your experience",
    description:
      "That's a quick tour of your HR portal. If you ever need help, reach out to your HR administrator.",
    dark: true,
  },
];

export function WalkthroughModal({ isOpen, onClose }: WalkthroughModalProps) {
  const [step, setStep] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [direction, setDirection] = useState<"next" | "prev">("next");
  const [visible, setVisible] = useState(false);
  const prevStepRef = useRef(step);

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const current = steps[step];
  const Icon = current.icon;
  const isLast = step === steps.length - 1;
  const progress = ((step + 1) / steps.length) * 100;

  const handleClose = () => {
    localStorage.setItem("walkthroughSeen", "true");
    setVisible(false);
    setTimeout(() => {
      setStep(0);
      onClose();
    }, 300);
  };

  const goTo = (next: number, dir: "next" | "prev") => {
    if (animating) return;
    setDirection(dir);
    setAnimating(true);
    prevStepRef.current = step;
    setTimeout(() => {
      setStep(next);
      setAnimating(false);
    }, 220);
  };

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center p-4"
      style={{
        backgroundColor: visible ? "rgba(0,0,0,0.65)" : "rgba(0,0,0,0)",
        backdropFilter: visible ? "blur(6px)" : "blur(0px)",
        transition: "background-color 0.3s ease, backdrop-filter 0.3s ease",
      }}
    >
      {/* Card */}
      <div
        className="w-full max-w-sm overflow-hidden rounded-3xl shadow-2xl"
        style={{
          transform: visible ? "scale(1) translateY(0)" : "scale(0.92) translateY(24px)",
          opacity: visible ? 1 : 0,
          transition: "transform 0.35s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease",
        }}
      >
        {/* Hero section — gradient */}
        <div
          className={`relative bg-gradient-to-br ${current.gradient} px-8 pb-10 pt-8 text-white overflow-hidden`}
          style={{ transition: "background 0.4s ease" }}
        >
          {/* Decorative circles */}
          <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/5" />
          <div className="pointer-events-none absolute -left-4 bottom-0 h-24 w-24 rounded-full bg-white/5" />
          <div className="pointer-events-none absolute right-4 bottom-4 h-12 w-12 rounded-full bg-white/10" />

          {/* Top row */}
          <div className="relative flex items-center justify-between mb-8">
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold tracking-wide ${current.tagColor}`}
            >
              {current.tag}
            </span>
            <button
              onClick={handleClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/70 transition hover:bg-white/20 hover:text-white"
              aria-label="Skip tour"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Icon */}
          <div
            className="relative"
            style={{
              opacity: animating ? 0 : 1,
              transform: animating
                ? direction === "next"
                  ? "translateX(24px)"
                  : "translateX(-24px)"
                : "translateX(0)",
              transition: "opacity 0.22s ease, transform 0.22s ease",
            }}
          >
            <div
              className={`mb-5 flex h-16 w-16 items-center justify-center rounded-2xl ${current.iconBg}`}
            >
              <Icon className={`h-8 w-8 ${current.iconColor}`} />
            </div>

            <p className="text-xs font-medium uppercase tracking-widest text-white/50 mb-1">
              {current.subtitle}
            </p>
            <h3 className="text-2xl font-bold leading-tight text-white">
              {current.title}
            </h3>
          </div>

          {/* Progress bar — inside hero */}
          <div className="relative mt-6 h-1 rounded-full bg-white/20">
            <div
              className="h-full rounded-full bg-white transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="relative mt-1.5 flex justify-between text-[10px] text-white/40">
            <span>{step + 1} of {steps.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
        </div>

        {/* Body */}
        <div className="bg-white px-8 pb-7 pt-6">
          {/* Description */}
          <p
            className="text-sm leading-relaxed text-gray-500"
            style={{
              opacity: animating ? 0 : 1,
              transform: animating
                ? direction === "next"
                  ? "translateY(10px)"
                  : "translateY(-10px)"
                : "translateY(0)",
              transition: "opacity 0.22s ease, transform 0.22s ease",
            }}
          >
            {current.description}
          </p>

          {/* Step dots */}
          <div className="mt-5 flex justify-center gap-1.5">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => i !== step && goTo(i, i > step ? "next" : "prev")}
                aria-label={`Go to step ${i + 1}`}
                className="rounded-full transition-all duration-300"
                style={{
                  width: i === step ? "20px" : "8px",
                  height: "8px",
                  backgroundColor: i === step ? "#C8622A" : i < step ? "#C8622A55" : "#E5E7EB",
                }}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="mt-5 flex items-center gap-3">
            <button
              onClick={() => goTo(step - 1, "prev")}
              disabled={step === 0 || animating}
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-gray-200 text-gray-500 transition hover:border-gray-300 hover:bg-gray-50 disabled:invisible"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {isLast ? (
              <button
                onClick={handleClose}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white transition active:scale-[0.97]"
                style={{ backgroundColor: "#C8622A" }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#a84e1f")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#C8622A")}
              >
                Get Started
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={() => goTo(step + 1, "next")}
                disabled={animating}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white transition active:scale-[0.97]"
                style={{ backgroundColor: "#C8622A" }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#a84e1f")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#C8622A")}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>

          {step < steps.length - 1 && (
            <button
              onClick={handleClose}
              className="mt-4 w-full text-center text-xs text-gray-400 transition hover:text-gray-600"
            >
              Skip tour
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
