"use client"

import { type ChangeEvent, useRef, useState } from "react"
import Image from "next/image"
import imageCompression from "browser-image-compression"

import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"

interface CompressibleImageInputProps {
  id?: string
  accept?: string
  required?: boolean
  previewSrc: string | null
  onPreviewChange: (preview: string | null) => void
  onFileProcessed: (file: File | null) => void
  onErrorMessageChange?: (message: string) => void
  errorMessage?: string
  disabled?: boolean
  isUploading?: boolean
  processingMessage?: string | null
  onCompressingChange?: (compressing: boolean) => void
  onProcessingMessageChange?: (message: string | null) => void
  maxFileSizeMB?: number
  compressionThresholdMB?: number
  compressionTargetMB?: number
}

const DEFAULT_MAX_FILE_SIZE_MB = 5
const DEFAULT_COMPRESSION_THRESHOLD_MB = 2
const DEFAULT_COMPRESSION_TARGET_MB = 1.5
const MAX_WIDTH_OR_HEIGHT = 2000

export function CompressibleImageInput({
  id,
  accept = "image/*",
  required,
  previewSrc,
  onPreviewChange,
  onFileProcessed,
  onErrorMessageChange,
  errorMessage,
  disabled,
  isUploading,
  processingMessage,
  onCompressingChange,
  onProcessingMessageChange,
  maxFileSizeMB = DEFAULT_MAX_FILE_SIZE_MB,
  compressionThresholdMB = DEFAULT_COMPRESSION_THRESHOLD_MB,
  compressionTargetMB = DEFAULT_COMPRESSION_TARGET_MB,
}: CompressibleImageInputProps) {
  const { toast } = useToast()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [isCompressing, setIsCompressing] = useState(false)

  const handleFileSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    const maxFileSizeBytes = maxFileSizeMB * 1024 * 1024
    const compressionThresholdBytes = compressionThresholdMB * 1024 * 1024

    if (file.size > maxFileSizeBytes) {
      onErrorMessageChange?.("A imagem excede o limite de 5MB.")
      onFileProcessed(null)
      onPreviewChange(null)
      if (inputRef.current) {
        inputRef.current.value = ""
      }
      toast({
        title: "Arquivo muito grande",
        description: "A imagem precisa ter no máximo 5MB para ser enviada.",
        variant: "destructive",
      })
      return
    }

    onErrorMessageChange?.("")

    let processedFile = file

    if (file.size > compressionThresholdBytes) {
      setIsCompressing(true)
      onCompressingChange?.(true)
      const message = "Estamos comprimindo sua imagem para agilizar o envio."
      onProcessingMessageChange?.(message)
      toast({
        title: "Comprimindo imagem",
        description: "O envio não falhou. Estamos otimizando o arquivo antes de enviar.",
      })

      try {
        processedFile = await imageCompression(file, {
          maxSizeMB: compressionTargetMB,
          maxWidthOrHeight: MAX_WIDTH_OR_HEIGHT,
          useWebWorker: true,
          initialQuality: 0.6,
        })
      } catch (error) {
        console.error("Erro ao comprimir imagem:", error)
        toast({
          title: "Aviso",
          description: "Não foi possível comprimir a imagem. Vamos tentar enviar o arquivo original.",
        })
        processedFile = file
      } finally {
        setIsCompressing(false)
        onCompressingChange?.(false)
        onProcessingMessageChange?.(null)
      }
    } else {
      onProcessingMessageChange?.(null)
    }

    onFileProcessed(processedFile)

    const reader = new FileReader()
    reader.onload = (loadEvent) => {
      if (loadEvent.target?.result) {
        onPreviewChange(loadEvent.target.result as string)
      }
    }
    reader.readAsDataURL(processedFile)
  }

  const showOverlay = isCompressing || Boolean(isUploading)
  const overlayMessage = processingMessage ?? "Processando imagem..."

  return (
    <div className="relative">
      <div className="flex flex-col gap-4">
        <Input
          ref={inputRef}
          id={id}
          type="file"
          accept={accept}
          required={required}
          onChange={handleFileSelect}
          className={`cursor-pointer${errorMessage ? " border-red-500" : ""}`}
          disabled={disabled || isCompressing || isUploading}
        />
        {errorMessage && <span className="text-red-500 text-xs">{errorMessage}</span>}
        {previewSrc && (
          <div className="mt-2">
            <p className="text-sm text-gray-500 mb-1">Preview:</p>
            <Image src={previewSrc} alt="Preview" width={200} height={200} className="object-cover rounded-md" />
          </div>
        )}
      </div>

      {showOverlay && (
        <div className="absolute inset-0 bg-black/40 rounded-md flex flex-col items-center justify-center gap-3 p-4">
          <svg className="animate-spin h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
          </svg>
          <div className="text-white font-medium">{overlayMessage}</div>
          <div className="w-40 h-2 bg-white/30 rounded overflow-hidden">
            <div className="h-full bg-white/80 rounded animate-pulse" style={{ width: "40%" }} />
          </div>
        </div>
      )}
    </div>
  )
}
