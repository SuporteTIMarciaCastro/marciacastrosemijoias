"use client"

import { useState } from "react"
import { fetchAutenticado } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { updateWarrantyItem } from "@/lib/firebase/warranty"
import { getWarrantyStatusLabel } from "@/lib/warranty-status"
import type { WarrantyItem } from "@/types"

interface FinalizeWarrantyModalProps {
  isOpen: boolean
  onClose: () => void
  warrantyItem: WarrantyItem | null
  onSuccess: () => void
}

// Valores gravados no Firestore. O texto exibido vem de getWarrantyStatusLabel.
const FINALIZATION_STATUSES = [
  "Devolvido cliente",
  "Extraviada-crédito cliente", 
  "Negado"
]

export function FinalizeWarrantyModal({
  isOpen,
  onClose,
  warrantyItem,
  onSuccess
}: FinalizeWarrantyModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<string>("")
  const [justificativa, setJustificativa] = useState<string>("")
  const [confirmName, setConfirmName] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

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

  // Verifica se o status atual permite finalização direta
  const canFinalizeDirectly = warrantyItem?.status && 
    ["Devolvido cliente", "Extraviada-crédito cliente", "Negado"].includes(warrantyItem.status)

  const handleFinalize = async () => {
    if (!warrantyItem) return

    // Confirmação do nome do cliente (obrigatório)
    if (confirmName.trim().toLowerCase() !== (warrantyItem.nome || "").trim().toLowerCase()) {
      toast({
        title: "Erro",
        description: "Digite corretamente o nome do cliente para confirmar a finalização",
        variant: "destructive",
      })
      return
    }

    // Validações
    if (!canFinalizeDirectly && !selectedStatus) {
      toast({
        title: "Erro",
        description: "Selecione um status para finalizar a garantia",
        variant: "destructive",
      })
      return
    }

    if (selectedStatus === "Negado" && !justificativa.trim()) {
      toast({
        title: "Erro", 
        description: "É obrigatório informar uma justificativa quando o status é 'Negado'",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const finalStatus = canFinalizeDirectly ? warrantyItem.status : selectedStatus
      const finalObservacao = selectedStatus === "Negado" ? justificativa : warrantyItem.observacao
      const timestamp = new Date().toISOString()

      await updateWarrantyItem(warrantyItem.id, {
        status: finalStatus,
        observacao: finalObservacao,
        finalized: true,
        updatedAt: timestamp
      })

      void triggerWarrantyWebhook({
        action: "warranty_finalized",
        id: warrantyItem.id,
        nome: warrantyItem.nome,
        loja: warrantyItem.loja,
        vendedor: warrantyItem.vendedor,
        status: finalStatus,
        observacao: finalObservacao,
        finalized: true,
        dataCompra: warrantyItem.dataCompra,
        dataValidade: warrantyItem.dataValidade,
        email: warrantyItem.email,
        whatsapp: warrantyItem.whatsapp,
        descricaoPecas: warrantyItem.descricaoPecas,
        notaCompra: warrantyItem.notaCompra,
        imagemPecas: warrantyItem.imagemPecas,
        updatedAt: timestamp,
      })

      toast({
        title: "Sucesso",
        description: "Garantia finalizada com sucesso",
      })

      onSuccess()
      handleClose()
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível finalizar a garantia",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setSelectedStatus("")
    setJustificativa("")
    setConfirmName("")
    onClose()
  }

  if (!warrantyItem) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Finalizar Garantia</DialogTitle>
          <DialogDescription>
            {canFinalizeDirectly 
              ? "Esta garantia pode ser finalizada diretamente pois já possui um status final."
              : "Selecione o status final da garantia para prosseguir com a finalização."
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Cliente</Label>
            <Input value={warrantyItem.nome} disabled />
          </div>

          <div className="space-y-2">
            <Label>Status Atual</Label>
            <Input value={getWarrantyStatusLabel(warrantyItem.status)} disabled />
          </div>

          {!canFinalizeDirectly && (
            <div className="space-y-2">
              <Label htmlFor="status">Status Final *</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status final" />
                </SelectTrigger>
                <SelectContent>
                  {FINALIZATION_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {getWarrantyStatusLabel(status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {(selectedStatus === "Negado" || (canFinalizeDirectly && warrantyItem.status === "Negado")) && (
            <div className="space-y-2">
              <Label htmlFor="justificativa">Justificativa *</Label>
              <Textarea
                id="justificativa"
                placeholder="Informe a justificativa para a negação (Obrigatório)"
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                rows={3}
              />
            </div>
          )}

          {/* Campo obrigatório: confirmar nome do cliente */}
          <div className="space-y-2">
            <Label htmlFor="confirmName">Confirme o nome do cliente *</Label>
            <Input
              id="confirmName"
              placeholder="Digite o nome completo do cliente para confirmar"
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
            />
            <div className="text-xs text-gray-500">Digite exatamente o nome exibido em Cliente para habilitar a finalização.</div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            onClick={handleFinalize}
            disabled={isLoading || (
              confirmName.trim().toLowerCase() !== (warrantyItem.nome || "").trim().toLowerCase()
            )}
          >
            {isLoading ? "Finalizando..." : "Finalizar Garantia"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 