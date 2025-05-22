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

interface GarantiaFormModalProps {
  isOpen: boolean
  onClose: () => void
  itemId?: string // Se fornecido, estamos editando; caso contrário, estamos adicionando
  onSuccess: () => void
}

export default function GarantiaFormModal({ isOpen, onClose, itemId, onSuccess }: GarantiaFormModalProps) {
  const [formData, setFormData] = useState({
    nome: "",
    dataCompra: "",
    dataValidade: "",
    status: "Devolvida para loja",
    loja: "",
    observacao: "",
    notaCompra: "",
    whatsapp: "",
    email: "",
    descricaoPecas: "",
  })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  // Carregar dados se estiver editando
  useEffect(() => {
    if (itemId && isOpen) {
      setIsLoading(true)
      fetchWarrantyItem(itemId)
        .then((item) => {
          if (item) {
            setFormData({
              nome: item.nome || "",
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
              setImagePreview(item.imagemPecas)
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
    }
  }, [itemId, isOpen, toast])

  const resetForm = () => {
    setFormData({
      nome: "",
      dataCompra: "",
      dataValidade: "",
      status: "Devolvida para loja",
      loja: "",
      observacao: "",
      notaCompra: "",
      whatsapp: "",
      email: "",
      descricaoPecas: "",
    })
    setImageFile(null)
    setImagePreview(null)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setImageFile(file)

      // Criar preview da imagem
      const reader = new FileReader()
      reader.onload = (event) => {
        if (event.target?.result) {
          setImagePreview(event.target.result as string)
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const convertImageToBase64 = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      let imagemPecas = imagePreview
      if (imageFile) {
        imagemPecas = await convertImageToBase64(imageFile)
      }

      const dataToSave = {
        ...formData,
        imagemPecas,
      }

      if (itemId) {
        // Editar existente
        await updateWarrantyItem(itemId, dataToSave)
        toast({
          title: "Sucesso",
          description: "Garantia atualizada com sucesso!",
        })
      } else {
        // Adicionar novo
        await addWarrantyItem(dataToSave)
        toast({
          title: "Sucesso",
          description: "Garantia adicionada com sucesso!",
        })
      }

      onSuccess()
      onClose()
    } catch (error) {
      toast({
        title: "Erro",
        description: `Não foi possível ${itemId ? "atualizar" : "adicionar"} a garantia. Tente novamente.`,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const statusOptions = ["Devolvida para loja", "Extraviada-crédito cliente", "Em análise", "Concluída", "Pendente"]

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
                <Label htmlFor="nome">Nome do Cliente</Label>
                <Input id="nome" name="nome" value={formData.nome} onChange={handleInputChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input id="whatsapp" name="whatsapp" value={formData.whatsapp} onChange={handleInputChange} />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="loja">Loja</Label>
                <Select
                    value={formData.loja}
                    onValueChange={(value) => handleSelectChange("loja", value)}
                    required
                >
                    <SelectTrigger>
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
                <Label htmlFor="dataValidade">Data de Validade</Label>
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

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => handleSelectChange("status", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notaCompra">Nota de Compra</Label>
              <Input id="notaCompra" name="notaCompra" type="file" accept="image/*,.pdf" onChange={handleInputChange} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="imagemPecas">Imagem das Peças para Avaliação</Label>
              <Input id="imagemPecas" type="file" accept="image/*" onChange={handleImageChange} />
              {imagePreview && (
                <div className="mt-2">
                  <p className="text-sm text-gray-500 mb-1">Preview:</p>
                  <img
                    src={imagePreview || "/placeholder.svg"}
                    alt="Preview"
                    className="max-w-[200px] max-h-[200px] object-cover rounded-md"
                  />
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

            <div className="space-y-2">
              <Label htmlFor="observacao">Observação</Label>
              <Textarea
                id="observacao"
                name="observacao"
                placeholder="Observações adicionais..."
                value={formData.observacao}
                onChange={handleInputChange}
                className="min-h-[100px]"
              />
            </div>

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
