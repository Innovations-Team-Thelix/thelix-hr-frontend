"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { ShieldCheck, ShieldX, Loader2, Award } from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

interface VerifyResult {
  valid: boolean;
  isExpired: boolean;
  certificate: {
    id: string;
    issuedAt: string;
    expiresAt: string | null;
    completedAt: string | null;
    courseTitle: string | null;
    employee: { fullName: string; jobTitle: string | null };
  };
}

function fmt(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function VerifyCertificatePage() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<"loading" | "valid" | "expired" | "invalid">("loading");
  const [result, setResult] = useState<VerifyResult | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch(`${API_URL}/lms/certificates/verify/${token}`);
        if (!res.ok) {
          if (active) setState("invalid");
          return;
        }
        const json = await res.json();
        const data: VerifyResult = json.data ?? json;
        if (!active) return;
        setResult(data);
        setState(data.isExpired ? "expired" : "valid");
      } catch {
        if (active) setState("invalid");
      }
    })();
    return () => {
      active = false;
    };
  }, [token]);

  return (
    <div className="min-h-dvh bg-gradient-to-b from-gray-50 to-gray-100 flex flex-col items-center justify-center px-4 py-12">
      <div className="mb-6 flex items-center gap-2">
        <Image src="/thelix1.png" alt="Thelix Holdings" width={44} height={44} className="rounded" />
        <span className="text-lg font-bold text-gray-900">Thelix Holdings</span>
      </div>

      <div className="w-full max-w-md rounded-2xl bg-white shadow-lg border border-gray-100 overflow-hidden">
        {/* Status banner */}
        <div
          className={`px-6 py-5 flex items-center gap-3 ${
            state === "valid"
              ? "bg-emerald-50"
              : state === "expired"
              ? "bg-amber-50"
              : state === "invalid"
              ? "bg-red-50"
              : "bg-gray-50"
          }`}
        >
          {state === "loading" && <Loader2 className="w-7 h-7 text-gray-400 animate-spin" />}
          {state === "valid" && <ShieldCheck className="w-7 h-7 text-emerald-600" />}
          {state === "expired" && <ShieldX className="w-7 h-7 text-amber-600" />}
          {state === "invalid" && <ShieldX className="w-7 h-7 text-red-600" />}
          <div>
            <p className="font-semibold text-gray-900">
              {state === "loading" && "Verifying certificate…"}
              {state === "valid" && "Certificate Verified"}
              {state === "expired" && "Certificate Expired"}
              {state === "invalid" && "Certificate Not Found"}
            </p>
            <p className="text-xs text-gray-500">
              {state === "valid" && "This is an authentic Thelix certificate."}
              {state === "expired" && "This certificate was valid but has since expired."}
              {state === "invalid" && "We couldn't verify this certificate ID."}
              {state === "loading" && "Please wait a moment."}
            </p>
          </div>
        </div>

        {/* Details */}
        {result && state !== "invalid" && (
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-100">
                <Award className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Awarded to</p>
                <p className="font-semibold text-gray-900">{result.certificate.employee.fullName}</p>
                {result.certificate.employee.jobTitle && (
                  <p className="text-xs text-gray-500">{result.certificate.employee.jobTitle}</p>
                )}
              </div>
            </div>

            <dl className="divide-y divide-gray-50 text-sm">
              {result.certificate.courseTitle && (
                <div className="flex justify-between py-2">
                  <dt className="text-gray-400">Course</dt>
                  <dd className="text-gray-800 font-medium text-right max-w-[60%]">{result.certificate.courseTitle}</dd>
                </div>
              )}
              <div className="flex justify-between py-2">
                <dt className="text-gray-400">Certificate ID</dt>
                <dd className="text-gray-800 font-medium">{result.certificate.id.slice(0, 8).toUpperCase()}</dd>
              </div>
              <div className="flex justify-between py-2">
                <dt className="text-gray-400">Completed</dt>
                <dd className="text-gray-800">{fmt(result.certificate.completedAt ?? result.certificate.issuedAt)}</dd>
              </div>
              {result.certificate.expiresAt && (
                <div className="flex justify-between py-2">
                  <dt className="text-gray-400">Valid until</dt>
                  <dd className="text-gray-800">{fmt(result.certificate.expiresAt)}</dd>
                </div>
              )}
            </dl>
          </div>
        )}
      </div>

      <p className="mt-6 text-xs text-gray-400">Powered by Thelix HRIS · Learning Management</p>
    </div>
  );
}
