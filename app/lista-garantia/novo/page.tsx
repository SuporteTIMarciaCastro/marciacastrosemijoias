"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { addWarrantyItem } from "@/lib/firebase/warranty"
import Header from "@/components/header"

export default function NovaGarantiaPage() {
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
  const router = useRouter()
  const { toast } = useToast()

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
      let imagemPecas = null
      if (imageFile) {
        imagemPecas = await convertImageToBase64(imageFile)
      }

      await addWarrantyItem({
        ...formData,
        imagemPecas,
      })

      toast({
        title: "Sucesso",
        description: "Garantia adicionada com sucesso!",
      })

      router.push("/lista-garantia")
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível adicionar a garantia. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const statusOptions = ["Devolvida para loja", "Extraviada-crédito cliente", "Em análise", "Concluída", "Pendente"]

  return (
    <div className="flex min-h-screen flex-col">
      <Header title="Adicionar Garantia" />

      <main className="flex-1 p-4 md:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Adicionar Nova Garantia</CardTitle>
          </CardHeader>
          <CardContent>
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
                  <Input id="loja" name="loja" value={formData.loja} onChange={handleInputChange} required />
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
                <Input
                  id="notaCompra"
                  name="notaCompra"
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleInputChange}
                />
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

              <div className="flex justify-end gap-4">
                <Button type="button" variant="outline" onClick={() => router.push("/lista-garantia")}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
