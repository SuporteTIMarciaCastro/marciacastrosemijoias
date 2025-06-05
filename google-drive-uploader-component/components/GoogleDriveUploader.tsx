"use client"

import type React from "react"
import { useState } from "react"
import { Upload, FileText, ImageIcon, File, CheckCircle, AlertCircle } from "lucide-react"

export interface UploadResult {
  success: boolean
  fileName?: string
  fileId?: string
  message?: string
  error?: string
  fileUrl?: string
}

interface GoogleDriveUploaderProps {
  onUploadComplete?: (result: UploadResult) => void
  onUploadError?: (error: string) => void
  className?: string
  accept?: string
  multiple?: boolean
  buttonText?: string
  dragText?: string
  dropText?: string
  maxFiles?: number
}

export function GoogleDriveUploader({
  onUploadComplete,
  onUploadError,
  className = "",
  accept = "image/*,.pdf,.doc,.docx,.txt",
  multiple = true,
  buttonText = "Selecionar Arquivos",
  dragText = "Arraste arquivos aqui",
  dropText = "Solte os arquivos aqui",
  maxFiles,
}: GoogleDriveUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([])

  const handleFiles = async (files: FileList) => {
    if (maxFiles && files.length > maxFiles) {
      onUploadError?.(`Máximo de ${maxFiles} arquivo(s) permitido(s)`)
      return
    }

    setUploading(true)
    const results: UploadResult[] = []

    for (const file of Array.from(files)) {
      try {
        const formData = new FormData()
        formData.append("file", file)

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        })

        const result = await response.json()
        results.push(result)
        onUploadComplete?.(result)
      } catch (error) {
        const errorResult = {
          success: false,
          fileName: file.name,
          error: "Erro ao enviar arquivo",
        }
        results.push(errorResult)
        onUploadError?.(`Erro ao enviar arquivo: ${file.name}`)
      }
    }

    setUploadResults((prev) => [...results, ...prev])
    setUploading(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files)
    }
  }

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split(".").pop()?.toLowerCase()

    if (["jpg", "jpeg", "png", "gif", "webp"].includes(extension || "")) {
      return <ImageIcon className="w-4 h-4" />
    } else if (extension === "pdf") {
      return <FileText className="w-4 h-4" />
    } else {
      return <File className="w-4 h-4" />
    }
  }

  return (
    <div className={`w-full space-y-6 ${className}`}>
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <p className="text-lg font-medium mb-2">
          {dragActive ? dropText : dragText}
        </p>
        <p className="text-gray-500 mb-4">ou</p>
        <button
          type="button"
          disabled={uploading}
          onClick={() => document.getElementById("file-input")?.click()}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? "Enviando..." : buttonText}
        </button>
        <input
          id="file-input"
          type="file"
          multiple={multiple}
          className="hidden"
          onChange={handleFileInput}
          accept={accept}
        />
      </div>

      {uploadResults.length > 0 && (
        <div className="space-y-3">
          {uploadResults.map((result, index) => (
            <div
              key={index}
              className={`flex items-center gap-3 p-3 rounded-lg border ${
                result.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
              }`}
            >
              {result.success ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600" />
              )}

              {result.fileName && getFileIcon(result.fileName)}

              <div className="flex-1">
                <p className="font-medium">{result.fileName}</p>
                <p className={`text-sm ${result.success ? "text-green-600" : "text-red-600"}`}>
                  {result.message || result.error}
                </p>
                {result.success && result.fileUrl && (
                  <a
                    href={result.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-800 hover:underline mt-1 inline-block"
                  >
                    Ver arquivo no Google Drive
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
} 