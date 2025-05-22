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
import { addMaterialRequest, updateMaterialRequest, fetchMaterialRequest } from "@/lib/firebase/material-requests"

interface SolicitacaoFormModalProps {
  isOpen: boolean
  onClose: () => void
  itemId?: string // Se fornecido, estamos editando; caso contrário, estamos adicionando
  onSuccess: () => void
}

export default function SolicitacaoFormModal({ isOpen, onClose, itemId, onSuccess }: SolicitacaoFormModalProps) {
  const [formData, setFormData] = useState({
    setor: "",
    descricao: "",
    justificativa: "",
    grau: "Médio",
    status: "Pendente",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  // Carregar dados se estiver editando
  useEffect(() => {
    if (itemId && isOpen) {
      setIsLoading(true)
      fetchMaterialRequest(itemId)
        .then((item) => {
          if (item) {
            setFormData({
              setor: item.setor || "",
              descricao: item.descricao || "",
              justificativa: item.justificativa || "",
              grau: item.grau || "Médio",
              status: item.status || "Pendente",
            })
          }
        })
        .catch((error) => {
          console.error("Erro ao carregar solicitação:", error)
          toast({
            title: "Erro",
            description: "Não foi possível carregar os dados da solicitação",
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
      setor: "",
      descricao: "",
      justificativa: "",
      grau: "Médio",
      status: "Pendente",
    })
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      if (itemId) {
        // Editar existente
        await updateMaterialRequest(itemId, formData)
        toast({
          title: "Sucesso",
          description: "Solicitação atualizada com sucesso!",
        })
      } else {
        // Adicionar novo
        await addMaterialRequest(formData)
        toast({
          title: "Sucesso",
          description: "Solicitação adicionada com sucesso!",
        })
      }

      onSuccess()
      onClose()
    } catch (error) {
      toast({
        title: "Erro",
        description: `Não foi possível ${itemId ? "atualizar" : "adicionar"} a solicitação. Tente novamente.`,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const grauOptions = ["Urgente", "Médio", "Baixo"]
  const statusOptions = ["Pendente", "Concluído", "Recusado"]

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{itemId ? "Editar Solicitação" : "Adicionar Nova Solicitação"}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <p>Carregando...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="setor">Setor</Label>
                <Select
                    value={formData.setor}
                    onValueChange={(value) => handleSelectChange("setor", value)}
                    required
                >
                    <SelectTrigger>
                    <SelectValue placeholder="Selecione um setor" />
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

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                name="descricao"
                placeholder="Descreva o material solicitado..."
                value={formData.descricao}
                onChange={handleInputChange}
                className="min-h-[100px]"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="justificativa">Justificativa</Label>
              <Textarea
                id="justificativa"
                name="justificativa"
                placeholder="Justifique a necessidade deste material..."
                value={formData.justificativa}
                onChange={handleInputChange}
                className="min-h-[100px]"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="grau">Grau de Necessidade</Label>
                <Select value={formData.grau} onValueChange={(value) => handleSelectChange("grau", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o grau" />
                  </SelectTrigger>
                  <SelectContent>
                    {grauOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
