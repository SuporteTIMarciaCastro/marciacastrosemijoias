"use client"

import type React from "react"
import { fetchAutenticado } from "@/lib/api-client"

import { useState, useEffect } from "react"
import imageCompression from "browser-image-compression"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { addWarrantyItem, updateWarrantyItem, fetchWarrantyItem } from "@/lib/firebase/warranty"
import { StatusBadge } from "@/components/status-badge"
import { useAuth } from "@/context/auth-context"
import { Loader2 } from "lucide-react"

interface GarantiaFormModalProps {
  isOpen: boolean
  onClose: () => void
  itemId?: string // Se fornecido, estamos editando; caso contrário, estamos adicionando
  onSuccess: () => void
}

const MAX_FILE_SIZE_MB = 5
const COMPRESSION_TARGET_MB = 1.5
const MAX_WIDTH_OR_HEIGHT = 2000

const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

export default function GarantiaFormModal({ isOpen, onClose, itemId, onSuccess }: GarantiaFormModalProps) {
  const [formData, setFormData] = useState({
    nome: "",
    vendedor: "",
    dataCompra: "",
    dataValidade: "",
    status: "Recebido loja",
    loja: "",
    observacao: "",
    notaCompra: "",
    whatsapp: "",
    email: "",
    descricaoPecas: "",
  })
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [notaCompraFile, setNotaCompraFile] = useState<File | null>(null)
  const [notaCompraPreview, setNotaCompraPreview] = useState<string | null>(null)
  const [isProcessingNotaCompra, setIsProcessingNotaCompra] = useState(false)
  const [notaCompraProcessingMessage, setNotaCompraProcessingMessage] = useState<string | null>(null)
  const [notaCompraError, setNotaCompraError] = useState<string | null>(null)
  const [isProcessingImagemPecas, setIsProcessingImagemPecas] = useState(false)
  const [imagemPecasProcessingMessage, setImagemPecasProcessingMessage] = useState<string | null>(null)
  const [imagemPecasError, setImagemPecasError] = useState<string | null>(null)
  const [isUploadingFiles, setIsUploadingFiles] = useState(false)
  const [uploadProcessingMessage, setUploadProcessingMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const [originalItem, setOriginalItem] = useState<any>(null)
  const { user } = useAuth()

  const readFileAsDataURL = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result)
        } else {
          reject(new Error("Não foi possível gerar o preview do arquivo."))
        }
      }
      reader.onerror = () => reject(reader.error ?? new Error("Erro ao ler o arquivo selecionado."))
      reader.readAsDataURL(file)
    })

  // Carregar dados se estiver editando
  useEffect(() => {
    if (itemId && isOpen) {
      setIsLoading(true)
      fetchWarrantyItem(itemId)
        .then((item) => {
          if (item) {
            setOriginalItem(item)
            setFormData({
              nome: item.nome || "",
              vendedor: item.vendedor || "",
              dataCompra: item.dataCompra || "",
              dataValidade: item.dataValidade || "",
              status: item.status || "Devolvida para loja",
              loja: item.loja || "",
              observacao: item.observacao || "",
              notaCompra: item.notaCompra || "",
              whatsapp: item.whatsapp || "",
              email: item.email || "",
              descricaoPecas: item.descricaoPecas || "",
            })

            if (item.imagemPecas) {
              setImagePreviews(Array.isArray(item.imagemPecas) ? item.imagemPecas : [item.imagemPecas])
            }
          }
        })
        .catch((error) => {
          console.error("Erro ao carregar garantia:", error)
          toast({
            title: "Erro",
            description: "Não foi possível carregar os dados da garantia",
            variant: "destructive",
          })
        })
        .finally(() => {
          setIsLoading(false)
        })
    } else {
      // Resetar formulário quando abrir para adicionar novo
      resetForm()
      setOriginalItem(null)
    }
  }, [itemId, isOpen, toast])

  const resetForm = () => {
    setFormData({
      nome: "",
      vendedor: "",
      dataCompra: "",
      dataValidade: "",
      status: "Recebido loja",
      loja: "",
      observacao: "",
      notaCompra: "",
      whatsapp: "",
      email: "",
      descricaoPecas: "",
    })
    setImageFiles([])
    setImagePreviews([])
    setNotaCompraFile(null)
    setNotaCompraPreview(null)
    setNotaCompraError(null)
    setImagemPecasError(null)
    setNotaCompraProcessingMessage(null)
    setImagemPecasProcessingMessage(null)
    setIsProcessingNotaCompra(false)
    setIsProcessingImagemPecas(false)
    setIsUploadingFiles(false)
    setUploadProcessingMessage(null)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    if (name === "whatsapp") {
      // Remove tudo que não for número
      let num = value.replace(/\D/g, "");
      // Limita a 11 dígitos
      num = num.slice(0, 11);
      // Aplica a máscara
      let formatted = num;
      if (num.length > 2) {
        formatted = `(${num.slice(0, 2)}`;
        if (num.length > 7) {
          formatted += `) ${num.slice(2, 7)}-${num.slice(7)}`;
        } else if (num.length > 2) {
          formatted += `) ${num.slice(2)}`;
        }
      }
      setFormData((prev) => ({ ...prev, [name]: formatted }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const target = e.target
    const files = target.files

    if (!files || files.length === 0) {
      return
    }

    setImagemPecasError(null)
    setIsProcessingImagemPecas(true)
    setImagemPecasProcessingMessage("Otimizando imagens selecionadas... Isso pode levar alguns instantes.")

    try {
      const processedFiles: File[] = []

      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) {
          toast({
            title: "Arquivo inválido",
            description: "Envie apenas arquivos de imagem para este campo.",
            variant: "destructive",
          })
          continue
        }

        if (file.size > MAX_FILE_SIZE_BYTES) {
          toast({
            title: "Arquivo muito grande",
            description: "Cada imagem precisa ter no máximo 5MB.",
            variant: "destructive",
          })
          setImagemPecasError("Cada imagem precisa ter no máximo 5MB.")
          continue
        }

        let finalFile = file
        try {
          finalFile = await imageCompression(file, {
            maxSizeMB: COMPRESSION_TARGET_MB,
            maxWidthOrHeight: MAX_WIDTH_OR_HEIGHT,
            useWebWorker: true,
            initialQuality: 0.6,
          })
        } catch (error) {
          console.error("Erro ao comprimir imagem:", error)
          toast({
            title: "Aviso",
            description: "Não conseguimos comprimir uma das imagens. Vamos enviar o arquivo original.",
          })
          finalFile = file
        }

        processedFiles.push(finalFile)
        const preview = await readFileAsDataURL(finalFile)
        setImagePreviews((prev) => [...prev, preview])
      }

      if (processedFiles.length > 0) {
        setImageFiles((prev) => [...prev, ...processedFiles])
      }

      if (processedFiles.length === 0) {
        setImagemPecasError("Nenhuma imagem válida foi selecionada.")
      }
    } finally {
      setIsProcessingImagemPecas(false)
      setImagemPecasProcessingMessage(null)
      target.value = ""
    }
  }

  const handleNotaCompraChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const target = e.target
    const file = target.files?.[0]
    if (!file) {
      return
    }

    setNotaCompraError(null)

    const isImage = file.type.startsWith("image/")
    const isPdf = file.type === "application/pdf"

    if (!isImage && !isPdf) {
      setNotaCompraError("Envie apenas imagem ou PDF.")
      toast({
        title: "Formato inválido",
        description: "A nota de compra precisa ser uma imagem ou um PDF.",
        variant: "destructive",
      })
      target.value = ""
      return
    }

    if (!isImage && file.size > MAX_FILE_SIZE_BYTES) {
      setNotaCompraError("O arquivo precisa ter no máximo 5MB.")
      toast({
        title: "Arquivo muito grande",
        description: "O arquivo da nota precisa ter no máximo 5MB.",
        variant: "destructive",
      })
      target.value = ""
      return
    }

    if (isImage && file.size > MAX_FILE_SIZE_BYTES) {
      setNotaCompraError("O arquivo precisa ter no máximo 5MB.")
      toast({
        title: "Arquivo muito grande",
        description: "A imagem da nota precisa ter no máximo 5MB.",
        variant: "destructive",
      })
      target.value = ""
      return
    }

    setIsProcessingNotaCompra(true)
    setNotaCompraProcessingMessage(
      isImage ? "Otimizando a imagem da nota..." : "Preparando o arquivo da nota para envio..."
    )

    try {
      let processedFile = file

      if (isImage) {
        try {
          processedFile = await imageCompression(file, {
            maxSizeMB: COMPRESSION_TARGET_MB,
            maxWidthOrHeight: MAX_WIDTH_OR_HEIGHT,
            useWebWorker: true,
            initialQuality: 0.6,
          })
        } catch (error) {
          console.error("Erro ao comprimir imagem da nota:", error)
          toast({
            title: "Aviso",
            description: "Não conseguimos comprimir a imagem da nota. Vamos enviar o arquivo original.",
          })
          processedFile = file
        }
      }

      setNotaCompraFile(processedFile)
      const preview = await readFileAsDataURL(processedFile)
      setNotaCompraPreview(preview)
    } finally {
      setIsProcessingNotaCompra(false)
      setNotaCompraProcessingMessage(null)
      target.value = ""
    }
  }

  const triggerWarrantyWebhook = async (payload: Record<string, unknown>) => {
    try {
      const response = await fetchAutenticado("/api/warranty-webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => "")
        console.error("Falha ao acionar webhook de garantia", response.status, errorText)
      }
    } catch (error) {
      console.error("Erro ao acionar webhook de garantia:", error)
    }
  }

  const uploadFileToDrive = async (file: File): Promise<string> => {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("folderId", "1-NZHEq0_4bKpL99KN2K-u5eQTxJ7BXfn")

    const response = await fetchAutenticado("/api/upload", {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      throw new Error("Erro ao fazer upload do arquivo")
    }

    const result = await response.json()
    return result.fileUrl
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    if (!formData.loja) {
      toast({
        title: "Erro",
        description: "O campo Loja é obrigatório.",
        variant: "destructive",
      })
      setIsSubmitting(false)
      return
    }

    try {
      const shouldShowUploadMessage = imageFiles.length > 0 || Boolean(notaCompraFile)
      if (shouldShowUploadMessage) {
        setIsUploadingFiles(true)
        setUploadProcessingMessage("Enviando anexos e imagens. Isso pode levar alguns instantes...")
      }

      let imagemPecasUrls: string[] = []
      let notaCompraUrl = ""

      try {
        imagemPecasUrls = await Promise.all(imageFiles.map((file) => uploadFileToDrive(file)))

        if (notaCompraFile) {
          notaCompraUrl = await uploadFileToDrive(notaCompraFile)
        }
      } finally {
        if (shouldShowUploadMessage) {
          setUploadProcessingMessage(null)
          setIsUploadingFiles(false)
        }
      }

      const dataToSave = {
        ...formData,
        nome: formData.nome.trimStart().toLowerCase(),
        vendedor: formData.vendedor,
        imagemPecas: imagemPecasUrls.length > 0 ? imagemPecasUrls.join(",") : (originalItem?.imagemPecas || ""),
        notaCompra: notaCompraUrl || (originalItem?.notaCompra || ""),
      }

      if (itemId) {
        await updateWarrantyItem(itemId, dataToSave)
        void triggerWarrantyWebhook({
          action: "warranty_updated",
          id: itemId,
          ...dataToSave,
          updatedAt: new Date().toISOString(),
        })
        toast({
          title: "Sucesso",
          description: "Garantia atualizada com sucesso!",
        })
      } else {
        const newGarantiaId = await addWarrantyItem(dataToSave)
        void triggerWarrantyWebhook({
          action: "warranty_created",
          id: newGarantiaId,
          ...dataToSave,
          createdAt: new Date().toISOString(),
        })
        toast({
          title: "Sucesso",
          description: "Garantia adicionada com sucesso!",
        })

        // Enviar email para o cliente apenas quando for uma nova garantia
        if (formData.email) {
          try {
            const response = await fetchAutenticado('/api/send-email', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                email: formData.email,
                nome: formData.nome,
                status: formData.status,
                loja: formData.loja,
                garantiaId: newGarantiaId,
                dataCompra: formData.dataCompra,
                dataValidade: formData.dataValidade,
                descricaoPecas: formData.descricaoPecas,
                observacao: formData.observacao,
                notaCompra: dataToSave.notaCompra,
                imagemPecas: dataToSave.imagemPecas,
                vendedor: formData.vendedor
              }),
            });

            if (!response.ok) {
              console.error('Erro ao enviar email');
            }
          } catch (error) {
            console.error('Erro ao enviar email:', error);
          }
        }
      }

      onSuccess()
      onClose()
    } catch (error) {
      console.error("Erro ao salvar garantia:", error)
      toast({
        title: "Erro",
        description: `Não foi possível ${itemId ? "atualizar" : "adicionar"} a garantia. Tente novamente.`,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Valores gravados no Firestore. O texto exibido vem do StatusBadge (getWarrantyStatusLabel).
  const statusOptions = ["Recebido loja", "Recebido comercial","Recebido fábrica", "Recebido no escritório", "Devolvido comercial","Devolvido loja", "Devolvido cliente","Extraviada-crédito cliente", "Negado"]

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{itemId ? "Editar Garantia" : "Adicionar Nova Garantia"}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <p>Carregando...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nome">
                  Nome do Cliente <span className="text-red-500">*</span>
                </Label>
                <Input 
                  id="nome" 
                  name="nome" 
                  value={formData.nome} 
                  onChange={handleInputChange} 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vendedor">
                  Vendedor Responsável <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="vendedor"
                  name="vendedor"
                  value={formData.vendedor}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">
                  Email <span className="text-red-500">*</span>
                </Label>
                <Input 
                  id="email" 
                  name="email" 
                  type="email" 
                  value={formData.email} 
                  onChange={handleInputChange} 
                  required 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="whatsapp">
                  WhatsApp <span className="text-red-500">*</span>
                </Label>
                <Input 
                  id="whatsapp" 
                  name="whatsapp" 
                  value={formData.whatsapp} 
                  onChange={handleInputChange} 
                  required 
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="loja">Loja <span className="text-red-500">*</span></Label>
                <Select
                    value={formData.loja}
                    onValueChange={(value) => handleSelectChange("loja", value)}
                    required
                >
                    <SelectTrigger className={formData.loja === "" && isSubmitting ? "border-red-500" : ""}>
                      <SelectValue placeholder="Selecione uma loja" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cocais Shopping">Cocais Shopping</SelectItem>
                      <SelectItem value="Parnaíba Shopping">Parnaíba Shopping</SelectItem>
                      <SelectItem value="Rio Anil Shopping">Rio Anil Shopping</SelectItem>
                      <SelectItem value="Rio Poty Shopping">Rio Poty Shopping</SelectItem>
                      <SelectItem value="Teresina Shopping">Teresina Shopping</SelectItem>
                    </SelectContent>
                </Select>
                {formData.loja === "" && isSubmitting && (
                  <span className="text-red-500 text-xs mt-1 block">Por favor, selecione uma loja.</span>
                )}
              </div>

            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dataCompra">Data da Compra</Label>
                <Input
                  id="dataCompra"
                  name="dataCompra"
                  type="date"
                  value={formData.dataCompra}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dataValidade">Entrada da Solicitação</Label>
                <Input
                  id="dataValidade"
                  name="dataValidade"
                  type="date"
                  value={formData.dataValidade}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            {itemId && user?.permissions?.listaGarantia?.editar && (
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => handleSelectChange("status", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o status">
                      {formData.status && <StatusBadge status={formData.status} />}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        <StatusBadge status={option} />
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notaCompra">Nota de Compra</Label>
              <div className="relative rounded-md border border-dashed border-gray-200 p-3">
                <Input
                  id="notaCompra"
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleNotaCompraChange}
                  disabled={isProcessingNotaCompra || isSubmitting || isUploadingFiles}
                  className="cursor-pointer"
                />
                {notaCompraPreview && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-500 mb-1">Preview:</p>
                    {notaCompraFile?.type === "application/pdf" ? (
                      <p className="text-sm text-green-600">PDF selecionado: {notaCompraFile.name}</p>
                    ) : (
                      <img
                        src={notaCompraPreview}
                        alt="Preview da nota"
                        className="max-w-[200px] max-h-[200px] object-cover rounded-md"
                      />
                    )}
                  </div>
                )}
                {isProcessingNotaCompra && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-md bg-black/40 text-white">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="px-4 text-center text-sm">
                      {notaCompraProcessingMessage ?? "Processando arquivo..."}
                    </span>
                  </div>
                )}
              </div>
              {notaCompraError && <span className="text-xs text-red-500">{notaCompraError}</span>}
              <p className="text-sm text-gray-500">
                Apenas arquivos PDF ou imagem. Tamanho máximo de 5MB.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="imagemPecas">Imagem das Peças para Avaliação</Label>
              <div className="relative rounded-md border border-dashed border-gray-200 p-3">
                <Input
                  id="imagemPecas"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  multiple
                  disabled={isProcessingImagemPecas || isSubmitting || isUploadingFiles}
                  className="cursor-pointer"
                />
                {imagePreviews.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-500 mb-1">Previews:</p>
                    <div className="grid grid-cols-2 gap-2">
                      {imagePreviews.map((preview, index) => (
                        <img
                          key={index}
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          className="max-w-[200px] max-h-[200px] rounded-md object-cover"
                        />
                      ))}
                    </div>
                  </div>
                )}
                {isProcessingImagemPecas && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-md bg-black/40 text-white">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="px-4 text-center text-sm">
                      {imagemPecasProcessingMessage ?? "Processando imagens..."}
                    </span>
                  </div>
                )}
              </div>
              {imagemPecasError && <span className="text-xs text-red-500">{imagemPecasError}</span>}
              <p className="text-sm text-gray-500">
                Selecione uma ou mais imagens (máx. 5MB cada).
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricaoPecas">Descrição das Peças para Avaliação</Label>
              <Textarea
                id="descricaoPecas"
                name="descricaoPecas"
                placeholder="Descreva as peças..."
                value={formData.descricaoPecas}
                onChange={handleInputChange}
                className="min-h-[100px]"
              />
            </div>

            {itemId && (
              <div className="space-y-2">
                <Label htmlFor="observacao">Justificativa</Label>
                <Textarea
                  id="observacao"
                  name="observacao"
                  placeholder="Justificativa da solicitação..."
                  value={formData.observacao}
                  onChange={handleInputChange}
                  className="min-h-[100px]"
                />
              </div>
            )}

            <div className="flex justify-end gap-4 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
      </Dialog>

      {isUploadingFiles && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
          <div
            role="alertdialog"
            aria-live="assertive"
            className="flex w-[320px] flex-col items-center gap-3 rounded-lg bg-white p-6 text-center shadow-2xl"
          >
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-base font-semibold text-gray-900">Enviando anexos</p>
            <p className="text-sm text-gray-600">
              {uploadProcessingMessage ?? "Enviando anexos e imagens. Isso pode levar alguns instantes..."}
            </p>
          </div>
        </div>
      )}
    </>
  )
}
