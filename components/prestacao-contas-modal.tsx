"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/context/auth-context"
import { registrarPrestacaoContas } from "@/lib/firebase/ciclos"
import { calcularValorRepassar } from "@/lib/ciclo-status"
import { registrarAuditoria } from "@/lib/firebase/auditoria"
import { calcularAlteracoes, formatarMoedaAuditoria, type CampoAuditavel } from "@/lib/auditoria"
import type { Ciclo } from "@/types"

interface PrestacaoContasModalProps {
  isOpen: boolean
  onClose: () => void
  ciclo: Ciclo | null
  revendedoraId: string
  onSuccess: () => void
}

const hojeISO = () => new Date().toISOString().slice(0, 10)

// Aceita "1.234,56" e "1234.56"
const paraNumero = (texto: string): number => {
  const limpo = texto.trim().replace(/\./g, "").replace(",", ".")
  const valor = Number(limpo)
  return Number.isFinite(valor) ? valor : Number.NaN
}

const formatarMoeda = (valor: number) =>
  valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

const CAMPOS_PRESTACAO: CampoAuditavel[] = [
  { chave: "valorVendido", rotulo: "Vendido", formatar: formatarMoedaAuditoria },
  { chave: "valorDevolvido", rotulo: "Devolvido", formatar: formatarMoedaAuditoria },
  { chave: "valorFalta", rotulo: "Em falta", formatar: formatarMoedaAuditoria },
  { chave: "percentualComissao", rotulo: "Comissão (%)" },
  { chave: "valorRepassar", rotulo: "A repassar", formatar: formatarMoedaAuditoria },
]

export default function PrestacaoContasModal({
  isOpen,
  onClose,
  ciclo,
  revendedoraId,
  onSuccess,
}: PrestacaoContasModalProps) {
  const [valorVendido, setValorVendido] = useState("")
  const [valorDevolvido, setValorDevolvido] = useState("")
  const [valorFalta, setValorFalta] = useState("")
  const [percentualComissao, setPercentualComissao] = useState("0")
  const [dataPrestacao, setDataPrestacao] = useState(hojeISO())
  const [observacao, setObservacao] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth()

  useEffect(() => {
    if (!isOpen) return
    // Se já houver prestação registrada, carrega para permitir correção.
    const prestacao = ciclo?.prestacaoContas
    setValorVendido(prestacao ? String(prestacao.valorVendido) : "")
    setValorDevolvido(prestacao ? String(prestacao.valorDevolvido) : "")
    setValorFalta(prestacao ? String(prestacao.valorFalta) : "")
    setPercentualComissao(prestacao ? String(prestacao.percentualComissao) : "0")
    setDataPrestacao(prestacao?.dataPrestacao || hojeISO())
    setObservacao(prestacao?.observacao || "")
  }, [isOpen, ciclo])

  const vendido = paraNumero(valorVendido || "0")
  const devolvido = paraNumero(valorDevolvido || "0")
  const falta = paraNumero(valorFalta || "0")
  const comissao = paraNumero(percentualComissao || "0")

  const previa = calcularValorRepassar(vendido || 0, falta || 0, comissao || 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ciclo) return

    if ([vendido, devolvido, falta, comissao].some((v) => Number.isNaN(v) || v < 0)) {
      toast({
        title: "Valores inválidos",
        description: "Informe apenas números positivos nos valores e na comissão.",
        variant: "destructive",
      })
      return
    }
    if (comissao > 100) {
      toast({
        title: "Comissão inválida",
        description: "O percentual de comissão não pode ser maior que 100%.",
        variant: "destructive",
      })
      return
    }
    if (!dataPrestacao) {
      toast({ title: "Erro", description: "Informe a data da prestação.", variant: "destructive" })
      return
    }

    setIsSubmitting(true)
    try {
      await registrarPrestacaoContas(ciclo.id, revendedoraId, {
        valorVendido: vendido,
        valorDevolvido: devolvido,
        valorFalta: falta,
        percentualComissao: comissao,
        valorComissao: previa.valorComissao,
        valorRepassar: previa.valorRepassar,
        dataPrestacao,
        observacao: observacao.trim(),
        registradoPor: user?.email || "",
      })

      toast({
        title: "Prestação registrada",
        description: `Valor a repassar: ${formatarMoeda(previa.valorRepassar)}.`,
      })

      const jaExistia = Boolean(ciclo.prestacaoContas)
      await registrarAuditoria({
        acao: jaExistia ? "prestacao.corrigir" : "prestacao.registrar",
        entidade: "ciclo",
        entidadeId: ciclo.id,
        revendedoraId,
        descricao:
          `Ciclo ${ciclo.numeroCiclo}: vendido ${formatarMoeda(vendido)}, devolvido ` +
          `${formatarMoeda(devolvido)}, em falta ${formatarMoeda(falta)}, comissão ${comissao}% ` +
          `→ a repassar ${formatarMoeda(previa.valorRepassar)}.`,
        // Na correção, mostra o que mudou em relação à prestação anterior.
        alteracoes: jaExistia
          ? calcularAlteracoes(
              ciclo.prestacaoContas as any,
              {
                valorVendido: vendido,
                valorDevolvido: devolvido,
                valorFalta: falta,
                percentualComissao: comissao,
                valorRepassar: previa.valorRepassar,
              },
              CAMPOS_PRESTACAO
            )
          : undefined,
        usuarioEmail: user?.email || "",
        usuarioNome: user?.name || "",
      })
      onSuccess()
      onClose()
    } catch (error) {
      console.error("Erro ao registrar prestação:", error)
      toast({
        title: "Erro",
        description: "Não foi possível registrar a prestação de contas.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Prestação de Contas {ciclo ? `— Ciclo ${ciclo.numeroCiclo}` : ""}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="valorVendido">Valor vendido (R$)</Label>
              <Input
                id="valorVendido"
                value={valorVendido}
                onChange={(e) => setValorVendido(e.target.value)}
                placeholder="0,00"
                inputMode="decimal"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="valorDevolvido">Devolvido em mercadoria (R$)</Label>
              <Input
                id="valorDevolvido"
                value={valorDevolvido}
                onChange={(e) => setValorDevolvido(e.target.value)}
                placeholder="0,00"
                inputMode="decimal"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="valorFalta">Valor em falta (R$)</Label>
              <Input
                id="valorFalta"
                value={valorFalta}
                onChange={(e) => setValorFalta(e.target.value)}
                placeholder="0,00"
                inputMode="decimal"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="percentualComissao">Comissão sobre a venda (%)</Label>
              <Input
                id="percentualComissao"
                value={percentualComissao}
                onChange={(e) => setPercentualComissao(e.target.value)}
                placeholder="0"
                inputMode="decimal"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dataPrestacao">Data da prestação</Label>
              <Input
                id="dataPrestacao"
                type="date"
                value={dataPrestacao}
                onChange={(e) => setDataPrestacao(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Prévia recalculada a cada tecla */}
          <div className="rounded-md border bg-secondary/40 p-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Vendido + Falta</span>
              <span>{formatarMoeda((vendido || 0) + (falta || 0))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Comissão ({comissao || 0}% sobre o vendido)
              </span>
              <span>− {formatarMoeda(previa.valorComissao)}</span>
            </div>
            <div className="flex justify-between border-t pt-1 font-semibold">
              <span>Valor a repassar</span>
              <span>{formatarMoeda(previa.valorRepassar)}</span>
            </div>
            <p className="pt-1 text-xs text-muted-foreground">
              O valor devolvido em mercadoria é registrado para conferência e não entra neste cálculo.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacao">Observação</Label>
            <Textarea
              id="observacao"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              className="min-h-[70px]"
            />
          </div>

          <div className="flex justify-end gap-4 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : "Registrar Prestação"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
