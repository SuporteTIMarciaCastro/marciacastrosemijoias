"use client"

import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/auth-context"
import Header from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import CicloFormModal from "@/components/ciclo-form-modal"
import PrestacaoContasModal from "@/components/prestacao-contas-modal"
import PagamentoCicloModal from "@/components/pagamento-ciclo-modal"
import DocumentoUploadModal from "@/components/documento-upload-modal"
import { fetchRevendedora } from "@/lib/firebase/revendedoras"
import { fetchCiclosByRevendedora, removerPagamento, renegociarCiclo } from "@/lib/firebase/ciclos"
import { fetchDocumentosByRevendedora } from "@/lib/firebase/documentos-revendedora"
import {
  DOCUMENTO_TIPO_CODES,
  agruparPorTipo,
  documentosPendentes,
  getDocumentoTipoLabel,
  isDocumentoObrigatorio,
} from "@/lib/documento-revendedora"
import { formatCpf } from "@/lib/cpf"
import { getRevendedoraStatusLabel, getRevendedoraStatusCor } from "@/lib/revendedora-status"
import {
  getStatusEfetivoCiclo,
  getCicloStatusLabel,
  getCicloStatusCor,
  getFormaPagamentoLabel,
  getStatusPagamentoLabel,
  formatarDataBR,
  arredondar2,
} from "@/lib/ciclo-status"
import {
  calcularExposicao,
  classificarLimite,
  percentualDoLimite,
} from "@/lib/alertas-revenda"
import { CICLO_STATUS_ABERTOS } from "@/lib/ciclo-status"
import { motivoBloqueioEntrega, DOCUMENTOS_EXIGIDOS_PARA_ENTREGA } from "@/lib/entrega-regras"
import { fetchVendedores } from "@/lib/firebase/vendedores"
import {
  veApenasProprias,
  vendedorDoUsuario,
  podeLancarPagamento,
  podeEnviarDocumentos,
  podeAutorizarExcecao,
  podeAdicionar as podeAdicionarRevenda,
} from "@/lib/permissoes-revenda"
import AuditoriaLista from "@/components/auditoria-lista"
import { registrarAuditoria, fetchAuditoriaPorRevendedora } from "@/lib/firebase/auditoria"
import type { Ciclo, DocumentoRevendedora, RegistroAuditoria, Revendedora } from "@/types"
import { cn } from "@/lib/utils"
import {
  ArrowLeft,
  FileText,
  Image as ImageIcon,
  PenLine,
  Trash2,
  Check,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Printer,
  FileDown,
} from "lucide-react"

const formatarMoeda = (valor?: number) =>
  typeof valor === "number" ? valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "-"

const formatarWhatsapp = (value?: string | null) => {
  if (!value) return "-"
  const digits = value.replace(/\D/g, "")
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  return value
}

const badge = (texto: string, cor: string) => (
  <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", cor)}>
    {texto}
  </span>
)

const linkAnexo = (url: string | undefined, rotulo: string, Icone: typeof FileText) => {
  if (!url) return null
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
    >
      <Icone className="h-4 w-4" />
      {rotulo}
    </a>
  )
}

const hojeISO = () => new Date().toISOString().slice(0, 10)

export default function RevendedoraDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { user, loading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const [revendedora, setRevendedora] = useState<Revendedora | null>(null)
  const [ciclos, setCiclos] = useState<Ciclo[]>([])
  const [documentos, setDocumentos] = useState<DocumentoRevendedora[]>([])
  const [auditoria, setAuditoria] = useState<RegistroAuditoria[]>([])
  const [gerandoDossie, setGerandoDossie] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [modalDocumento, setModalDocumento] = useState(false)
  const [tipoDocumentoInicial, setTipoDocumentoInicial] = useState<string | undefined>(undefined)
  const [historicoAberto, setHistoricoAberto] = useState<Record<string, boolean>>({})

  const [modalCiclo, setModalCiclo] = useState(false)
  const [autorizando, setAutorizando] = useState(false)
  const [cicloPrestacao, setCicloPrestacao] = useState<Ciclo | null>(null)
  const [cicloPagamento, setCicloPagamento] = useState<Ciclo | null>(null)
  const [cicloRenegociar, setCicloRenegociar] = useState<Ciclo | null>(null)
  const [novaData, setNovaData] = useState(hojeISO())
  const [obsRenegociacao, setObsRenegociacao] = useState("")
  const [novoValor, setNovoValor] = useState("")
  const [pagamentoParaRemover, setPagamentoParaRemover] = useState<{
    cicloId: string
    pagamentoId: string
  } | null>(null)

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.replace("/login")
      return
    }
    if (!user.permissions?.gerenciadorRevendas?.visualizarPage) {
      router.replace("/dashboard")
    }
  }, [user, loading, router])

  const carregar = async () => {
    setIsLoading(true)
    try {
      const [dadosRevendedora, listaCiclos, listaDocumentos, listaVendedores, listaAuditoria] =
        await Promise.all([
          fetchRevendedora(id),
          fetchCiclosByRevendedora(id),
          fetchDocumentosByRevendedora(id),
          fetchVendedores(),
          fetchAuditoriaPorRevendedora(id).catch(() => []),
        ])

      // Carteira restrita: acessar pela URL uma revendedora de outro vendedor
      // devolve para a listagem. Vale também quando não há vínculo nenhum.
      if (veApenasProprias(user)) {
        const vendedor = vendedorDoUsuario(user, listaVendedores)
        if (!vendedor || dadosRevendedora?.vendedorId !== vendedor.id) {
          toast({
            title: "Acesso não permitido",
            description: "Esta revendedora não faz parte da sua carteira.",
            variant: "destructive",
          })
          router.replace("/gerenciador-revendas")
          return
        }
      }

      setRevendedora(dadosRevendedora)
      setCiclos(listaCiclos)
      setDocumentos(listaDocumentos)
      setAuditoria(listaAuditoria)
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados da revendedora",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (user?.permissions?.gerenciadorRevendas?.visualizarPage) {
      carregar()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, id])

  // O dossiê baixa os documentos privados pela rota autenticada, então pode
  // demorar alguns segundos — daí o estado de carregamento.
  const handleDossie = async () => {
    if (!revendedora) return
    setGerandoDossie(true)
    try {
      const { gerarDossiePDF } = await import("@/lib/dossie-pdf")
      await gerarDossiePDF({
        revendedora,
        ciclos,
        documentos,
        geradoPor: user?.name || user?.email || "",
      })
      toast({ title: "Dossiê gerado", description: "O download foi iniciado." })
    } catch (error) {
      console.error("Erro ao gerar dossiê:", error)
      toast({
        title: "Erro",
        description: "Não foi possível gerar o dossiê.",
        variant: "destructive",
      })
    } finally {
      setGerandoDossie(false)
    }
  }

  const handleRemoverPagamento = async () => {
    if (!pagamentoParaRemover) return
    const { cicloId, pagamentoId } = pagamentoParaRemover
    setPagamentoParaRemover(null)
    try {
      const ciclo = ciclos.find((c) => c.id === cicloId)
      const pagamento = (ciclo?.pagamentos ?? []).find((p) => p.id === pagamentoId)
      await removerPagamento(cicloId, pagamentoId)
      toast({ title: "Pagamento removido", description: "O saldo devedor foi recalculado." })
      await registrarAuditoria({
        acao: "pagamento.remover",
        entidade: "ciclo",
        entidadeId: cicloId,
        revendedoraId: id,
        descricao: `Ciclo ${ciclo?.numeroCiclo ?? "?"}: pagamento de ${formatarMoeda(
          pagamento?.valor
        )} removido.`,
        usuarioEmail: user?.email || "",
        usuarioNome: user?.name || "",
      })
      await carregar()
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Não foi possível remover o pagamento",
        variant: "destructive",
      })
    }
  }

  const handleRenegociar = async () => {
    if (!cicloRenegociar) return

    // Campo vazio significa "manter o valor", não zerar.
    const texto = novoValor.trim().replace(/\./g, "").replace(",", ".")
    const valor = texto === "" ? undefined : Number(texto)
    if (valor !== undefined && (!Number.isFinite(valor) || valor < 0)) {
      toast({
        title: "Valor inválido",
        description: "Informe um valor numérico positivo, ou deixe em branco para manter o atual.",
        variant: "destructive",
      })
      return
    }

    try {
      await renegociarCiclo(cicloRenegociar.id, id, novaData, obsRenegociacao, valor)
      toast({
        title: "Ciclo renegociado",
        description: "Novo prazo registrado. A revendedora segue bloqueada até a quitação.",
      })
      await registrarAuditoria({
        acao: "ciclo.renegociar",
        entidade: "ciclo",
        entidadeId: cicloRenegociar.id,
        revendedoraId: id,
        descricao:
          `Ciclo ${cicloRenegociar.numeroCiclo} renegociado. Novo vencimento: ${formatarDataBR(novaData)}` +
          `${valor !== undefined ? `. Novo valor a repassar: ${formatarMoeda(valor)}` : ""}` +
          `${obsRenegociacao.trim() ? `. ${obsRenegociacao.trim()}` : ""}`,
        usuarioEmail: user?.email || "",
        usuarioNome: user?.name || "",
      })
      setCicloRenegociar(null)
      setObsRenegociacao("")
      setNovoValor("")
      await carregar()
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível renegociar o ciclo",
        variant: "destructive",
      })
    }
  }

  if (loading || !user) return null
  if (!user.permissions?.gerenciadorRevendas?.visualizarPage) return null

  const temCicloAberto = Boolean(revendedora?.cicloAbertoId)
  // Prestação, pagamento e renegociação exigem a capacidade financeira;
  // registrar entrega e enviar documento são capacidades separadas.
  const podeEditar = podeLancarPagamento(user)
  const podeAdicionar = podeAdicionarRevenda(user)
  const podeSubirDocumento = podeEnviarDocumentos(user)
  const podeAutorizar = podeAutorizarExcecao(user)

  // Versão atual = primeiro item de cada grupo (ordenado por data desc).
  const documentosPorTipo = agruparPorTipo(documentos)
  const pendentes = documentosPendentes(documentos)

  // Mesma regra usada pela camada de dados em abrirCiclo — importada de um
  // lugar só, para tela e banco nunca divergirem.
  const motivoBloqueio = motivoBloqueioEntrega(revendedora, documentos)

  // Exposição calculada só sobre os ciclos abertos, na leitura.
  const ciclosEmAberto = ciclos.filter((ciclo) => CICLO_STATUS_ABERTOS.includes(ciclo.status))
  const exposicao = calcularExposicao(ciclosEmAberto)
  const classificacao = classificarLimite(exposicao, revendedora?.limiteConsignado)
  const percentual = percentualDoLimite(exposicao, revendedora?.limiteConsignado)

  const abrirEnvio = (tipo?: string) => {
    setTipoDocumentoInicial(tipo)
    setModalDocumento(true)
  }

  return (
    <div className="flex min-h-screen flex-col">
      <div className="print:hidden">
        <Header title="Gerenciador de Revendas" />
      </div>

      <main className="flex-1 p-4 md:p-6 space-y-6">
        {/* print:hidden vem do Tailwind — some só na impressão, sem tocar no globals.css */}
        <div className="flex items-center justify-between print:hidden">
          <Button variant="outline" size="sm" onClick={() => router.push("/gerenciador-revendas")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" />
              Imprimir ficha
            </Button>
            <Button size="sm" onClick={handleDossie} disabled={gerandoDossie}>
              <FileDown className="mr-2 h-4 w-4" />
              {gerandoDossie ? "Gerando..." : "Dossiê PDF"}
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-8">Carregando...</div>
        ) : !revendedora ? (
          <div className="text-center py-8">Revendedora não encontrada</div>
        ) : (
          <>
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <CardTitle>{(revendedora.nome || "").toUpperCase()}</CardTitle>
                  {badge(
                    getRevendedoraStatusLabel(revendedora.status),
                    getRevendedoraStatusCor(revendedora.status)
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">CPF</div>
                    <div className="font-medium">{formatCpf(revendedora.cpf)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">WhatsApp</div>
                    <div className="font-medium">{formatarWhatsapp(revendedora.whatsapp)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Em aberto / Limite</div>
                    <div
                      className={cn(
                        "font-medium",
                        classificacao === "critico"
                          ? "text-red-600"
                          : classificacao === "alerta"
                            ? "text-amber-600"
                            : ""
                      )}
                    >
                      {formatarMoeda(exposicao)} /{" "}
                      {classificacao === "sem_limite"
                        ? "sem limite definido"
                        : formatarMoeda(revendedora.limiteConsignado)}
                      {percentual !== null && ` (${percentual}%)`}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Vendedor responsável</div>
                    <div className="font-medium">{revendedora.vendedorResponsavel || "-"}</div>
                  </div>
                  <div className="md:col-span-2">
                    <div className="text-muted-foreground">Endereço</div>
                    <div className="font-medium">
                      {[
                        revendedora.logradouro,
                        revendedora.numero,
                        revendedora.bairro,
                        revendedora.cidade,
                        revendedora.uf,
                      ]
                        .filter(Boolean)
                        .join(", ") || "-"}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Documentos */}
            <Card>
              <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0">
                <CardTitle>Documentos</CardTitle>
                {podeSubirDocumento && <Button onClick={() => abrirEnvio()}>Enviar Documento</Button>}
              </CardHeader>
              <CardContent>
                {pendentes.length > 0 ? (
                  <div className="mb-4 flex gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
                    <AlertTriangle className="h-5 w-5 shrink-0" />
                    <div>
                      <strong>
                        {pendentes.length} documento{pendentes.length > 1 ? "s" : ""} obrigatório
                        {pendentes.length > 1 ? "s" : ""} faltando:
                      </strong>{" "}
                      {pendentes.map((tipo) => getDocumentoTipoLabel(tipo)).join(", ")}.
                    </div>
                  </div>
                ) : (
                  <div className="mb-4 flex gap-2 rounded-md border border-green-300 bg-green-50 p-3 text-sm text-green-800 dark:border-green-700 dark:bg-green-950 dark:text-green-200">
                    <Check className="h-5 w-5 shrink-0" />
                    <span>Documentação obrigatória completa.</span>
                  </div>
                )}

                <div className="space-y-2">
                  {DOCUMENTO_TIPO_CODES.map((tipo) => {
                    const versoes = documentosPorTipo.get(tipo) ?? []
                    const atual = versoes[0]
                    const anteriores = versoes.slice(1)
                    const obrigatorio = isDocumentoObrigatorio(tipo)
                    const aberto = historicoAberto[tipo]

                    return (
                      <div key={tipo} className="rounded-md border p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {atual ? (
                              <Check className="h-4 w-4 text-green-600" />
                            ) : obrigatorio ? (
                              <AlertTriangle className="h-4 w-4 text-amber-600" />
                            ) : (
                              <span className="h-4 w-4" />
                            )}
                            <span className="text-sm font-medium">
                              {getDocumentoTipoLabel(tipo)}
                              {obrigatorio && <span className="text-red-500"> *</span>}
                            </span>
                            {!atual && DOCUMENTOS_EXIGIDOS_PARA_ENTREGA.includes(tipo) && (
                              <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-950 dark:text-red-300">
                                bloqueia entrega
                              </span>
                            )}
                            {versoes.length > 1 && (
                              <span className="text-xs text-muted-foreground">
                                v{versoes.length}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3">
                            {atual && linkAnexo(atual.driveUrl, "Abrir", FileText)}
                            {podeSubirDocumento && (
                              <Button variant="outline" size="sm" onClick={() => abrirEnvio(tipo)}>
                                {atual ? "Nova versão" : "Enviar"}
                              </Button>
                            )}
                          </div>
                        </div>

                        {atual ? (
                          <div className="mt-2 text-xs text-muted-foreground">
                            Enviado em {new Date(atual.enviadoEm).toLocaleString("pt-BR")}
                            {atual.enviadoPorNome || atual.enviadoPorEmail
                              ? ` por ${atual.enviadoPorNome || atual.enviadoPorEmail}`
                              : ""}
                          </div>
                        ) : (
                          <div className="mt-2 text-xs text-muted-foreground">
                            Nenhum arquivo enviado.
                          </div>
                        )}

                        {anteriores.length > 0 && (
                          <div className="mt-2">
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                              onClick={() =>
                                setHistoricoAberto((prev) => ({ ...prev, [tipo]: !prev[tipo] }))
                              }
                            >
                              {aberto ? (
                                <ChevronDown className="h-3 w-3" />
                              ) : (
                                <ChevronRight className="h-3 w-3" />
                              )}
                              ver versões anteriores ({anteriores.length})
                            </button>

                            {/* Sempre no DOM: colapsado some da tela, mas aparece
                                na impressão, para a ficha sair completa. */}
                            {(
                              <ul
                                className={cn(
                                  "mt-2 space-y-1 border-l pl-3",
                                  !aberto && "hidden print:block"
                                )}
                              >
                                {anteriores.map((versao, indice) => (
                                  <li
                                    key={versao.id}
                                    className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"
                                  >
                                    <span>
                                      v{anteriores.length - indice} ·{" "}
                                      {new Date(versao.enviadoEm).toLocaleString("pt-BR")}
                                      {versao.enviadoPorNome || versao.enviadoPorEmail
                                        ? ` · ${versao.enviadoPorNome || versao.enviadoPorEmail}`
                                        : ""}
                                    </span>
                                    {linkAnexo(versao.driveUrl, "Abrir", FileText)}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0">
                <CardTitle>Ciclos de Consignação</CardTitle>
                {podeAdicionar && (
                  <div className="flex flex-col items-start md:items-end gap-1 print:hidden">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        onClick={() => {
                          setAutorizando(false)
                          setModalCiclo(true)
                        }}
                        disabled={temCicloAberto || !!motivoBloqueio}
                      >
                        Nova Entrega
                      </Button>
                      {/* Caminho de exceção: só aparece quando há pendência E o
                          usuário tem permissão para autorizar. */}
                      {(temCicloAberto || motivoBloqueio) && podeAutorizar && (
                        <Button
                          variant="outline"
                          onClick={() => {
                            setAutorizando(true)
                            setModalCiclo(true)
                          }}
                        >
                          Autorizar entrega
                        </Button>
                      )}
                    </div>
                    {temCicloAberto ? (
                      <span className="text-xs text-amber-600 dark:text-amber-500 md:text-right md:max-w-xs">
                        Há um ciclo em aberto. Conclua a prestação de contas e o pagamento para
                        registrar uma nova entrega
                        {podeAutorizar ? ", ou autorize uma entrega adicional com justificativa." : "."}
                      </span>
                    ) : (
                      motivoBloqueio && (
                        <span className="text-xs text-red-600 dark:text-red-400 md:text-right md:max-w-xs">
                          {motivoBloqueio}
                        </span>
                      )
                    )}
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {ciclos.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    Nenhuma entrega registrada para esta revendedora.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {ciclos.map((ciclo) => {
                      const statusEfetivo = getStatusEfetivoCiclo(ciclo)
                      const estaAberto = ciclo.id === revendedora.cicloAbertoId
                      // Acesso defensivo: ciclos encerrados pelo fluxo antigo não
                      // possuem prestação nem pagamentos.
                      const prestacao = ciclo.prestacaoContas
                      const pagamentos = ciclo.pagamentos ?? []
                      const totalPago = ciclo.totalPago ?? 0
                      const saldoDevedor = prestacao
                        ? arredondar2(Math.max(0, prestacao.valorRepassar - totalPago))
                        : 0

                      return (
                        <div key={ciclo.id} className="border rounded-lg p-4 bg-card">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold">Ciclo {ciclo.numeroCiclo}</span>
                              {badge(getCicloStatusLabel(statusEfetivo), getCicloStatusCor(statusEfetivo))}
                              {ciclo.statusPagamento && (
                                <span className="text-xs text-muted-foreground">
                                  Pagamento: {getStatusPagamentoLabel(ciclo.statusPagamento)}
                                </span>
                              )}
                            </div>

                            {estaAberto && podeEditar && (
                              <div className="flex flex-wrap gap-2">
                                <Button variant="outline" size="sm" onClick={() => setCicloPrestacao(ciclo)}>
                                  {prestacao ? "Corrigir prestação" : "Prestar contas"}
                                </Button>
                                {prestacao && (
                                  <>
                                    <Button size="sm" onClick={() => setCicloPagamento(ciclo)}>
                                      Registrar pagamento
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setCicloRenegociar(ciclo)
                                        setNovaData(ciclo.dataEncerramentoPrevista || hojeISO())
                                        setObsRenegociacao("")
                                      }}
                                    >
                                      Renegociar
                                    </Button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
                            <div>
                              <div className="text-muted-foreground">Entrega</div>
                              <div className="font-medium">{formatarDataBR(ciclo.dataEntrega)}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Prazo</div>
                              <div className="font-medium">{ciclo.prazoDias} dias</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Vencimento</div>
                              <div className="font-medium">
                                {formatarDataBR(ciclo.dataEncerramentoPrevista)}
                              </div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">
                                {ciclo.dataEncerramentoReal ? "Encerrado em" : "Vendedor"}
                              </div>
                              <div className="font-medium">
                                {ciclo.dataEncerramentoReal
                                  ? formatarDataBR(ciclo.dataEncerramentoReal)
                                  : ciclo.vendedorEntregaNome || "-"}
                              </div>
                            </div>
                          </div>

                          {(ciclo.romaneioUrl || ciclo.fotoEntregaUrl || ciclo.assinaturaUrl) && (
                            <div className="mt-3 flex flex-wrap gap-4">
                              {linkAnexo(ciclo.romaneioUrl, "Romaneio", FileText)}
                              {linkAnexo(ciclo.fotoEntregaUrl, "Foto da entrega", ImageIcon)}
                              {linkAnexo(ciclo.assinaturaUrl, "Romaneio assinado", PenLine)}
                            </div>
                          )}

                          {/* Autorização de exceção na abertura do ciclo */}
                          {ciclo.autorizacao && (
                            <div className="mt-3 rounded-md border border-red-300 bg-red-50 p-2 text-xs text-red-800 dark:border-red-700 dark:bg-red-950 dark:text-red-200">
                              <strong>Entrega autorizada com pendência.</strong>{" "}
                              {ciclo.autorizacao.motivoBloqueio}. Justificativa:{" "}
                              {ciclo.autorizacao.justificativa} — por{" "}
                              {ciclo.autorizacao.autorizadoPorNome ||
                                ciclo.autorizacao.autorizadoPorEmail}{" "}
                              em {new Date(ciclo.autorizacao.autorizadoEm).toLocaleString("pt-BR")}
                            </div>
                          )}

                          {/* Entregas adicionais dentro deste ciclo */}
                          {(ciclo.entregasAdicionais ?? []).length > 0 && (
                            <div className="mt-3 rounded-md border p-3">
                              <div className="text-sm font-medium">
                                Entregas adicionais ({(ciclo.entregasAdicionais ?? []).length})
                              </div>
                              <ul className="mt-2 space-y-2 text-sm">
                                {(ciclo.entregasAdicionais ?? []).map((extra) => (
                                  <li key={extra.id} className="border-b last:border-b-0 pb-2">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <span>
                                        {formatarDataBR(extra.dataEntrega)}
                                        {typeof extra.valorEntregue === "number"
                                          ? ` · ${formatarMoeda(extra.valorEntregue)}`
                                          : ""}
                                        {extra.vendedorEntregaNome
                                          ? ` · ${extra.vendedorEntregaNome}`
                                          : ""}
                                      </span>
                                      <span className="flex flex-wrap gap-3">
                                        {linkAnexo(extra.romaneioUrl, "Romaneio", FileText)}
                                        {linkAnexo(extra.fotoEntregaUrl, "Foto", ImageIcon)}
                                        {linkAnexo(extra.assinaturaUrl, "Assinado", PenLine)}
                                      </span>
                                    </div>
                                    <div className="mt-1 text-xs text-red-700 dark:text-red-300">
                                      {extra.autorizacao.motivoBloqueio}. Justificativa:{" "}
                                      {extra.autorizacao.justificativa} — por{" "}
                                      {extra.autorizacao.autorizadoPorNome ||
                                        extra.autorizacao.autorizadoPorEmail}
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Prestação de contas */}
                          {prestacao ? (
                            <div className="mt-4 rounded-md border bg-secondary/40 p-3">
                              <div className="text-sm font-medium mb-2">
                                Prestação de contas — {formatarDataBR(prestacao.dataPrestacao)}
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                                <div>
                                  <div className="text-muted-foreground">Vendido</div>
                                  <div>{formatarMoeda(prestacao.valorVendido)}</div>
                                </div>
                                <div>
                                  <div className="text-muted-foreground">Devolvido</div>
                                  <div>{formatarMoeda(prestacao.valorDevolvido)}</div>
                                </div>
                                <div>
                                  <div className="text-muted-foreground">Em falta</div>
                                  <div>{formatarMoeda(prestacao.valorFalta)}</div>
                                </div>
                                <div>
                                  <div className="text-muted-foreground">
                                    Comissão ({prestacao.percentualComissao}%)
                                  </div>
                                  <div>− {formatarMoeda(prestacao.valorComissao)}</div>
                                </div>
                                <div>
                                  <div className="text-muted-foreground">A repassar</div>
                                  <div className="font-semibold">
                                    {formatarMoeda(prestacao.valorRepassar)}
                                  </div>
                                  {typeof prestacao.valorRepassarOriginal === "number" && (
                                    <div className="text-xs text-muted-foreground line-through">
                                      {formatarMoeda(prestacao.valorRepassarOriginal)}
                                    </div>
                                  )}
                                </div>
                              </div>
                              {prestacao.observacao && (
                                <p className="mt-2 text-sm text-muted-foreground">
                                  {prestacao.observacao}
                                </p>
                              )}

                              {/* Extrato de pagamentos */}
                              <div className="mt-3 border-t pt-3">
                                <div className="flex items-center justify-between text-sm font-medium">
                                  <span>Pagamentos</span>
                                  <span>
                                    Pago {formatarMoeda(totalPago)} · Saldo{" "}
                                    <span className={saldoDevedor > 0 ? "text-red-600" : "text-green-600"}>
                                      {formatarMoeda(saldoDevedor)}
                                    </span>
                                  </span>
                                </div>

                                {pagamentos.length === 0 ? (
                                  <p className="mt-2 text-sm text-muted-foreground">
                                    Nenhum pagamento registrado.
                                  </p>
                                ) : (
                                  <ul className="mt-2 space-y-1 text-sm">
                                    {pagamentos.map((pagamento) => (
                                      <li
                                        key={pagamento.id}
                                        className="flex flex-wrap items-center justify-between gap-2 border-b last:border-b-0 py-1"
                                      >
                                        <span>
                                          {formatarDataBR(pagamento.data)} ·{" "}
                                          {getFormaPagamentoLabel(pagamento.forma)} ·{" "}
                                          <strong>{formatarMoeda(pagamento.valor)}</strong>
                                        </span>
                                        <span className="flex items-center gap-3">
                                          {linkAnexo(pagamento.comprovanteUrl, "Comprovante", FileText)}
                                          {ciclo.status !== "encerrado" && podeEditar && (
                                            <button
                                              type="button"
                                              className="text-red-600 hover:text-red-800"
                                              onClick={() =>
                                                setPagamentoParaRemover({
                                                  cicloId: ciclo.id,
                                                  pagamentoId: pagamento.id,
                                                })
                                              }
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </button>
                                          )}
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            </div>
                          ) : ciclo.status === "encerrado" ? (
                            <p className="mt-3 text-sm text-muted-foreground">
                              Encerrado — sem prestação de contas registrada.
                            </p>
                          ) : null}

                          {ciclo.observacao && (
                            <p className="mt-3 text-sm text-muted-foreground">
                              <span className="font-medium">Observação:</span> {ciclo.observacao}
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Histórico de alterações desta revendedora */}
            <Card>
              <CardHeader>
                <CardTitle>Histórico de Alterações</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Registra apenas ações feitas pelo sistema. Alterações diretas no banco não
                  aparecem aqui.
                </p>
              </CardHeader>
              <CardContent>
                <AuditoriaLista
                  registros={auditoria}
                  vazio="Nenhuma ação registrada para esta revendedora."
                />
              </CardContent>
            </Card>
          </>
        )}
      </main>

      {revendedora && (
        <>
          <CicloFormModal
            isOpen={modalCiclo}
            onClose={() => setModalCiclo(false)}
            revendedoraId={id}
            revendedoraNome={revendedora.nome}
            prazoPadraoDias={revendedora.prazoPadraoDias}
            motivoBloqueio={autorizando ? motivoBloqueio : null}
            cicloAbertoId={autorizando ? revendedora.cicloAbertoId : null}
            podeAutorizar={podeAutorizar}
            onSuccess={carregar}
          />
          <PrestacaoContasModal
            isOpen={!!cicloPrestacao}
            onClose={() => setCicloPrestacao(null)}
            ciclo={cicloPrestacao}
            revendedoraId={id}
            onSuccess={carregar}
          />
          <PagamentoCicloModal
            isOpen={!!cicloPagamento}
            onClose={() => setCicloPagamento(null)}
            ciclo={cicloPagamento}
            revendedoraId={id}
            onSuccess={carregar}
          />
          <DocumentoUploadModal
            isOpen={modalDocumento}
            onClose={() => {
              setModalDocumento(false)
              setTipoDocumentoInicial(undefined)
            }}
            revendedoraId={id}
            tipoInicial={tipoDocumentoInicial}
            onSuccess={carregar}
          />
        </>
      )}

      {/* Renegociação */}
      <Dialog open={!!cicloRenegociar} onOpenChange={() => setCicloRenegociar(null)}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Renegociar ciclo {cicloRenegociar?.numeroCiclo}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="novaData">Novo vencimento</Label>
              <Input
                id="novaData"
                type="date"
                value={novaData}
                onChange={(e) => setNovaData(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="novoValor">Novo valor a repassar (R$)</Label>
              <Input
                id="novoValor"
                value={novoValor}
                onChange={(e) => setNovoValor(e.target.value)}
                placeholder={
                  cicloRenegociar?.prestacaoContas
                    ? formatarMoeda(cicloRenegociar.prestacaoContas.valorRepassar)
                    : "0,00"
                }
                inputMode="decimal"
              />
              <p className="text-xs text-muted-foreground">
                Deixe em branco para manter o valor atual. O valor apurado originalmente fica
                guardado no histórico.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="obsRenegociacao">Observação</Label>
              <Textarea
                id="obsRenegociacao"
                value={obsRenegociacao}
                onChange={(e) => setObsRenegociacao(e.target.value)}
                placeholder="Condições acordadas..."
                className="min-h-[70px]"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              A revendedora continua bloqueada para novas entregas até a quitação. Os pagamentos
              seguem sendo registrados normalmente.
            </p>
            <div className="flex justify-end gap-4">
              <Button variant="outline" onClick={() => setCicloRenegociar(null)}>
                Cancelar
              </Button>
              <Button onClick={handleRenegociar}>Renegociar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pagamentoParaRemover} onOpenChange={() => setPagamentoParaRemover(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover pagamento</AlertDialogTitle>
            <AlertDialogDescription>
              O valor será descontado do total pago e o saldo devedor recalculado. Esta ação não pode
              ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoverPagamento}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
