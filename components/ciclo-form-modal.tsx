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
import { Loader2, ShieldAlert } from "lucide-react"
import {
  abrirCiclo,
  registrarEntregaAdicional,
  CicloAbertoError,
  EntregaBloqueadaError,
} from "@/lib/firebase/ciclos"
import { fetchVendedores } from "@/lib/firebase/vendedores"
import { uploadParaDrive, PASTA_DRIVE_REVENDAS } from "@/lib/google-drive"
import { somarDias, formatarDataBR } from "@/lib/ciclo-status"
import { registrarAuditoria } from "@/lib/firebase/auditoria"
import { formatarMoedaAuditoria } from "@/lib/auditoria"
import type { Vendedor } from "@/types"

interface CicloFormModalProps {
  isOpen: boolean
  onClose: () => void
  revendedoraId: string
  revendedoraNome: string
  /** prazo padrão configurado no cadastro da revendedora */
  prazoPadraoDias?: number
  /** motivo que impede a entrega normal (status ou documentação), ou null */
  motivoBloqueio?: string | null
  /** ciclo aberto: se existir, a entrega entra nele como adicional */
  cicloAbertoId?: string | null
  /** usuário tem permissão para autorizar exceção */
  podeAutorizar?: boolean
  onSuccess: () => void
}

const MAX_FILE_SIZE_MB = 5
const COMPRESSION_TARGET_MB = 1.5
const MAX_WIDTH_OR_HEIGHT = 2000
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

const PRAZO_PADRAO_DIAS = 30
const SEM_VENDEDOR = "__sem_vendedor__"

const hojeISO = () => new Date().toISOString().slice(0, 10)

export default function CicloFormModal({
  isOpen,
  onClose,
  revendedoraId,
  revendedoraNome,
  prazoPadraoDias,
  motivoBloqueio,
  cicloAbertoId,
  podeAutorizar,
  onSuccess,
}: CicloFormModalProps) {
  const [dataEntrega, setDataEntrega] = useState(hojeISO())
  const [prazoDias, setPrazoDias] = useState(String(PRAZO_PADRAO_DIAS))
  const [valorEntregue, setValorEntregue] = useState("")
  const [vendedorId, setVendedorId] = useState("")
  const [observacao, setObservacao] = useState("")
  const [justificativa, setJustificativa] = useState("")
  const [vendedores, setVendedores] = useState<Vendedor[]>([])

  const [romaneio, setRomaneio] = useState<File | null>(null)
  const [foto, setFoto] = useState<File | null>(null)
  const [assinatura, setAssinatura] = useState<File | null>(null)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [mensagemUpload, setMensagemUpload] = useState<string | null>(null)
  const { toast } = useToast()
  const { user } = useAuth()

  useEffect(() => {
    if (!isOpen) return

    setDataEntrega(hojeISO())
    // Prazo da revendedora quando configurado; senão o padrão global.
    setPrazoDias(String(prazoPadraoDias && prazoPadraoDias > 0 ? prazoPadraoDias : PRAZO_PADRAO_DIAS))
    setValorEntregue("")
    setVendedorId("")
    setObservacao("")
    setJustificativa("")
    setRomaneio(null)
    setFoto(null)
    setAssinatura(null)

    fetchVendedores()
      .then((lista) => setVendedores(lista.filter((v) => v.status === "ativo")))
      .catch((error) => {
        console.error("Erro ao carregar vendedores:", error)
        setVendedores([])
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, prazoPadraoDias])

  // Motivo pelo qual esta entrega precisa de autorização, se precisar.
  const motivoAtual = cicloAbertoId
    ? "Ciclo anterior ainda em aberto"
    : motivoBloqueio || ""
  const exigeAutorizacao = Boolean(cicloAbertoId || motivoBloqueio)

  const prazoNumero = Number(prazoDias)
  const dataEncerramentoPrevista =
    dataEntrega && Number.isFinite(prazoNumero) && prazoNumero > 0
      ? somarDias(dataEntrega, prazoNumero)
      : ""

  // Comprime imagens antes de enviar; PDFs seguem como estão.
  const prepararArquivo = async (file: File): Promise<File> => {
    if (!file.type.startsWith("image/")) return file
    try {
      return await imageCompression(file, {
        maxSizeMB: COMPRESSION_TARGET_MB,
        maxWidthOrHeight: MAX_WIDTH_OR_HEIGHT,
        useWebWorker: true,
        initialQuality: 0.6,
      })
    } catch (error) {
      console.error("Erro ao comprimir imagem:", error)
      return file
    }
  }

  const handleArquivo =
    (setter: (file: File | null) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast({
          title: "Arquivo muito grande",
          description: `Cada arquivo precisa ter no máximo ${MAX_FILE_SIZE_MB}MB.`,
          variant: "destructive",
        })
        e.target.value = ""
        return
      }

      setter(file)
    }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!dataEntrega) {
      toast({ title: "Erro", description: "Informe a data da entrega.", variant: "destructive" })
      return
    }
    if (!Number.isFinite(prazoNumero) || prazoNumero <= 0) {
      toast({
        title: "Prazo inválido",
        description: "O prazo do ciclo precisa ser um número de dias maior que zero.",
        variant: "destructive",
      })
      return
    }

    // Campo opcional: em branco significa "não capturado", não zero.
    const valorTexto = valorEntregue.trim().replace(/\./g, "").replace(",", ".")
    const valorNumero = valorTexto === "" ? undefined : Number(valorTexto)
    if (valorNumero !== undefined && (!Number.isFinite(valorNumero) || valorNumero < 0)) {
      toast({
        title: "Valor inválido",
        description: "Informe um valor numérico positivo para a mercadoria, ou deixe em branco.",
        variant: "destructive",
      })
      return
    }

    // Exceção exige justificativa registrada — autorizar sem rastro não vale nada.
    if (exigeAutorizacao && justificativa.trim().length < 10) {
      toast({
        title: "Justificativa obrigatória",
        description: "Descreva em pelo menos 10 caracteres o motivo de liberar esta entrega.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      const vendedorSelecionado = vendedores.find((v) => v.id === vendedorId)

      let romaneioUrl = ""
      let fotoEntregaUrl = ""
      let assinaturaUrl = ""

      const temAnexo = romaneio || foto || assinatura
      if (temAnexo) {
        setMensagemUpload("Enviando anexos. Isso pode levar alguns instantes...")
      }

      if (romaneio) romaneioUrl = await uploadParaDrive(await prepararArquivo(romaneio), PASTA_DRIVE_REVENDAS)
      if (foto) fotoEntregaUrl = await uploadParaDrive(await prepararArquivo(foto), PASTA_DRIVE_REVENDAS)
      if (assinatura)
        assinaturaUrl = await uploadParaDrive(await prepararArquivo(assinatura), PASTA_DRIVE_REVENDAS)

      setMensagemUpload(null)

      const autorizacao = exigeAutorizacao
        ? {
            justificativa: justificativa.trim(),
            motivoBloqueio: motivoAtual,
            autorizadoPorEmail: user?.email || "",
            autorizadoPorNome: user?.name || "",
            autorizadoEm: new Date().toISOString(),
          }
        : undefined

      if (cicloAbertoId) {
        // Ciclo em aberto: a mercadoria entra nele, e não num segundo ciclo —
        // assim a prestação de contas continua sendo uma só.
        await registrarEntregaAdicional(cicloAbertoId, {
          dataEntrega,
          vendedorEntregaId: vendedorId,
          vendedorEntregaNome: vendedorSelecionado?.nome || "",
          romaneioUrl,
          fotoEntregaUrl,
          assinaturaUrl,
          ...(valorNumero !== undefined ? { valorEntregue: valorNumero } : {}),
          observacao: observacao.trim(),
          autorizacao: autorizacao!,
        })
        toast({
          title: "Entrega adicional registrada",
          description: `Mercadoria acrescentada ao ciclo em aberto de ${revendedoraNome}.`,
        })
        await registrarAuditoria({
          acao: "ciclo.entregaAdicional",
          entidade: "ciclo",
          entidadeId: cicloAbertoId,
          revendedoraId,
          descricao: `Entrega adicional autorizada para ${revendedoraNome}${
            valorNumero !== undefined ? ` no valor de ${formatarMoedaAuditoria(valorNumero)}` : ""
          }. Motivo: ${motivoAtual}. Justificativa: ${justificativa.trim()}`,
          usuarioEmail: user?.email || "",
          usuarioNome: user?.name || "",
        })
      } else {
        const { numeroCiclo } = await abrirCiclo(
          revendedoraId,
          {
            dataEntrega,
            vendedorEntregaId: vendedorId,
            vendedorEntregaNome: vendedorSelecionado?.nome || "",
            romaneioUrl,
            fotoEntregaUrl,
            assinaturaUrl,
            prazoDias: prazoNumero,
            dataEncerramentoPrevista,
            // Só grava o campo quando informado, para não confundir "não
            // capturado" com "zero" nos ciclos futuros.
            ...(valorNumero !== undefined ? { valorEntregue: valorNumero } : {}),
            observacao: observacao.trim(),
            criadoPor: user?.email || "",
          },
          autorizacao
        )
        toast({
          title: "Entrega registrada",
          description: `Ciclo ${numeroCiclo} aberto para ${revendedoraNome}.`,
        })
        await registrarAuditoria({
          acao: "ciclo.abrir",
          entidade: "ciclo",
          revendedoraId,
          descricao:
            `Ciclo ${numeroCiclo} aberto para ${revendedoraNome}, entrega em ` +
            `${dataEntrega}, prazo de ${prazoNumero} dias` +
            `${valorNumero !== undefined ? `, mercadoria de ${formatarMoedaAuditoria(valorNumero)}` : ""}.` +
            `${autorizacao ? ` AUTORIZADO com pendência (${motivoAtual}): ${autorizacao.justificativa}` : ""}`,
          usuarioEmail: user?.email || "",
          usuarioNome: user?.name || "",
        })
      }

      onSuccess()
      onClose()
    } catch (error) {
      // Regra de negócio recebe a mensagem própria, não o texto genérico.
      if (error instanceof CicloAbertoError || error instanceof EntregaBloqueadaError) {
        toast({ title: "Entrega não permitida", description: error.message, variant: "destructive" })
      } else {
        console.error("Erro ao registrar entrega:", error)
        toast({
          title: "Erro",
          description: "Não foi possível registrar a entrega. Tente novamente.",
          variant: "destructive",
        })
      }
    } finally {
      setMensagemUpload(null)
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {cicloAbertoId ? "Entrega Adicional" : "Nova Entrega"} — {revendedoraNome}
            </DialogTitle>
          </DialogHeader>

          {exigeAutorizacao && (
            <div className="flex gap-2 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-700 dark:bg-red-950 dark:text-red-200">
              <ShieldAlert className="h-5 w-5 shrink-0" />
              <div>
                <strong>Entrega com pendência.</strong> {motivoAtual}.
                {cicloAbertoId
                  ? " A mercadoria será acrescentada ao ciclo em aberto e acertada na mesma prestação de contas."
                  : ""}{" "}
                É necessária justificativa, que fica registrada com seu nome.
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dataEntrega">
                  Data da Entrega <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="dataEntrega"
                  type="date"
                  value={dataEntrega}
                  onChange={(e) => setDataEntrega(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prazoDias">Prazo do ciclo (dias)</Label>
                <Input
                  id="prazoDias"
                  type="number"
                  min={1}
                  value={prazoDias}
                  onChange={(e) => setPrazoDias(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Encerramento previsto</Label>
                <Input value={formatarDataBR(dataEncerramentoPrevista)} disabled />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="valorEntregue">Valor da mercadoria (R$)</Label>
              <Input
                id="valorEntregue"
                value={valorEntregue}
                onChange={(e) => setValorEntregue(e.target.value)}
                placeholder="0,00"
                inputMode="decimal"
              />
              <p className="text-xs text-muted-foreground">
                Opcional, mas é o que permite acompanhar o valor em aberto e avisar quando a
                revendedora se aproxima do limite consignado.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vendedorEntrega">Vendedor responsável pela entrega</Label>
              <Select
                value={vendedorId || SEM_VENDEDOR}
                onValueChange={(value) => setVendedorId(value === SEM_VENDEDOR ? "" : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o vendedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SEM_VENDEDOR}>Nenhum</SelectItem>
                  {vendedores.map((vendedor) => (
                    <SelectItem key={vendedor.id} value={vendedor.id}>
                      {vendedor.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {vendedores.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Nenhum vendedor ativo cadastrado — cadastre na aba Vendedores.
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="romaneio">Romaneio</Label>
                <Input
                  id="romaneio"
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleArquivo(setRomaneio)}
                  disabled={isSubmitting}
                  className="cursor-pointer"
                />
                {romaneio && <p className="text-xs text-green-600">{romaneio.name}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="foto">Foto da entrega</Label>
                <Input
                  id="foto"
                  type="file"
                  accept="image/*"
                  onChange={handleArquivo(setFoto)}
                  disabled={isSubmitting}
                  className="cursor-pointer"
                />
                {foto && <p className="text-xs text-green-600">{foto.name}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="assinatura">Romaneio assinado</Label>
                <Input
                  id="assinatura"
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleArquivo(setAssinatura)}
                  disabled={isSubmitting}
                  className="cursor-pointer"
                />
                {assinatura && <p className="text-xs text-green-600">{assinatura.name}</p>}
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Imagens ou PDF, no máximo {MAX_FILE_SIZE_MB}MB cada. As imagens são comprimidas antes do envio.
            </p>

            {exigeAutorizacao && (
              <div className="space-y-2">
                <Label htmlFor="justificativa">
                  Justificativa da autorização <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="justificativa"
                  value={justificativa}
                  onChange={(e) => setJustificativa(e.target.value)}
                  placeholder="Por que esta entrega está sendo liberada mesmo com a pendência?"
                  className="min-h-[80px]"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="observacao">Observação</Label>
              <Textarea
                id="observacao"
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder="Observações sobre a entrega..."
                className="min-h-[80px]"
              />
            </div>

            <div className="flex justify-end gap-4 pt-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Registrando..." : "Registrar Entrega"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {mensagemUpload && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
          <div
            role="alertdialog"
            aria-live="assertive"
            className="flex w-[320px] flex-col items-center gap-3 rounded-lg bg-white p-6 text-center shadow-2xl"
          >
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-base font-semibold text-gray-900">Enviando anexos</p>
            <p className="text-sm text-gray-600">{mensagemUpload}</p>
          </div>
        </div>
      )}
    </>
  )
}
