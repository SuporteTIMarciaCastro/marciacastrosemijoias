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
import { GrauBadge } from "@/components/grau-badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Trash2 } from "lucide-react"

interface Material {
  quantidade: string
  descricao: string
}

interface SolicitacaoFormModalProps {
  isOpen: boolean
  onClose: () => void
  itemId?: string
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
  const [materiais, setMateriais] = useState<Material[]>([{ quantidade: "", descricao: "" }])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

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
            // Se houver materiais salvos, carrega-os
            if (item.materiais) {
              setMateriais(item.materiais)
            }
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
    setMateriais([{ quantidade: "", descricao: "" }])
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleMaterialChange = (index: number, field: keyof Material, value: string) => {
    const newMateriais = [...materiais]
    newMateriais[index] = { ...newMateriais[index], [field]: value }
    setMateriais(newMateriais)
  }

  const addMaterial = () => {
    setMateriais([...materiais, { quantidade: "", descricao: "" }])
  }

  const removeMaterial = (index: number) => {
    if (materiais.length > 1) {
      const newMateriais = materiais.filter((_, i) => i !== index)
      setMateriais(newMateriais)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Validação dos materiais
    if (materiais.some(m => !m.quantidade || !m.descricao)) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos dos materiais",
        variant: "destructive",
      })
      setIsSubmitting(false)
      return
    }

    try {
      const requestData = {
        ...formData,
        materiais,
      }

      if (itemId) {
        await updateMaterialRequest(itemId, {
          ...requestData,
          updatedAt: new Date()
        })
        toast({
          title: "Sucesso",
          description: "Solicitação atualizada com sucesso!",
        })
      } else {
        await addMaterialRequest({
          ...requestData,
          status: "Pendente",
          createdAt: new Date(),
          updatedAt: new Date()
        })
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
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
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
                  <SelectItem value="Comercial">Comercial</SelectItem>
                  <SelectItem value="Marketing">Marketing</SelectItem>
                  <SelectItem value="Financeiro">Financeiro</SelectItem>
                  <SelectItem value="T.I">T.I</SelectItem>
                  <SelectItem value="RH">RH</SelectItem>
                  <SelectItem value="Cocais Shopping">Cocais Shopping</SelectItem>
                  <SelectItem value="Parnaíba Shopping">Parnaíba Shopping</SelectItem>
                  <SelectItem value="Rio Anil Shopping">Rio Anil Shopping</SelectItem>
                  <SelectItem value="Rio Poty Shopping">Rio Poty Shopping</SelectItem>
                  <SelectItem value="Teresina Shopping">Teresina Shopping</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Materiais</Label>
                <Button type="button" variant="outline" size="sm" onClick={addMaterial}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Material
                </Button>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Quantidade</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {materiais.map((material, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Input
                            type="number"
                            min="1"
                            value={material.quantidade}
                            onChange={(e) => handleMaterialChange(index, "quantidade", e.target.value)}
                            placeholder="Qtd"
                            required
                            className="w-full"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={material.descricao}
                            onChange={(e) => handleMaterialChange(index, "descricao", e.target.value)}
                            placeholder="Descrição do material"
                            required
                            className="w-full"
                          />
                        </TableCell>
                        <TableCell>
                          {materiais.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeMaterial(index)}
                              className="h-8 w-8 p-0"
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="justificativa">Justificativa</Label>
              <Textarea
                id="justificativa"
                name="justificativa"
                placeholder="Justifique a necessidade destes materiais..."
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
                    <SelectValue placeholder="Selecione o grau">
                      {formData.grau && <GrauBadge grau={formData.grau} />}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {grauOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        <GrauBadge grau={option} />
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {itemId && (
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
              )}
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
