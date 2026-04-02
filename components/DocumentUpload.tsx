"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";

interface Props {
  onUpload: (file: File) => void;
  loading: boolean;
}

const ACCEPTED = {
  "application/pdf": [".pdf"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "text/plain": [".txt"],
};

export default function DocumentUpload({ onUpload, loading }: Props) {
  const onDrop = useCallback(
    (files: File[]) => {
      if (files[0]) onUpload(files[0]);
    },
    [onUpload]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED,
    maxFiles: 1,
    disabled: loading,
  });

  return (
    <div
      {...getRootProps()}
      style={{
        border: `2px dashed ${isDragActive ? "#2563eb" : "#d1d5db"}`,
        borderRadius: 12,
        padding: "3rem 2rem",
        cursor: loading ? "wait" : "pointer",
        background: isDragActive ? "#eff6ff" : "#fff",
        transition: "all 0.2s",
      }}
    >
      <input {...getInputProps()} />
      {loading ? (
        <p style={{ color: "#6b7280" }}>Analyzing your document...</p>
      ) : isDragActive ? (
        <p style={{ color: "#2563eb", fontWeight: 500 }}>Drop it here</p>
      ) : (
        <>
          <p style={{ fontWeight: 500, marginBottom: "0.5rem" }}>
            Drag &amp; drop your document here
          </p>
          <p style={{ color: "#6b7280", fontSize: "0.9rem" }}>
            or click to browse
          </p>
        </>
      )}
    </div>
  );
}
