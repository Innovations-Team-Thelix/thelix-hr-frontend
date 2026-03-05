"use client";

import React, { useState, useRef } from "react";
import toast from "react-hot-toast";
import { BookOpen, Upload, Download, Trash2, FileText, Eye } from "lucide-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/loading";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/hooks";
import { usePolicies, useUploadPolicy, useDeletePolicy, useDownloadPolicy } from "@/hooks/usePolicies";
import { formatDate } from "@/lib/utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

export default function PolicyPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === "Admin";

  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [previewPolicy, setPreviewPolicy] = useState<any | null>(null);
  const [title, setTitle] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: policies, isLoading } = usePolicies();
  const uploadPolicy = useUploadPolicy();
  const deletePolicy = useDeletePolicy();
  const downloadPolicy = useDownloadPolicy();

    const closeModal = () => {
    setUploadModalOpen(false);
    setTitle("");
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUpload = async () => {

    if (!selectedFile || !title) {
      toast.error("Please provide a title and select a PDF file");
      return;
    }

    try {
      await uploadPolicy.mutateAsync({ title, file: selectedFile });
      toast.success("Policy uploaded successfully");
      closeModal();
    } catch {
      toast.error("Failed to upload policy");
    }
  };

  const handleDelete = async (id: string, policyTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${policyTitle}"?`)) return;

    try {
      await deletePolicy.mutateAsync(id);
      toast.success("Policy deleted successfully");
    } catch {
      toast.error("Failed to delete policy");
    }
  };

  const handleDownload = async (policy: any) => {
    let url = policy.signedUrl;
    if (!url) {
      try {
        url = await downloadPolicy.mutateAsync(policy.id);
      } catch {
        toast.error("Failed to get download URL");
        return;
      }
    }
    
    if (url) {
      const link = document.createElement('a');
      link.href = url;
      link.download = policy.fileName || 'document.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handlePreview = async (policy: any) => {
    let url = policy.signedUrl;
    if (!url) {
      try {
        url = await downloadPolicy.mutateAsync(policy.id);
      } catch {
        toast.error("Failed to load document for preview");
        return;
      }
    }
    
    if (url) {
      setPreviewPolicy({ ...policy, signedUrl: url });
    }
  };

  return (
    <AppLayout pageTitle="Company Policy">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookOpen className="h-6 w-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">
              Company Policies
            </h1>
          </div>
          {isAdmin && (
            <Button onClick={() => setUploadModalOpen(true)}>
              <Upload className="h-4 w-4" />
              Upload Policy
            </Button>
          )}
        </div>

        {/* Policy List */}
        <Card>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4 py-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : !policies || policies.length === 0 ? (
              <div className="py-12 text-center">
                <FileText className="mx-auto h-12 w-12 text-gray-300" />
                <p className="mt-3 text-sm text-gray-500">
                  No company policies uploaded yet
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {policies.map((policy) => (
                  <div
                    key={policy.id}
                    className="flex items-center justify-between py-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                        <FileText className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {policy.title}
                        </h3>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span>{policy.fileName}</span>
                          <Badge variant="neutral">v{policy.version}</Badge>
                          <span>
                            Uploaded {formatDate(policy.createdAt)}
                          </span>
                          {policy.uploadedBy && (
                            <span>by {policy.uploadedBy.fullName}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handlePreview(policy)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Preview
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleDownload(policy)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                      {isAdmin && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleDelete(policy.id, policy.title)
                          }
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upload Modal */}
        <Modal
          isOpen={uploadModalOpen}
          onClose={() => {
            closeModal();
          }}
          title="Upload Company Policy"
          size="md"
          footer={
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  closeModal();
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                loading={uploadPolicy.isPending}
                disabled={!title || !selectedFile}
              >
                Upload
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <Input
              label="Policy Title"
              required
              placeholder="e.g. Employee Handbook"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                PDF File *
              </label>
              <div className="flex items-center gap-3">
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
                  <Upload className="h-4 w-4" />
                  Choose PDF
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        setSelectedFile(e.target.files[0]);
                      }
                    }}
                  />
                </label>
                {selectedFile && (
                  <span className="text-sm text-gray-500">
                    {selectedFile.name}
                  </span>
                )}
              </div>
            </div>
          </div>
        </Modal>

        {/* Preview Modal */}
        <Modal
          isOpen={!!previewPolicy}
          onClose={() => setPreviewPolicy(null)}
          title={previewPolicy?.title}
          size="lg"
          className="max-w-5xl h-[85vh] flex flex-col"
        >
          <div className="flex-1 h-full min-h-[500px] w-full bg-gray-100 rounded-md overflow-hidden">
            {previewPolicy?.signedUrl && (
              <iframe
                src={previewPolicy.signedUrl}
                className="w-full h-full border-0"
                title="PDF Preview"
              />
            )}
          </div>
        </Modal>
      </div>
    </AppLayout>
  );
}
