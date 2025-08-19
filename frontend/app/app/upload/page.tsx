"use client";

import { useAuthStore } from "@/stores/authStore";
import { useRouter } from "next/navigation";
import { useState } from "react";

const UploadIcon = () => (
  <svg
    className="w-12 h-12 mx-auto text-gray-500"
    stroke="currentColor"
    fill="none"
    viewBox="0 0 48 48"
    aria-hidden="true"
  >
    <path
      d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default function UploadPage() {
  const token = useAuthStore((state) => state.token);
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");

  const handleFileUpload = async (file: File) => {
    setUploadStatus("Uploading...");

    const formData = new FormData();
    formData.append("archiveFile", file);

    try {
      const response = await fetch("http://localhost:8080/api/v1/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Something went wrong during upload.");
      }

      setUploadStatus(data.message);
      router.push("/app/gallery");
    } catch (error) {
      if (error instanceof Error) {
        console.log("Upload Failed: ", error.message);
      } else {
        console.log("An unknown error occurred.");
      }
    }
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); // This is crucial to allow the drop event to fire
    e.stopPropagation();
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      console.log("Files Dropped:", files[0].name);

      handleFileUpload(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;

    if (files && files.length > 0) {
      console.log("File selected:", files[0].name);
      handleFileUpload(files[0]);
    }
  };

  if (!token) {
    return null;
  }

  return (
    <main className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
      <div className="w-full max-w-2xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold">Upload Your Archive</h1>
          <p className="mt-2 text-gray-400">
            Drag and drop your Instagram .zip file to begin.
          </p>
        </div>

        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-lg p-12 text-center transition-colors duration-300
            ${
              isDragging
                ? "border-cyan-500 bg-gray-800"
                : "border-gray-600 hover:border-gray-500"
            }`}
        >
          <input
            type="file"
            id="file-upload"
            className="hidden"
            accept=".zip"
            onChange={handleFileSelect}
          />
          <label htmlFor="file-upload" className="cursor-pointer">
            <UploadIcon />
            <p className="mt-4 text-lg">
              <span className="font-semibold text-cyan-400">
                Click to upload
              </span>{" "}
              or drag and drop
            </p>
            <p className="text-sm text-gray-500">ZIP file up to 2GB</p>
          </label>
        </div>

        {/* Display the upload status to the user */}
        {uploadStatus && (
          <p className="mt-4 text-center text-gray-300">{uploadStatus}</p>
        )}
      </div>
    </main>
  );
}
