"use client";

import { AppLayout } from "@/components/layout/app-layout";
import { useMyCertificates, useDownloadCertificate } from "@/hooks";
import { Award, Download, QrCode, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/loading";
import { formatDate } from "@/lib/utils";

export default function CertificatesPage() {
  const { data: certificates, isLoading } = useMyCertificates();
  const download = useDownloadCertificate();

  const openVerify = (token: string) => {
    window.open(`${window.location.origin}/verify-certificate/${token}`, "_blank", "noopener");
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Award className="w-6 h-6 text-amber-500" />
            My Certificates
          </h1>
          <p className="text-gray-500 text-sm mt-1">Certificates you have earned by completing courses.</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-40" />)}
          </div>
        ) : !certificates || (certificates as any[]).length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Award className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No certificates yet. Complete a course to earn one!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(certificates as any[]).map((cert) => (
              <Card key={cert.id} className="border-2 border-amber-200 bg-amber-50/30">
                <CardContent className="p-6 flex items-start gap-4">
                  <div className="p-3 bg-amber-100 rounded-xl">
                    <Award className="w-8 h-8 text-amber-500" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="font-semibold text-gray-900 text-sm">Certificate of Completion</p>
                    <p className="text-xs text-gray-400">ID: {cert.id.slice(0, 8).toUpperCase()}</p>
                    <p className="text-xs text-gray-500">Issued: {formatDate(cert.issuedAt)}</p>
                    {cert.expiresAt && (
                      <p className="text-xs text-gray-500">Valid until: {formatDate(cert.expiresAt)}</p>
                    )}
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs flex items-center gap-1"
                        disabled={download.isPending && download.variables === cert.id}
                        onClick={() => download.mutate(cert.id)}
                      >
                        {download.isPending && download.variables === cert.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Download className="w-3 h-3" />
                        )}
                        Download PDF
                      </Button>
                      {cert.verifyToken && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-xs flex items-center gap-1"
                          onClick={() => openVerify(cert.verifyToken)}
                        >
                          <QrCode className="w-3 h-3" /> Verify
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
