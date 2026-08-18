"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/auth-context"
import Header from "@/components/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { ActionsMenu } from "@/components/actions-menu"
import RevendedoraFormModal from "@/components/revendedora-form-modal"
import VendedorFormModal from "@/components/vendedor-form-modal"
import {
  fetchRevendedoras,
  deleteRevendedora,
  countRevendedorasByVendedor,
} from "@/lib/firebase/revendedoras"
import { fetchVendedores, deleteVendedor } from "@/lib/firebase/vendedores"
import { fetchTodosDocumentos } from "@/lib/firebase/documentos-revendedora"
import { documentosPendentes } from "@/lib/documento-revendedora"
import { fetchCiclosAbertos } from "@/lib/firebase/ciclos"
import {
  filtrarPorCarteira,
  podeAdicionar as podeAdicionarRevenda,
  podeGerenciarVendedores,
  podeVerRelatorios,
} from "@/lib/permissoes-revenda"
import {
  montarSituacoes,
  montarRelatorioVendedores,
  saldoDevedorApurado,
  maxDiasEmAtraso,
  LIMITE_ALERTA,
} from "@/lib/alertas-revenda"
import { formatCpf, normalizeCpf } from "@/lib/cpf"
import { rotuloContagem } from "@/lib/ciclo-status"
import {
  REVENDEDORA_STATUS_CODES,
  getRevendedoraStatusLabel,
  getRevendedoraStatusCor,
} from "@/lib/revendedora-status"
import {
  VENDEDOR_STATUS_CODES,
  getVendedorStatusLabel,
  getVendedorStatusCor,
} from "@/lib/vendedor-status"
import AuditoriaLista from "@/components/auditoria-lista"
import { registrarAuditoria, fetchAuditoriaPaginada } from "@/lib/firebase/auditoria"
import { ACAO_CODES, getAcaoLabel } from "@/lib/auditoria"
import type {
  Ciclo,
  DocumentoRevendedora,
  RegistroAuditoria,
  Revendedora,
  Vendedor,
} from "@/types"
import { cn } from "@/lib/utils"
import { Filter, X, AlertTriangle, Clock, Gauge, HelpCircle, CalendarClock } from "lucide-react"

const formatarWhatsapp = (value?: string | null) => {
  if (!value) return "-"
  const digits = value.replace(/\D/g, "")
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  return value
}

const formatarMoeda = (valor?: number) =>
  typeof valor === "number"
    ? valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    : "-"

const badge = (texto: string, cor: string) => (
  <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", cor)}>
    {texto}
  </span>
)

export default function GerenciadorRevendasPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const [revendedoras, setRevendedoras] = useState<Revendedora[]>([])
  const [vendedores, setVendedores] = useState<Vendedor[]>([])
  const [documentos, setDocumentos] = useState<DocumentoRevendedora[]>([])
  const [ciclosAbertos, setCiclosAbertos] = useState<Ciclo[]>([])
  const [alertaFiltro, setAlertaFiltro] = useState<"nenhum" | "atraso" | "a_vencer" | "limite" | "sem_limite">(
    "nenhum"
  )
  const [ordenacao, setOrdenacao] = useState<"valor" | "dias">("valor")

  // Auditoria: única coleção do módulo que cresce indefinidamente, por isso
  // paginada em vez de carregada por inteiro.
  const [auditoria, setAuditoria] = useState<RegistroAuditoria[]>([])
  const [auditoriaLastDoc, setAuditoriaLastDoc] = useState<any>(null)
  const [carregandoAuditoria, setCarregandoAuditoria] = useState(false)
  const [acaoFiltro, setAcaoFiltro] = useState("todas")

  const carregarMaisAuditoria = async (reiniciar = false) => {
    setCarregandoAuditoria(true)
    try {
      const { registros, lastDoc } = await fetchAuditoriaPaginada(
        30,
        reiniciar ? undefined : auditoriaLastDoc ?? undefined
      )
      setAuditoria((prev) => (reiniciar ? registros : [...prev, ...registros]))
      setAuditoriaLastDoc(registros.length < 30 ? null : lastDoc)
    } catch (error) {
      console.error("Erro ao carregar auditoria:", error)
    } finally {
      setCarregandoAuditoria(false)
    }
  }
  const [isLoading, setIsLoading] = useState(true)

  // Aba Revendedoras
  const [busca, setBusca] = useState("")
  const [statusFiltro, setStatusFiltro] = useState("todos")
  const [modalRevendedora, setModalRevendedora] = useState(false)
  const [revendedoraSelecionada, setRevendedoraSelecionada] = useState<string | undefined>(undefined)
  const [revendedoraParaExcluir, setRevendedoraParaExcluir] = useState<string | null>(null)

  // Aba Vendedores
  const [buscaVendedor, setBuscaVendedor] = useState("")
  const [statusVendedorFiltro, setStatusVendedorFiltro] = useState("todos")
  const [modalVendedor, setModalVendedor] = useState(false)
  const [vendedorSelecionado, setVendedorSelecionado] = useState<string | undefined>(undefined)
  const [vendedorParaExcluir, setVendedorParaExcluir] = useState<string | null>(null)

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
      const [listaRevendedoras, listaVendedores, listaDocumentos, listaCiclosAbertos] =
        await Promise.all([
          fetchRevendedoras(),
          fetchVendedores(),
          fetchTodosDocumentos(),
          fetchCiclosAbertos(),
        ])
      setRevendedoras(listaRevendedoras)
      setVendedores(listaVendedores)
      setDocumentos(listaDocumentos)
      setCiclosAbertos(listaCiclosAbertos)
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados do gerenciador",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (user?.permissions?.gerenciadorRevendas?.visualizarPage) {
      carregar()
      carregarMaisAuditoria(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const vendedoresPorId = useMemo(
    () => new Map(vendedores.map((v) => [v.id, v])),
    [vendedores]
  )

  // Resolve o nome do vendedor em cascata:
  // 1. vínculo válido → nome atual (sobrevive a renomeação)
  // 2. vínculo órfão → nome gravado no salvamento
  // 3. registro legado (sem vínculo) → texto livre digitado à mão
  const nomeDoVendedor = (item: Revendedora): string => {
    if (item.vendedorId) {
      const vendedor = vendedoresPorId.get(item.vendedorId)
      if (vendedor) return vendedor.nome
    }
    return item.vendedorResponsavel || "-"
  }

  // Vínculos calculados em memória — as revendedoras já estão todas carregadas,
  // então não custa nenhuma query adicional.
  // Pendências de documento por revendedora, agrupadas em memória a partir de
  // uma consulta única — evita uma query por linha da tabela.
  const pendenciasPorRevendedora = useMemo(() => {
    const porRevendedora = new Map<string, { tipo: string }[]>()
    for (const documento of documentos) {
      const atual = porRevendedora.get(documento.revendedoraId) ?? []
      atual.push({ tipo: documento.tipo })
      porRevendedora.set(documento.revendedoraId, atual)
    }
    const mapa = new Map<string, number>()
    for (const item of revendedoras) {
      mapa.set(item.id, documentosPendentes(porRevendedora.get(item.id) ?? []).length)
    }
    return mapa
  }, [documentos, revendedoras])

  const revendedorasPorVendedor = useMemo(() => {
    const mapa = new Map<string, string[]>()
    for (const item of revendedoras) {
      if (!item.vendedorId) continue
      const atual = mapa.get(item.vendedorId) ?? []
      atual.push(item.nome || "")
      mapa.set(item.vendedorId, atual)
    }
    return mapa
  }, [revendedoras])

  // Situação calculada na leitura, sem nada gravado e sem job agendado.
  const situacoes = useMemo(
    () => montarSituacoes(revendedoras, ciclosAbertos),
    [revendedoras, ciclosAbertos]
  )

  // --- Relatórios (agregação sobre os dados já carregados) ---

  const inadimplentes = useMemo(() => {
    const porRevendedora = new Map<string, typeof ciclosAbertos>()
    for (const ciclo of ciclosAbertos) {
      const atual = porRevendedora.get(ciclo.revendedoraId) ?? []
      atual.push(ciclo)
      porRevendedora.set(ciclo.revendedoraId, atual)
    }

    return revendedoras
      .map((item) => {
        const ciclos = porRevendedora.get(item.id) ?? []
        const situacao = situacoes.get(item.id)
        return {
          revendedora: item,
          saldoDevedor: saldoDevedorApurado(ciclos),
          exposicao: situacao?.exposicao ?? 0,
          diasAtraso: maxDiasEmAtraso(ciclos),
          emAtraso: situacao?.emAtraso ?? false,
        }
      })
      // Inadimplência = atrasado OU com saldo já apurado em aberto.
      // Mercadoria entregue dentro do prazo não é dívida, é ciclo em andamento.
      .filter((linha) => linha.emAtraso || linha.saldoDevedor > 0)
      .sort((a, b) =>
        ordenacao === "dias" ? b.diasAtraso - a.diasAtraso : b.saldoDevedor - a.saldoDevedor
      )
  }, [revendedoras, ciclosAbertos, situacoes, ordenacao])

  const relatorioVendedores = useMemo(
    () => montarRelatorioVendedores(vendedores, revendedoras, situacoes, pendenciasPorRevendedora),
    [vendedores, revendedoras, situacoes, pendenciasPorRevendedora]
  )

  const resumo = useMemo(() => {
    let atraso = 0
    let aVencer = 0
    let limite = 0
    let semLimite = 0
    for (const situacao of situacoes.values()) {
      if (situacao.emAtraso) atraso++
      if (situacao.prestesAVencer) aVencer++
      if (situacao.classificacao === "alerta" || situacao.classificacao === "critico") limite++
      if (situacao.classificacao === "sem_limite") semLimite++
    }
    return { atraso, aVencer, limite, semLimite }
  }, [situacoes])

  // Restrição de carteira: falha fechada — usuário restrito e sem vínculo vê
  // lista vazia, nunca a lista inteira.
  const carteira = useMemo(
    () => filtrarPorCarteira(user, revendedoras, vendedores),
    [user, revendedoras, vendedores]
  )

  const revendedorasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    const termoCpf = normalizeCpf(busca)
    return carteira.lista.filter((item) => {
      if (statusFiltro !== "todos" && item.status !== statusFiltro) return false

      // O filtro de alerta compõe com a busca e o filtro de status.
      if (alertaFiltro !== "nenhum") {
        const situacao = situacoes.get(item.id)
        if (!situacao) return false
        if (alertaFiltro === "atraso" && !situacao.emAtraso) return false
        if (alertaFiltro === "a_vencer" && !situacao.prestesAVencer) return false
        if (
          alertaFiltro === "limite" &&
          situacao.classificacao !== "alerta" &&
          situacao.classificacao !== "critico"
        )
          return false
        if (alertaFiltro === "sem_limite" && situacao.classificacao !== "sem_limite") return false
      }

      if (!termo) return true
      if ((item.nome || "").toLowerCase().includes(termo)) return true
      if (termoCpf.length >= 3 && (item.cpf || "").includes(termoCpf)) return true
      return false
    })
  }, [carteira, busca, statusFiltro, alertaFiltro, situacoes])

  const vendedoresFiltrados = useMemo(() => {
    const termo = buscaVendedor.trim().toLowerCase()
    const termoCpf = normalizeCpf(buscaVendedor)
    return vendedores.filter((item) => {
      if (statusVendedorFiltro !== "todos" && item.status !== statusVendedorFiltro) return false
      if (!termo) return true
      if ((item.nome || "").toLowerCase().includes(termo)) return true
      if (termoCpf.length >= 3 && (item.cpf || "").includes(termoCpf)) return true
      return false
    })
  }, [vendedores, buscaVendedor, statusVendedorFiltro])

  const handleExcluirRevendedora = async (id: string) => {
    setRevendedoraParaExcluir(null)
    try {
      const alvo = revendedoras.find((item) => item.id === id)
      await deleteRevendedora(id)
      setRevendedoras((prev) => prev.filter((item) => item.id !== id))
      toast({ title: "Sucesso", description: "Revendedora removida com sucesso" })
      await registrarAuditoria({
        acao: "revendedora.excluir",
        entidade: "revendedora",
        entidadeId: id,
        revendedoraId: id,
        descricao: `Revendedora ${alvo?.nome ?? id} excluída.`,
        usuarioEmail: user?.email || "",
        usuarioNome: user?.name || "",
      })
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível remover a revendedora",
        variant: "destructive",
      })
    }
  }

  const handleExcluirVendedor = async (id: string) => {
    setVendedorParaExcluir(null)
    try {
      // Checagem no servidor: a lista em memória pode estar desatualizada e
      // liberar uma exclusão que deixaria revendedoras com vínculo órfão.
      const vinculadas = await countRevendedorasByVendedor(id)
      if (vinculadas > 0) {
        toast({
          title: "Vendedor não pode ser excluído",
          description: `Há ${vinculadas} revendedora(s) vinculada(s) a este vendedor. Desative-o em vez de excluir.`,
          variant: "destructive",
        })
        return
      }

      const alvo = vendedores.find((item) => item.id === id)
      await deleteVendedor(id)
      setVendedores((prev) => prev.filter((item) => item.id !== id))
      toast({ title: "Sucesso", description: "Vendedor removido com sucesso" })
      await registrarAuditoria({
        acao: "vendedor.excluir",
        entidade: "vendedor",
        entidadeId: id,
        descricao: `Vendedor ${alvo?.nome ?? id} excluído.`,
        usuarioEmail: user?.email || "",
        usuarioNome: user?.name || "",
      })
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível remover o vendedor",
        variant: "destructive",
      })
    }
  }

  if (loading || !user) return null
  if (!user.permissions?.gerenciadorRevendas?.visualizarPage) return null

  const podeAdicionar = podeAdicionarRevenda(user)
  const mostrarAbaVendedores = podeGerenciarVendedores(user)
  const mostrarAbaRelatorios = podeVerRelatorios(user)

  return (
    <div className="flex min-h-screen flex-col">
      <Header title="Gerenciador de Revendas" />

      <main className="flex-1 p-4 md:p-6">
        <Tabs defaultValue="revendedoras">
          <TabsList className="mb-4">
            <TabsTrigger value="revendedoras">Revendedoras</TabsTrigger>
            {mostrarAbaVendedores && <TabsTrigger value="vendedores">Vendedores</TabsTrigger>}
            {mostrarAbaRelatorios && <TabsTrigger value="relatorios">Relatórios</TabsTrigger>}
            {mostrarAbaRelatorios && <TabsTrigger value="auditoria">Auditoria</TabsTrigger>}
          </TabsList>

          {carteira.semVinculo && (
            <div className="mb-4 flex gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <div>
                Seu acesso está limitado às suas próprias revendedoras, mas seu usuário ainda não
                está vinculado a nenhum vendedor. Peça a um administrador para editar o cadastro do
                vendedor na aba Vendedores e selecionar seu login no campo &quot;Usuário do sistema
                vinculado&quot;.
              </div>
            </div>
          )}

          {/* ---------------- Aba Revendedoras ---------------- */}
          <TabsContent value="revendedoras">
            <Card>
              <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0">
                <CardTitle>Revendedoras</CardTitle>
                {podeAdicionar && (
                  <Button
                    onClick={() => {
                      setRevendedoraSelecionada(undefined)
                      setModalRevendedora(true)
                    }}
                  >
                    Adicionar Revendedora
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {/* Painel de alertas — tudo calculado na leitura */}
                <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    {
                      chave: "atraso" as const,
                      icone: Clock,
                      total: resumo.atraso,
                      titulo: resumo.atraso === 1 ? "revendedora em atraso" : "revendedoras em atraso",
                      cor: "border-red-300 bg-red-50 text-red-800 dark:border-red-700 dark:bg-red-950 dark:text-red-200",
                    },
                    {
                      chave: "a_vencer" as const,
                      icone: CalendarClock,
                      total: resumo.aVencer,
                      titulo:
                        resumo.aVencer === 1
                          ? "prestes a atrasar"
                          : "prestes a atrasar",
                      cor: "border-orange-300 bg-orange-50 text-orange-800 dark:border-orange-700 dark:bg-orange-950 dark:text-orange-200",
                    },
                    {
                      chave: "limite" as const,
                      icone: Gauge,
                      total: resumo.limite,
                      titulo: `no limite (${LIMITE_ALERTA}% ou mais)`,
                      cor: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200",
                    },
                    {
                      chave: "sem_limite" as const,
                      icone: HelpCircle,
                      total: resumo.semLimite,
                      titulo: "sem limite definido",
                      cor: "border-gray-300 bg-gray-50 text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300",
                    },
                  ].map((card) => {
                    const ativo = alertaFiltro === card.chave
                    const Icone = card.icone
                    return (
                      <button
                        key={card.chave}
                        type="button"
                        onClick={() =>
                          setAlertaFiltro((atual) => (atual === card.chave ? "nenhum" : card.chave))
                        }
                        className={cn(
                          "flex items-center gap-3 rounded-md border p-3 text-left transition",
                          card.cor,
                          ativo ? "ring-2 ring-offset-1 ring-current" : "hover:opacity-80",
                          card.total === 0 && "opacity-60"
                        )}
                      >
                        <Icone className="h-5 w-5 shrink-0" />
                        <span className="text-sm">
                          <strong className="text-lg">{card.total}</strong> {card.titulo}
                        </span>
                      </button>
                    )
                  })}
                </div>
                {alertaFiltro !== "nenhum" && (
                  <div className="mb-4 text-xs text-muted-foreground">
                    Filtrando por alerta.{" "}
                    <button
                      type="button"
                      className="text-blue-600 hover:text-blue-800"
                      onClick={() => setAlertaFiltro("nenhum")}
                    >
                      limpar
                    </button>
                  </div>
                )}

                <div className="mb-6 space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground/80">
                    <Filter className="h-4 w-4" />
                    Filtros
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2">
                      <Input
                        placeholder="Pesquisar por nome ou CPF"
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                      />
                    </div>
                    <div>
                      <Select value={statusFiltro} onValueChange={setStatusFiltro}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Filtrar por Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todos os status</SelectItem>
                          {REVENDEDORA_STATUS_CODES.map((codigo) => (
                            <SelectItem key={codigo} value={codigo}>
                              {getRevendedoraStatusLabel(codigo)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setBusca("")
                          setStatusFiltro("todos")
                        }}
                        className="flex items-center gap-2 w-full"
                      >
                        <X className="h-4 w-4" />
                        Limpar Filtros
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Cards mobile */}
                <div className="md:hidden space-y-3">
                  {isLoading ? (
                    <div className="text-center py-4">Carregando...</div>
                  ) : revendedorasFiltradas.length === 0 ? (
                    <div className="text-center py-4">Nenhuma revendedora encontrada</div>
                  ) : (
                    revendedorasFiltradas.map((item) => (
                      <div key={item.id} className="border rounded-lg p-3 bg-card">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 font-semibold text-sm">
                            {(item.nome || "").toUpperCase()}
                            {(pendenciasPorRevendedora.get(item.id) ?? 0) > 0 && (
                              <AlertTriangle className="h-4 w-4 text-amber-600" />
                            )}
                            {situacoes.get(item.id)?.emAtraso && (
                              <Clock className="h-4 w-4 text-red-600" />
                            )}
                            {situacoes.get(item.id)?.prestesAVencer && (
                              <span className="rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-semibold text-orange-800 dark:bg-orange-950 dark:text-orange-200">
                                {rotuloContagem(situacoes.get(item.id)!.diasParaVencer ?? 0)}
                              </span>
                            )}
                          </div>
                          <ActionsMenu
                            pageType="gerenciadorRevendas"
                            itemId={item.id}
                            onView={() => router.push(`/gerenciador-revendas/revendedora/${item.id}`)}
                            onEdit={() => {
                              setRevendedoraSelecionada(item.id)
                              setModalRevendedora(true)
                            }}
                            onDelete={() => setRevendedoraParaExcluir(item.id)}
                          />
                        </div>
                        <div className="mt-2">
                          {badge(getRevendedoraStatusLabel(item.status), getRevendedoraStatusCor(item.status))}
                        </div>
                        <div className="mt-2 grid grid-cols-1 gap-1 text-sm text-muted-foreground">
                          <div><span className="font-medium">CPF:</span> {formatCpf(item.cpf)}</div>
                          <div><span className="font-medium">WhatsApp:</span> {formatarWhatsapp(item.whatsapp)}</div>
                          <div><span className="font-medium">Vendedor:</span> {nomeDoVendedor(item)}</div>
                          <div>
                            <span className="font-medium">Em aberto:</span>{" "}
                            {formatarMoeda(situacoes.get(item.id)?.exposicao ?? 0)} de{" "}
                            {formatarMoeda(item.limiteConsignado)}
                            {situacoes.get(item.id)?.percentual !== null &&
                              ` (${situacoes.get(item.id)?.percentual}%)`}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Tabela desktop */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="py-3 px-4 text-left">Nome</th>
                        <th className="py-3 px-4 text-left">CPF</th>
                        <th className="py-3 px-4 text-left">WhatsApp</th>
                        <th className="py-3 px-4 text-left">Cidade</th>
                        <th className="py-3 px-4 text-left">Vendedor</th>
                        <th className="py-3 px-4 text-left">Em aberto / Limite</th>
                        <th className="py-3 px-4 text-left">Status</th>
                        <th className="py-3 px-4 text-left">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isLoading ? (
                        <tr><td colSpan={8} className="text-center py-4">Carregando...</td></tr>
                      ) : revendedorasFiltradas.length === 0 ? (
                        <tr><td colSpan={8} className="text-center py-4">Nenhuma revendedora encontrada</td></tr>
                      ) : (
                        revendedorasFiltradas.map((item) => (
                          <tr key={item.id} className="border-b hover:bg-secondary/50">
                            <td className="py-3 px-4">
                              <span className="flex items-center gap-2">
                                {(item.nome || "").toUpperCase()}
                                {(pendenciasPorRevendedora.get(item.id) ?? 0) > 0 && (
                                  <span
                                    className="inline-flex items-center text-amber-600"
                                    title={`${pendenciasPorRevendedora.get(item.id)} documento(s) obrigatório(s) faltando`}
                                  >
                                    <AlertTriangle className="h-4 w-4" />
                                  </span>
                                )}
                                {situacoes.get(item.id)?.emAtraso && (
                                  <span
                                    className="inline-flex items-center text-red-600"
                                    title="Possui ciclo em atraso"
                                  >
                                    <Clock className="h-4 w-4" />
                                  </span>
                                )}
                                {/* Contagem regressiva: aparece nos cinco dias
                                    anteriores ao vencimento, para cobrar a
                                    prestacao de contas antes de atrasar. */}
                                {situacoes.get(item.id)?.prestesAVencer && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-semibold text-orange-800 dark:bg-orange-950 dark:text-orange-200">
                                    <CalendarClock className="h-3 w-3" />
                                    {rotuloContagem(situacoes.get(item.id)!.diasParaVencer ?? 0)}
                                  </span>
                                )}
                              </span>
                            </td>
                            <td className="py-3 px-4">{formatCpf(item.cpf)}</td>
                            <td className="py-3 px-4">{formatarWhatsapp(item.whatsapp)}</td>
                            <td className="py-3 px-4">{item.cidade || "-"}</td>
                            <td className="py-3 px-4">{nomeDoVendedor(item)}</td>
                            <td className="py-3 px-4">
                              {(() => {
                                const situacao = situacoes.get(item.id)
                                if (!situacao) return formatarMoeda(item.limiteConsignado)
                                const cor =
                                  situacao.classificacao === "critico"
                                    ? "text-red-600 font-semibold"
                                    : situacao.classificacao === "alerta"
                                      ? "text-amber-600 font-semibold"
                                      : ""
                                return (
                                  <span className={cor}>
                                    {formatarMoeda(situacao.exposicao)} /{" "}
                                    {situacao.classificacao === "sem_limite"
                                      ? "sem limite"
                                      : formatarMoeda(item.limiteConsignado)}
                                    {situacao.percentual !== null && ` (${situacao.percentual}%)`}
                                  </span>
                                )
                              })()}
                            </td>
                            <td className="py-3 px-4">
                              {badge(getRevendedoraStatusLabel(item.status), getRevendedoraStatusCor(item.status))}
                            </td>
                            <td className="py-3 px-4">
                              <ActionsMenu
                                pageType="gerenciadorRevendas"
                                itemId={item.id}
                                onView={() =>
                                  router.push(`/gerenciador-revendas/revendedora/${item.id}`)
                                }
                                onEdit={() => {
                                  setRevendedoraSelecionada(item.id)
                                  setModalRevendedora(true)
                                }}
                                onDelete={() => setRevendedoraParaExcluir(item.id)}
                              />
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ---------------- Aba Vendedores ---------------- */}
          <TabsContent value="vendedores">
            <Card>
              <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0">
                <CardTitle>Vendedores / Representantes</CardTitle>
                {podeAdicionar && (
                  <Button
                    onClick={() => {
                      setVendedorSelecionado(undefined)
                      setModalVendedor(true)
                    }}
                  >
                    Adicionar Vendedor
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <div className="mb-6 space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground/80">
                    <Filter className="h-4 w-4" />
                    Filtros
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2">
                      <Input
                        placeholder="Pesquisar por nome ou CPF"
                        value={buscaVendedor}
                        onChange={(e) => setBuscaVendedor(e.target.value)}
                      />
                    </div>
                    <div>
                      <Select value={statusVendedorFiltro} onValueChange={setStatusVendedorFiltro}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Filtrar por Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todos os status</SelectItem>
                          {VENDEDOR_STATUS_CODES.map((codigo) => (
                            <SelectItem key={codigo} value={codigo}>
                              {getVendedorStatusLabel(codigo)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setBuscaVendedor("")
                          setStatusVendedorFiltro("todos")
                        }}
                        className="flex items-center gap-2 w-full"
                      >
                        <X className="h-4 w-4" />
                        Limpar Filtros
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Cards mobile */}
                <div className="md:hidden space-y-3">
                  {isLoading ? (
                    <div className="text-center py-4">Carregando...</div>
                  ) : vendedoresFiltrados.length === 0 ? (
                    <div className="text-center py-4">Nenhum vendedor encontrado</div>
                  ) : (
                    vendedoresFiltrados.map((item) => (
                      <div key={item.id} className="border rounded-lg p-3 bg-card">
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-semibold text-sm">{(item.nome || "").toUpperCase()}</div>
                          <ActionsMenu
                            pageType="gerenciadorRevendas"
                            itemId={item.id}
                            onEdit={() => {
                              setVendedorSelecionado(item.id)
                              setModalVendedor(true)
                            }}
                            onDelete={() => setVendedorParaExcluir(item.id)}
                          />
                        </div>
                        <div className="mt-2">
                          {badge(getVendedorStatusLabel(item.status), getVendedorStatusCor(item.status))}
                        </div>
                        <div className="mt-2 grid grid-cols-1 gap-1 text-sm text-muted-foreground">
                          <div><span className="font-medium">CPF:</span> {formatCpf(item.cpf)}</div>
                          <div><span className="font-medium">WhatsApp:</span> {formatarWhatsapp(item.whatsapp)}</div>
                          <div>
                            <span className="font-medium">Revendedoras:</span>{" "}
                            {(revendedorasPorVendedor.get(item.id) ?? []).length}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Tabela desktop */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="py-3 px-4 text-left">Nome</th>
                        <th className="py-3 px-4 text-left">CPF</th>
                        <th className="py-3 px-4 text-left">WhatsApp</th>
                        <th className="py-3 px-4 text-left">Revendedoras</th>
                        <th className="py-3 px-4 text-left">Status</th>
                        <th className="py-3 px-4 text-left">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isLoading ? (
                        <tr><td colSpan={6} className="text-center py-4">Carregando...</td></tr>
                      ) : vendedoresFiltrados.length === 0 ? (
                        <tr><td colSpan={6} className="text-center py-4">Nenhum vendedor encontrado</td></tr>
                      ) : (
                        vendedoresFiltrados.map((item) => (
                          <tr key={item.id} className="border-b hover:bg-secondary/50">
                            <td className="py-3 px-4">{(item.nome || "").toUpperCase()}</td>
                            <td className="py-3 px-4">{formatCpf(item.cpf)}</td>
                            <td className="py-3 px-4">{formatarWhatsapp(item.whatsapp)}</td>
                            <td className="py-3 px-4">{(revendedorasPorVendedor.get(item.id) ?? []).length}</td>
                            <td className="py-3 px-4">
                              {badge(getVendedorStatusLabel(item.status), getVendedorStatusCor(item.status))}
                            </td>
                            <td className="py-3 px-4">
                              <ActionsMenu
                                pageType="gerenciadorRevendas"
                                itemId={item.id}
                                onEdit={() => {
                                  setVendedorSelecionado(item.id)
                                  setModalVendedor(true)
                                }}
                                onDelete={() => setVendedorParaExcluir(item.id)}
                              />
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ---------------- Aba Relatórios ---------------- */}
          <TabsContent value="relatorios">
            <div className="space-y-6">
              {/* Inadimplência */}
              <Card>
                <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0">
                  <div>
                    <CardTitle>Inadimplência</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Revendedoras em atraso ou com saldo já apurado em aberto.
                    </p>
                  </div>
                  <div className="w-full md:w-56">
                    <Select value={ordenacao} onValueChange={(v) => setOrdenacao(v as "valor" | "dias")}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="valor">Ordenar por valor</SelectItem>
                        <SelectItem value="dias">Ordenar por dias em atraso</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="text-center py-4">Carregando...</div>
                  ) : inadimplentes.length === 0 ? (
                    <div className="text-center py-6 text-green-700 dark:text-green-400">
                      Nenhuma revendedora em atraso ou com saldo em aberto.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b">
                            <th className="py-3 px-4 text-left">Revendedora</th>
                            <th className="py-3 px-4 text-left">Vendedor</th>
                            <th className="py-3 px-4 text-left">Saldo devedor</th>
                            <th className="py-3 px-4 text-left">Em aberto (total)</th>
                            <th className="py-3 px-4 text-left">Atraso</th>
                          </tr>
                        </thead>
                        <tbody>
                          {inadimplentes.map((linha) => (
                            <tr
                              key={linha.revendedora.id}
                              className="border-b hover:bg-secondary/50 cursor-pointer"
                              onClick={() =>
                                router.push(`/gerenciador-revendas/revendedora/${linha.revendedora.id}`)
                              }
                            >
                              <td className="py-3 px-4">
                                {(linha.revendedora.nome || "").toUpperCase()}
                              </td>
                              <td className="py-3 px-4">{nomeDoVendedor(linha.revendedora)}</td>
                              <td className="py-3 px-4 font-semibold text-red-600">
                                {formatarMoeda(linha.saldoDevedor)}
                              </td>
                              <td className="py-3 px-4">{formatarMoeda(linha.exposicao)}</td>
                              <td className="py-3 px-4">
                                {linha.diasAtraso > 0 ? (
                                  <span className="text-red-600 font-medium">
                                    {linha.diasAtraso} dia{linha.diasAtraso > 1 ? "s" : ""}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">no prazo</span>
                                )}
                              </td>
                            </tr>
                          ))}
                          <tr className="border-t-2 font-semibold">
                            <td className="py-3 px-4" colSpan={2}>
                              Total ({inadimplentes.length})
                            </td>
                            <td className="py-3 px-4 text-red-600">
                              {formatarMoeda(
                                inadimplentes.reduce((soma, l) => soma + l.saldoDevedor, 0)
                              )}
                            </td>
                            <td className="py-3 px-4">
                              {formatarMoeda(inadimplentes.reduce((soma, l) => soma + l.exposicao, 0))}
                            </td>
                            <td className="py-3 px-4" />
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Por vendedor */}
              <Card>
                <CardHeader>
                  <CardTitle>Por Vendedor</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Carteira de cada vendedor e situação das revendedoras atendidas.
                  </p>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="text-center py-4">Carregando...</div>
                  ) : relatorioVendedores.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                      Nenhum vendedor cadastrado.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b">
                            <th className="py-3 px-4 text-left">Vendedor</th>
                            <th className="py-3 px-4 text-left">Revendedoras</th>
                            <th className="py-3 px-4 text-left">Em aberto</th>
                            <th className="py-3 px-4 text-left">Em atraso</th>
                            <th className="py-3 px-4 text-left">Docs pendentes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {relatorioVendedores.map((linha) => (
                            <tr
                              key={linha.vendedorId || "sem-vendedor"}
                              className="border-b hover:bg-secondary/50"
                            >
                              <td className="py-3 px-4">
                                <span className="flex items-center gap-2">
                                  {linha.nome.toUpperCase()}
                                  {linha.status === "inativo" && (
                                    <span className="text-xs text-muted-foreground">
                                      (inativo)
                                    </span>
                                  )}
                                </span>
                              </td>
                              <td className="py-3 px-4">{linha.totalRevendedoras}</td>
                              <td className="py-3 px-4">{formatarMoeda(linha.totalEmAberto)}</td>
                              <td className="py-3 px-4">
                                {linha.emAtraso > 0 ? (
                                  <span className="text-red-600 font-medium">{linha.emAtraso}</span>
                                ) : (
                                  "0"
                                )}
                              </td>
                              <td className="py-3 px-4">
                                {linha.comDocumentoPendente > 0 ? (
                                  <span className="text-amber-600 font-medium">
                                    {linha.comDocumentoPendente}
                                  </span>
                                ) : (
                                  "0"
                                )}
                              </td>
                            </tr>
                          ))}
                          <tr className="border-t-2 font-semibold">
                            <td className="py-3 px-4">Total</td>
                            <td className="py-3 px-4">
                              {relatorioVendedores.reduce((s, l) => s + l.totalRevendedoras, 0)}
                            </td>
                            <td className="py-3 px-4">
                              {formatarMoeda(
                                relatorioVendedores.reduce((s, l) => s + l.totalEmAberto, 0)
                              )}
                            </td>
                            <td className="py-3 px-4">
                              {relatorioVendedores.reduce((s, l) => s + l.emAtraso, 0)}
                            </td>
                            <td className="py-3 px-4">
                              {relatorioVendedores.reduce((s, l) => s + l.comDocumentoPendente, 0)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ---------------- Aba Auditoria ---------------- */}
          <TabsContent value="auditoria">
            <Card>
              <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0">
                <div>
                  <CardTitle>Log de Auditoria</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Ações do módulo, da mais recente para a mais antiga. Alterações feitas direto no
                    banco não aparecem aqui.
                  </p>
                </div>
                <div className="w-full md:w-64">
                  <Select value={acaoFiltro} onValueChange={setAcaoFiltro}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Filtrar por ação" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas as ações</SelectItem>
                      {ACAO_CODES.map((codigo) => (
                        <SelectItem key={codigo} value={codigo}>
                          {getAcaoLabel(codigo)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <AuditoriaLista
                  registros={
                    acaoFiltro === "todas"
                      ? auditoria
                      : auditoria.filter((r) => r.acao === acaoFiltro)
                  }
                  isLoading={carregandoAuditoria}
                />
                {auditoriaLastDoc && (
                  <div className="mt-4 flex justify-center">
                    {/* Sem a arrow, o evento do clique viraria o parâmetro
                        `reiniciar` e a lista seria reiniciada em vez de crescer. */}
                    <Button
                      variant="outline"
                      onClick={() => carregarMaisAuditoria()}
                      disabled={carregandoAuditoria}
                    >
                      Carregar mais
                    </Button>
                  </div>
                )}
                {acaoFiltro !== "todas" && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    O filtro atua sobre os registros já carregados. Use &quot;Carregar mais&quot; para
                    alcançar registros mais antigos.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <RevendedoraFormModal
        isOpen={modalRevendedora}
        onClose={() => {
          setModalRevendedora(false)
          setRevendedoraSelecionada(undefined)
        }}
        revendedoraId={revendedoraSelecionada}
        onSuccess={carregar}
      />

      <VendedorFormModal
        isOpen={modalVendedor}
        onClose={() => {
          setModalVendedor(false)
          setVendedorSelecionado(undefined)
        }}
        vendedorId={vendedorSelecionado}
        onSuccess={carregar}
        revendedorasVinculadas={
          vendedorSelecionado ? (revendedorasPorVendedor.get(vendedorSelecionado) ?? []) : []
        }
      />

      <AlertDialog open={!!revendedoraParaExcluir} onOpenChange={() => setRevendedoraParaExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta revendedora? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => revendedoraParaExcluir && handleExcluirRevendedora(revendedoraParaExcluir)}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!vendedorParaExcluir} onOpenChange={() => setVendedorParaExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este vendedor? Se houver revendedoras vinculadas a ele, a
              exclusão será bloqueada. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => vendedorParaExcluir && handleExcluirVendedor(vendedorParaExcluir)}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
