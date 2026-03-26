"use client";

import React from "react";
import { Settings } from "lucide-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <AppLayout pageTitle="Settings">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Settings className="h-6 w-6 text-gray-600" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Settings</h2>
            <p className="text-sm text-gray-500">System configuration and preferences</p>
          </div>
        </div>

        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <Settings className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <p className="text-sm">System settings coming soon.</p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
