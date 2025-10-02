"use client"

import type React from "react"

import { useState, useEffect } from "react"
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

interface GarantiaFormModalProps {
  isOpen: boolean
  onClose: () => void
  itemId?: string // Se fornecido, estamos editando; caso contrário, estamos adicionando
  onSuccess: () => void
}

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
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const [originalItem, setOriginalItem] = useState<any>(null)
  const { user } = useAuth()

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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      setImageFiles(prev => [...prev, ...files])

      // Criar previews das imagens
      files.forEach(file => {
        const reader = new FileReader()
        reader.onload = (event: ProgressEvent<FileReader>) => {
          const result = event.target?.result
          if (result) {
            setImagePreviews(prev => [...prev, result as string])
          }
        }
        reader.readAsDataURL(file)
      })
    }
  }

  const handleNotaCompraChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setNotaCompraFile(file)

      // Criar preview do documento
      const reader = new FileReader()
      reader.onload = (event) => {
        if (event.target?.result) {
          setNotaCompraPreview(event.target.result as string)
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const triggerWarrantyWebhook = async (payload: Record<string, unknown>) => {
    try {
      const response = await fetch("/api/warranty-webhook", {
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

    const response = await fetch("/api/upload", {
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
      // Upload das imagens
      const imagemPecasUrls = await Promise.all(
        imageFiles.map(file => uploadFileToDrive(file))
      )

      // Upload da nota de compra
      let notaCompraUrl = ""
      if (notaCompraFile) {
        notaCompraUrl = await uploadFileToDrive(notaCompraFile)
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
            const response = await fetch('/api/send-email', {
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

  const statusOptions = ["Recebido loja", "Recebido comercial","Recebido fábrica", "Devolvido comercial","Devolvido loja", "Devolvido cliente","Extraviada-crédito cliente", "Negado"]

  return (
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
              <Input 
                id="notaCompra" 
                type="file" 
                accept="image/*,.pdf" 
                onChange={handleNotaCompraChange} 
              />
              <p className="text-sm text-gray-500">Apenas arquivos PDF ou imagem. Tamanho máximo: 900KB</p>
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="imagemPecas">Imagem das Peças para Avaliação</Label>
              <Input 
                id="imagemPecas" 
                type="file" 
                accept="image/*" 
                onChange={handleImageChange}
                multiple 
              />
              <p className="text-sm text-gray-500">Selecione uma ou mais imagens. Tamanho máximo por arquivo: 900KB</p>
              {imagePreviews.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm text-gray-500 mb-1">Previews:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {imagePreviews.map((preview, index) => (
                      <img
                        key={index}
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="max-w-[200px] max-h-[200px] object-cover rounded-md"
                      />
                    ))}
                  </div>
                </div>
              )}
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
  )
}
