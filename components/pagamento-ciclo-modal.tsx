"use client"

import type React from "react"
import { useEffect, useState } from "react"
import imageCompression from "browser-image-compression"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/context/auth-context"
import { Loader2 } from "lucide-react"
import { registrarPagamento } from "@/lib/firebase/ciclos"
import { uploadParaDrive, PASTA_DRIVE_REVENDAS } from "@/lib/google-drive"
import {
  FORMA_PAGAMENTO_CODES,
  FORMA_PAGAMENTO_PADRAO,
  getFormaPagamentoLabel,
} from "@/lib/ciclo-status"
import { registrarAuditoria } from "@/lib/firebase/auditoria"
import type { Ciclo } from "@/types"

interface PagamentoCicloModalProps {
  isOpen: boolean
  onClose: () => void
  ciclo: Ciclo | null
  revendedoraId: string
  onSuccess: () => void
}

const MAX_FILE_SIZE_MB = 5
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

const hojeISO = () => new Date().toISOString().slice(0, 10)

const paraNumero = (texto: string): number => {
  const limpo = texto.trim().replace(/\./g, "").replace(",", ".")
  const valor = Number(limpo)
  return Number.isFinite(valor) ? valor : Number.NaN
}

const formatarMoeda = (valor: number) =>
  valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

export default function PagamentoCicloModal({
  isOpen,
  onClose,
  ciclo,
  revendedoraId,
  onSuccess,
}: PagamentoCicloModalProps) {
  const [data, setData] = useState(hojeISO())
  const [valor, setValor] = useState("")
  const [forma, setForma] = useState(FORMA_PAGAMENTO_PADRAO)
  const [observacao, setObservacao] = useState("")
  const [comprovante, setComprovante] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [mensagemUpload, setMensagemUpload] = useState<string | null>(null)
  const { toast } = useToast()
  const { user } = useAuth()

  const valorRepassar = ciclo?.prestacaoContas?.valorRepassar ?? 0
  const totalPago = ciclo?.totalPago ?? 0
  const saldoDevedor = Math.max(0, Math.round((valorRepassar - totalPago) * 100) / 100)

  useEffect(() => {
    if (!isOpen) return
    setData(hojeISO())
    // Pré-preenche com o saldo devedor: o caso comum é quitar de uma vez.
    setValor(saldoDevedor > 0 ? String(saldoDevedor) : "")
    setForma(FORMA_PAGAMENTO_PADRAO)
    setObservacao("")
    setComprovante(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, ciclo])

  const handleArquivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast({
        title: "Arquivo muito grande",
        description: `O comprovante precisa ter no máximo ${MAX_FILE_SIZE_MB}MB.`,
        variant: "destructive",
      })
      e.target.value = ""
      return
    }
    setComprovante(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ciclo) return

    const valorNumero = paraNumero(valor)
    if (Number.isNaN(valorNumero) || valorNumero <= 0) {
      toast({
        title: "Valor inválido",
        description: "Informe um valor de pagamento maior que zero.",
        variant: "destructive",
      })
      return
    }
    if (!data) {
      toast({ title: "Erro", description: "Informe a data do pagamento.", variant: "destructive" })
      return
    }

    setIsSubmitting(true)
    try {
      let comprovanteUrl = ""
      if (comprovante) {
        setMensagemUpload("Enviando comprovante...")
        let arquivo = comprovante
        if (comprovante.type.startsWith("image/")) {
          try {
            arquivo = await imageCompression(comprovante, {
              maxSizeMB: 1.5,
              maxWidthOrHeight: 2000,
              useWebWorker: true,
              initialQuality: 0.6,
            })
          } catch (error) {
            console.error("Erro ao comprimir comprovante:", error)
          }
        }
        comprovanteUrl = await uploadParaDrive(arquivo, PASTA_DRIVE_REVENDAS)
        setMensagemUpload(null)
      }

      await registrarPagamento(ciclo.id, revendedoraId, {
        data,
        valor: valorNumero,
        forma,
        comprovanteUrl,
        observacao: observacao.trim(),
        registradoPor: user?.email || "",
      })

      const novoTotal = totalPago + valorNumero
      const quitou = novoTotal >= valorRepassar - 0.005
      await registrarAuditoria({
        acao: "pagamento.registrar",
        entidade: "ciclo",
        entidadeId: ciclo.id,
        revendedoraId,
        descricao:
          `Ciclo ${ciclo.numeroCiclo}: pagamento de ${formatarMoeda(valorNumero)} ` +
          `(${getFormaPagamentoLabel(forma)}) em ${data}. ` +
          (quitou
            ? "Valor quitado — ciclo encerrado."
            : `Saldo devedor: ${formatarMoeda(valorRepassar - novoTotal)}.`),
        usuarioEmail: user?.email || "",
        usuarioNome: user?.name || "",
      })

      toast({
        title: "Pagamento registrado",
        description: quitou
          ? "Valor quitado. O ciclo foi encerrado."
          : `Saldo devedor: ${formatarMoeda(valorRepassar - novoTotal)}.`,
      })

      onSuccess()
      onClose()
    } catch (error) {
      console.error("Erro ao registrar pagamento:", error)
      toast({
        title: "Erro",
        description:
          error instanceof Error && error.message.includes("prestação")
            ? error.message
            : "Não foi possível registrar o pagamento.",
        variant: "destructive",
      })
    } finally {
      setMensagemUpload(null)
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Registrar Pagamento {ciclo ? `— Ciclo ${ciclo.numeroCiclo}` : ""}
            </DialogTitle>
          </DialogHeader>

          <div className="rounded-md border bg-secondary/40 p-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Valor a repassar</span>
              <span>{formatarMoeda(valorRepassar)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Já pago</span>
              <span>{formatarMoeda(totalPago)}</span>
            </div>
            <div className="flex justify-between border-t pt-1 font-semibold">
              <span>Saldo devedor</span>
              <span>{formatarMoeda(saldoDevedor)}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dataPagamento">Data</Label>
                <Input
                  id="dataPagamento"
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="valorPagamento">Valor (R$)</Label>
                <Input
                  id="valorPagamento"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  placeholder="0,00"
                  inputMode="decimal"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="forma">Forma</Label>
                <Select value={forma} onValueChange={setForma}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {FORMA_PAGAMENTO_CODES.map((codigo) => (
                      <SelectItem key={codigo} value={codigo}>
                        {getFormaPagamentoLabel(codigo)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="comprovante">Comprovante</Label>
              <Input
                id="comprovante"
                type="file"
                accept="image/*,.pdf"
                onChange={handleArquivo}
                disabled={isSubmitting}
                className="cursor-pointer"
              />
              {comprovante && <p className="text-xs text-green-600">{comprovante.name}</p>}
              <p className="text-xs text-muted-foreground">
                Imagem ou PDF, no máximo {MAX_FILE_SIZE_MB}MB.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="observacaoPagamento">Observação</Label>
              <Textarea
                id="observacaoPagamento"
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
                {isSubmitting ? "Salvando..." : "Registrar Pagamento"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {mensagemUpload && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
          <div className="flex w-[320px] flex-col items-center gap-3 rounded-lg bg-white p-6 text-center shadow-2xl">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm text-gray-600">{mensagemUpload}</p>
          </div>
        </div>
      )}
    </>
  )
}
