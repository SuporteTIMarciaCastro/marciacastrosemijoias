"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/auth-context"
import Header from "@/components/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale/pt-BR"
import {
  Calendar as CalendarIcon,
  RefreshCw,
  MessageSquare,
  MessageCircle,
  Trophy,
  TrendingDown,
  Timer,
  AlertTriangle,
  Users,
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ComposedChart,
} from "recharts"

interface SellerStat {
  user_id: number
  name: string
  date: string
  messages_sent: number
  messages_received: number
  conversations_missed: number
  avg_response_time_seconds: number | null
  avg_first_response_time_seconds: number | null
  leads_handled: number
  leads_won: number
  leads_lost: number
  leads_won_by_last_responder: number
  leads_lost_by_last_responder: number
  slow_responses_count: number
  slow_response_leads_count: number
  conversion_rate: number
  loss_rate: number
  nuvemshop_sales: number
  hourly_breakdown: {
    messages_sent: Record<string, number>
    messages_received: Record<string, number>
  }
}

const API_BASE = "/api/atendimento-stats"

const COLORS = [
  "#dc2626",
  "#ea580c",
  "#d97706",
  "#65a30d",
  "#0891b2",
  "#7c3aed",
  "#db2777",
  "#475569",
]

function formatSeconds(secs: number | null): string {
  if (secs === null || secs === undefined || Number.isNaN(secs)) return "—"
  if (secs < 60) return `${Math.round(secs)}s`
  const minutes = Math.floor(secs / 60)
  const seconds = Math.round(secs % 60)
  if (minutes < 60) return `${minutes}m ${seconds}s`
  const hours = Math.floor(minutes / 60)
  const remainingMin = minutes % 60
  return `${hours}h ${remainingMin}m`
}

function toApiDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export default function EstatisticasAtendimentoPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const [dateFrom, setDateFrom] = useState<Date>(new Date())
  const [dateTo, setDateTo] = useState<Date>(new Date())
  const [data, setData] = useState<SellerStat[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.replace("/login")
      return
    }
    if (!user.permissions?.estatisticasAtendimento?.visualizarPage) {
      router.replace("/dashboard")
    }
  }, [user, loading, router])

  const loadData = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const url = `${API_BASE}?date_from=${toApiDate(dateFrom)}&date_to=${toApiDate(dateTo)}`
      const res = await fetch(url, { cache: "no-store" })
      if (!res.ok) throw new Error(`Erro ${res.status} ao consultar a API`)
      const json = await res.json()
      const arr: SellerStat[] = Array.isArray(json) ? json : json?.data ?? []
      setData(arr)
    } catch (e: any) {
      console.error(e)
      setError(e?.message || "Falha ao carregar estatísticas")
      toast({
        title: "Erro ao carregar dados",
        description: e?.message || "Não foi possível buscar os dados de atendimento.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (user?.permissions?.estatisticasAtendimento?.visualizarPage) {
      loadData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  // Agrega múltiplos registros (dias) da mesma vendedora em um único objeto.
  const sellers = useMemo(() => {
    if (!data.length) return [] as Array<
      SellerStat & { days: number; conversion_pct: number }
    >
    const map = new Map<number, SellerStat & { days: number; conversion_pct: number }>()

    const mergeHourly = (
      target: Record<string, number>,
      source?: Record<string, number> | null
    ) => {
      if (!source) return
      Object.entries(source).forEach(([h, v]) => {
        target[h] = (target[h] ?? 0) + (v ?? 0)
      })
    }

    for (const d of data) {
      const existing = map.get(d.user_id)
      if (!existing) {
        map.set(d.user_id, {
          ...d,
          hourly_breakdown: {
            messages_sent: { ...(d.hourly_breakdown?.messages_sent ?? {}) },
            messages_received: { ...(d.hourly_breakdown?.messages_received ?? {}) },
          },
          // recalculados após a soma
          conversion_rate: 0,
          loss_rate: 0,
          conversion_pct: 0,
          days: 1,
          // somas usadas como acumuladores; tempos médios recalculados depois
          avg_response_time_seconds:
            d.avg_response_time_seconds !== null && !Number.isNaN(d.avg_response_time_seconds)
              ? d.avg_response_time_seconds
              : null,
          avg_first_response_time_seconds:
            d.avg_first_response_time_seconds !== null &&
            !Number.isNaN(d.avg_first_response_time_seconds)
              ? d.avg_first_response_time_seconds
              : null,
        })
        // armazenamos contadores auxiliares no próprio objeto via campos extras
        ;(map.get(d.user_id) as any)._respSum =
          d.avg_response_time_seconds !== null ? d.avg_response_time_seconds : 0
        ;(map.get(d.user_id) as any)._respCount =
          d.avg_response_time_seconds !== null ? 1 : 0
        ;(map.get(d.user_id) as any)._firstRespSum =
          d.avg_first_response_time_seconds !== null
            ? d.avg_first_response_time_seconds
            : 0
        ;(map.get(d.user_id) as any)._firstRespCount =
          d.avg_first_response_time_seconds !== null ? 1 : 0
      } else {
        existing.messages_sent += d.messages_sent
        existing.messages_received += d.messages_received
        existing.conversations_missed += d.conversations_missed
        existing.leads_handled += d.leads_handled
        existing.leads_won += d.leads_won
        existing.leads_lost += d.leads_lost
        existing.leads_won_by_last_responder += d.leads_won_by_last_responder
        existing.leads_lost_by_last_responder += d.leads_lost_by_last_responder
        existing.slow_responses_count += d.slow_responses_count
        existing.slow_response_leads_count += d.slow_response_leads_count
        existing.nuvemshop_sales += d.nuvemshop_sales
        existing.days += 1
        mergeHourly(existing.hourly_breakdown.messages_sent, d.hourly_breakdown?.messages_sent)
        mergeHourly(
          existing.hourly_breakdown.messages_received,
          d.hourly_breakdown?.messages_received
        )
        if (d.avg_response_time_seconds !== null && !Number.isNaN(d.avg_response_time_seconds)) {
          ;(existing as any)._respSum += d.avg_response_time_seconds
          ;(existing as any)._respCount += 1
        }
        if (
          d.avg_first_response_time_seconds !== null &&
          !Number.isNaN(d.avg_first_response_time_seconds)
        ) {
          ;(existing as any)._firstRespSum += d.avg_first_response_time_seconds
          ;(existing as any)._firstRespCount += 1
        }
      }
    }

    const result = Array.from(map.values()).map((s) => {
      const respCount = (s as any)._respCount as number
      const firstRespCount = (s as any)._firstRespCount as number
      const avgResp =
        respCount > 0 ? ((s as any)._respSum as number) / respCount : null
      const avgFirstResp =
        firstRespCount > 0
          ? ((s as any)._firstRespSum as number) / firstRespCount
          : null
      // Definição de negócio:
      //  - leads ganhos  = nuvemshop_sales
      //  - leads perdidos = leads_lost_by_last_responder
      const conversion_pct =
        s.leads_handled > 0 ? (s.nuvemshop_sales / s.leads_handled) * 100 : 0
      const loss_rate =
        s.leads_handled > 0 ? s.leads_lost_by_last_responder / s.leads_handled : 0
      const conversion_rate = conversion_pct / 100
      // limpa campos auxiliares
      delete (s as any)._respSum
      delete (s as any)._respCount
      delete (s as any)._firstRespSum
      delete (s as any)._firstRespCount
      return {
        ...s,
        avg_response_time_seconds: avgResp,
        avg_first_response_time_seconds: avgFirstResp,
        conversion_pct,
        conversion_rate,
        loss_rate,
      }
    })

    return result.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
  }, [data])

  const aggregated = useMemo(() => {
    if (!sellers.length) return null
    const totalSent = sellers.reduce((s, x) => s + x.messages_sent, 0)
    const totalReceived = sellers.reduce((s, x) => s + x.messages_received, 0)
    const totalLeads = sellers.reduce((s, x) => s + x.leads_handled, 0)
    // leads ganhos = nuvemshop_sales | leads perdidos = leads_lost_by_last_responder
    const totalWon = sellers.reduce((s, x) => s + x.nuvemshop_sales, 0)
    const totalLost = sellers.reduce(
      (s, x) => s + x.leads_lost_by_last_responder,
      0
    )
    const totalMissed = sellers.reduce((s, x) => s + x.conversations_missed, 0)
    const totalSlow = sellers.reduce((s, x) => s + x.slow_responses_count, 0)
    const respValues = sellers
      .map((x) => x.avg_response_time_seconds)
      .filter((v): v is number => v !== null && !Number.isNaN(v))
    const avgResp =
      respValues.length > 0
        ? respValues.reduce((a, b) => a + b, 0) / respValues.length
        : null
    const firstRespValues = sellers
      .map((x) => x.avg_first_response_time_seconds)
      .filter((v): v is number => v !== null && !Number.isNaN(v))
    const avgFirstResp =
      firstRespValues.length > 0
        ? firstRespValues.reduce((a, b) => a + b, 0) / firstRespValues.length
        : null
    const conversionRate = totalLeads > 0 ? (totalWon / totalLeads) * 100 : 0
    return {
      totalSent,
      totalReceived,
      totalLeads,
      totalWon,
      totalLost,
      totalMissed,
      totalSlow,
      avgResp,
      avgFirstResp,
      conversionRate,
    }
  }, [sellers])

  // Ranking por mensagens enviadas
  const rankingMessages = useMemo(() => {
    return [...sellers].sort((a, b) => b.messages_sent - a.messages_sent)
  }, [sellers])

  // Ranking por conversão
  const rankingConversion = useMemo(() => {
    return [...sellers].sort((a, b) => b.conversion_pct - a.conversion_pct)
  }, [sellers])

  // Insights automáticos
  const insights = useMemo(() => {
    if (!sellers.length) return []
    const out: { type: "positive" | "warning" | "danger"; text: string }[] = []
    const sortedByConv = [...sellers]
      .filter((d) => d.leads_handled > 0)
      .sort((a, b) => b.conversion_pct - a.conversion_pct)
    if (sortedByConv.length) {
      const top = sortedByConv[0]
      if (top.conversion_pct > 0) {
        out.push({
          type: "positive",
          text: `${top.name} lidera em conversão (${top.conversion_pct.toFixed(1)}% — ${top.nuvemshop_sales}/${top.leads_handled} leads).`,
        })
      }
    }

    const slowestResp = [...sellers]
      .filter((d) => d.avg_response_time_seconds !== null)
      .sort(
        (a, b) =>
          (b.avg_response_time_seconds as number) -
          (a.avg_response_time_seconds as number)
      )[0]
    if (slowestResp && (slowestResp.avg_response_time_seconds as number) > 600) {
      out.push({
        type: "danger",
        text: `${slowestResp.name} tem tempo médio de resposta muito alto: ${formatSeconds(
          slowestResp.avg_response_time_seconds
        )}. Avalie redistribuir atendimentos.`,
      })
    }

    const highLoss = sellers.filter((d) => d.loss_rate > 1)
    if (highLoss.length) {
      out.push({
        type: "warning",
        text: `${highLoss.length} vendedora(s) com taxa de perda > 1: ${highLoss
          .map((d) => d.name)
          .join(", ")}.`,
      })
    }

    // === Insights de respostas lentas (> 5 minutos) ===
    // 1) Pior ofensora em volume absoluto de respostas lentas
    const worstSlow = [...sellers]
      .filter((d) => d.slow_responses_count > 0)
      .sort((a, b) => b.slow_responses_count - a.slow_responses_count)[0]
    if (worstSlow && worstSlow.slow_responses_count >= 10) {
      out.push({
        type: "danger",
        text: `${worstSlow.name} acumula ${worstSlow.slow_responses_count} respostas com mais de 5 min de espera (afetando ${worstSlow.slow_response_leads_count} lead(s) distintos). Priorize coaching ou redistribuição de fila.`,
      })
    }

    // 2) Vendedoras com alta porcentagem de leads impactados por demora
    const leadsImpactRate = sellers
      .filter((d) => d.leads_handled >= 5)
      .map((d) => ({
        name: d.name,
        rate: (d.slow_response_leads_count / d.leads_handled) * 100,
        slow_response_leads_count: d.slow_response_leads_count,
        leads_handled: d.leads_handled,
      }))
      .filter((d) => d.rate >= 30)
      .sort((a, b) => b.rate - a.rate)
    if (leadsImpactRate.length) {
      out.push({
        type: "warning",
        text: `Leads impactados por demora (>5 min) em ≥ 30% do atendimento: ${leadsImpactRate
          .map(
            (d) =>
              `${d.name} (${d.rate.toFixed(0)}% — ${d.slow_response_leads_count}/${d.leads_handled})`
          )
          .join(", ")}.`,
      })
    }

    // 3) Reincidência: quando há muitas respostas lentas por lead afetado,
    // significa que o mesmo cliente está esperando várias vezes na conversa
    const recurrent = sellers
      .filter((d) => d.slow_response_leads_count > 0)
      .map((d) => ({
        name: d.name,
        ratio: d.slow_responses_count / d.slow_response_leads_count,
        slow_responses_count: d.slow_responses_count,
        slow_response_leads_count: d.slow_response_leads_count,
      }))
      .filter((d) => d.ratio >= 3)
      .sort((a, b) => b.ratio - a.ratio)
    if (recurrent.length) {
      out.push({
        type: "warning",
        text: `Reincidência alta de demora no mesmo lead (mesmo cliente esperando várias vezes): ${recurrent
          .map(
            (d) =>
              `${d.name} (${d.ratio.toFixed(1)}× — ${d.slow_responses_count} esperas em ${d.slow_response_leads_count} leads)`
          )
          .join(", ")}.`,
      })
    }

    // 4) Positivo: vendedoras com volume relevante e ZERO respostas lentas
    const noSlow = sellers.filter(
      (d) => d.leads_handled >= 10 && d.slow_responses_count === 0
    )
    if (noSlow.length) {
      out.push({
        type: "positive",
        text: `Sem nenhuma resposta acima de 5 min e com volume relevante: ${noSlow
          .map((d) => `${d.name} (${d.leads_handled} leads)`)
          .join(", ")}. Padrão a ser replicado.`,
      })
    }

    // 5) Resumo agregado do período
    const totalSlowResp = sellers.reduce((s, x) => s + x.slow_responses_count, 0)
    const totalSlowLeads = sellers.reduce(
      (s, x) => s + x.slow_response_leads_count,
      0
    )
    const totalLeadsHandled = sellers.reduce((s, x) => s + x.leads_handled, 0)
    if (totalSlowResp > 0 && totalLeadsHandled > 0) {
      const pct = (totalSlowLeads / totalLeadsHandled) * 100
      out.push({
        type: pct >= 25 ? "danger" : pct >= 10 ? "warning" : "positive",
        text: `Período: ${totalSlowResp} respostas com >5 min afetaram ${totalSlowLeads} leads (${pct.toFixed(1)}% dos ${totalLeadsHandled} atendidos).`,
      })
    }

    const noReceived = sellers.filter(
      (d) => d.messages_sent > 50 && d.messages_received === 0
    )
    if (noReceived.length) {
      out.push({
        type: "warning",
        text: `${noReceived
          .map((d) => d.name)
          .join(", ")} enviou muitas mensagens mas não registrou recebimentos — verifique integração.`,
      })
    }

    const noConv = sellers.filter(
      (d) => d.leads_handled >= 20 && d.nuvemshop_sales === 0
    )
    if (noConv.length) {
      out.push({
        type: "danger",
        text: `${noConv
          .map((d) => d.name)
          .join(", ")} atendeu 20+ leads sem nenhuma conversão. Acompanhamento sugerido.`,
      })
    }

    // pico de atividade (hora mais movimentada)
    const totalsByHour: Record<number, number> = {}
    for (let h = 0; h < 24; h++) totalsByHour[h] = 0
    sellers.forEach((s) => {
      Object.entries(s.hourly_breakdown?.messages_sent ?? {}).forEach(([h, v]) => {
        totalsByHour[Number(h)] = (totalsByHour[Number(h)] ?? 0) + v
      })
    })
    const peak = Object.entries(totalsByHour).sort(
      ([, a], [, b]) => (b as number) - (a as number)
    )[0]
    if (peak && (peak[1] as number) > 0) {
      out.push({
        type: "positive",
        text: `Pico de envio no horário ${String(peak[0]).padStart(2, "0")}h (${peak[1]} mensagens). Reforce escala neste horário.`,
      })
    }

    return out
  }, [sellers])

  // Agregar hourly de todas as vendedoras (totais por hora)
  const hourlyAggregated = useMemo(() => {
    const hours: Record<string, { hour: string; enviadas: number; recebidas: number }> = {}
    for (let h = 0; h < 24; h++) {
      const key = String(h)
      hours[key] = { hour: `${String(h).padStart(2, "0")}h`, enviadas: 0, recebidas: 0 }
    }
    sellers.forEach((d) => {
      Object.entries(d.hourly_breakdown?.messages_sent ?? {}).forEach(([h, v]) => {
        if (hours[h]) hours[h].enviadas += v
      })
      Object.entries(d.hourly_breakdown?.messages_received ?? {}).forEach(([h, v]) => {
        if (hours[h]) hours[h].recebidas += v
      })
    })
    return Object.values(hours)
  }, [sellers])

  // Hourly por vendedora: cada hora vira uma linha; cada vendedora uma série.
  const hourlyPerSeller = useMemo(() => {
    const rows: Array<Record<string, number | string>> = []
    for (let h = 0; h < 24; h++) {
      const row: Record<string, number | string> = { hour: `${String(h).padStart(2, "0")}h` }
      sellers.forEach((s) => {
        row[s.name] = s.hourly_breakdown?.messages_sent?.[String(h)] ?? 0
      })
      rows.push(row)
    }
    return rows
  }, [sellers])

  // Chart: leads (won x lost) per seller
  const leadsChart = useMemo(
    () =>
      sellers.map((d) => ({
        name: d.name,
        Ganhos: d.nuvemshop_sales,
        Perdidos: d.leads_lost_by_last_responder,
        Atendidos: d.leads_handled,
      })),
    [sellers]
  )

  // Chart: respostas lentas (volume absoluto) por vendedora
  const slowVolumeChart = useMemo(
    () =>
      sellers.map((d) => ({
        name: d.name,
        "Respostas lentas": d.slow_responses_count,
        "Leads afetados": d.slow_response_leads_count,
        Reincidencia:
          d.slow_response_leads_count > 0
            ? Number(
                (d.slow_responses_count / d.slow_response_leads_count).toFixed(2)
              )
            : 0,
      })),
    [sellers]
  )

  // Chart: percentual de leads impactados por demora
  const slowImpactChart = useMemo(
    () =>
      sellers
        .map((d) => ({
          name: d.name,
          "% leads impactados":
            d.leads_handled > 0
              ? Number(
                  ((d.slow_response_leads_count / d.leads_handled) * 100).toFixed(1)
                )
              : 0,
          leads_handled: d.leads_handled,
          slow_response_leads_count: d.slow_response_leads_count,
        }))
        .sort((a, b) => b["% leads impactados"] - a["% leads impactados"]),
    [sellers]
  )

  // Chart: messages per seller
  const messagesChart = useMemo(
    () =>
      sellers.map((d) => ({
        name: d.name,
        Enviadas: d.messages_sent,
        Recebidas: d.messages_received,
      })),
    [sellers]
  )

  // Pie chart: distribution of sent messages
  const sentDistribution = useMemo(
    () =>
      sellers
        .filter((d) => d.messages_sent > 0)
        .map((d) => ({ name: d.name, value: d.messages_sent })),
    [sellers]
  )

  const periodLabel = useMemo(() => {
    const from = format(dateFrom, "dd/MM/yyyy", { locale: ptBR })
    const to = format(dateTo, "dd/MM/yyyy", { locale: ptBR })
    return from === to ? from : `${from} – ${to}`
  }, [dateFrom, dateTo])

  if (loading || !user) return null
  if (!user.permissions?.estatisticasAtendimento?.visualizarPage) return null

  return (
    <div className="flex min-h-screen flex-col">
      <Header title="Estatísticas de Atendimento" />

      <main className="flex-1 p-4 md:p-6 space-y-6">
        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle>Período de análise</CardTitle>
            <CardDescription>
              Selecione um único dia ou um intervalo para visualizar as estatísticas das vendedoras.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium mb-1 block">Data inicial</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(dateFrom, "dd/MM/yyyy", { locale: ptBR })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateFrom}
                      onSelect={(d) => d && setDateFrom(d)}
                      locale={ptBR}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium mb-1 block">Data final</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(dateTo, "dd/MM/yyyy", { locale: ptBR })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateTo}
                      onSelect={(d) => d && setDateTo(d)}
                      locale={ptBR}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <Button onClick={loadData} disabled={isLoading} className="bg-red-600 hover:bg-red-700">
                <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                {isLoading ? "Carregando..." : "Atualizar"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {error && (
          <Card className="border-red-300 bg-red-50 dark:bg-red-950/30">
            <CardContent className="pt-6 text-red-700 dark:text-red-300 text-sm">
              {error}
            </CardContent>
          </Card>
        )}

        {!isLoading && data.length === 0 && !error && (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              Nenhum dado disponível para o período selecionado.
            </CardContent>
          </Card>
        )}

        {aggregated && (
          <>
            {/* KPI cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KpiCard
                icon={<MessageSquare className="h-5 w-5 text-blue-600" />}
                label="Mensagens enviadas"
                value={aggregated.totalSent.toLocaleString("pt-BR")}
              />
              <KpiCard
                icon={<MessageCircle className="h-5 w-5 text-cyan-600" />}
                label="Mensagens recebidas"
                value={aggregated.totalReceived.toLocaleString("pt-BR")}
              />
              <KpiCard
                icon={<Users className="h-5 w-5 text-purple-600" />}
                label="Leads atendidos"
                value={aggregated.totalLeads.toLocaleString("pt-BR")}
              />
              <KpiCard
                icon={<Trophy className="h-5 w-5 text-green-600" />}
                label="Leads ganhos (Nuvemshop)"
                value={aggregated.totalWon.toLocaleString("pt-BR")}
                hint={`${aggregated.conversionRate.toFixed(1)}% conversão`}
              />
              <KpiCard
                icon={<TrendingDown className="h-5 w-5 text-red-600" />}
                label="Leads perdidos"
                value={aggregated.totalLost.toLocaleString("pt-BR")}
                hint="por último respondente"
              />
              <KpiCard
                icon={<Timer className="h-5 w-5 text-orange-600" />}
                label="Tempo médio resposta"
                value={formatSeconds(aggregated.avgResp)}
                hint={`1ª resposta: ${formatSeconds(aggregated.avgFirstResp)}`}
              />
              <KpiCard
                icon={<AlertTriangle className="h-5 w-5 text-amber-600" />}
                label="Respostas lentas"
                value={aggregated.totalSlow.toLocaleString("pt-BR")}
              />
            </div>

            {/* Insights */}
            {insights.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Insights e pontos de melhoria</CardTitle>
                  <CardDescription>Sugestões automáticas baseadas nos dados do período.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {insights.map((i, idx) => (
                    <div
                      key={idx}
                      className={`flex items-start gap-2 p-3 rounded-md border text-sm ${
                        i.type === "positive"
                          ? "border-green-300 bg-green-50 dark:bg-green-950/30 text-green-800 dark:text-green-300"
                          : i.type === "warning"
                          ? "border-amber-300 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300"
                          : "border-red-300 bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-300"
                      }`}
                    >
                      <span>{i.text}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <Tabs defaultValue="charts" className="w-full">
              <TabsList>
                <TabsTrigger value="charts">Gráficos</TabsTrigger>
                <TabsTrigger value="ranking">Ranking</TabsTrigger>
                <TabsTrigger value="table">Detalhes</TabsTrigger>
              </TabsList>

              <TabsContent value="charts" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Mensagens por vendedora</CardTitle>
                    <CardDescription>Comparativo de mensagens enviadas vs recebidas.</CardDescription>
                  </CardHeader>
                  <CardContent className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={messagesChart}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="Enviadas" fill="#dc2626" />
                        <Bar dataKey="Recebidas" fill="#0891b2" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Leads atendidos, ganhos e perdidos</CardTitle>
                    <CardDescription>Resultado comercial de cada vendedora.</CardDescription>
                  </CardHeader>
                  <CardContent className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={leadsChart}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="Atendidos" fill="#7c3aed" />
                        <Bar dataKey="Ganhos" fill="#16a34a" />
                        <Bar dataKey="Perdidos" fill="#dc2626" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Distribuição de mensagens enviadas</CardTitle>
                      <CardDescription>Participação de cada vendedora no volume total.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={sentDistribution}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            label={(entry) => `${entry.name}`}
                          >
                            {sentDistribution.map((_, i) => (
                              <Cell key={i} fill={COLORS[i % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Volume por horário</CardTitle>
                      <CardDescription>Soma das mensagens trocadas por hora do dia.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={hourlyAggregated}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="hour" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="enviadas"
                            stroke="#dc2626"
                            name="Enviadas"
                          />
                          <Line
                            type="monotone"
                            dataKey="recebidas"
                            stroke="#0891b2"
                            name="Recebidas"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Eficiência por horário — mensagens enviadas por vendedora</CardTitle>
                    <CardDescription>
                      Curva de produtividade ao longo do dia. Útil para identificar horários
                      de pico e ociosidade de cada vendedora.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={hourlyPerSeller}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="hour" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        {sellers.map((s, i) => (
                          <Line
                            key={s.user_id}
                            type="monotone"
                            dataKey={s.name}
                            stroke={COLORS[i % COLORS.length]}
                            strokeWidth={2}
                            dot={false}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>SLA — respostas com mais de 5 minutos</CardTitle>
                    <CardDescription>
                      Barras mostram o volume absoluto: total de respostas lentas vs leads
                      distintos afetados. A linha (eixo direito) é o índice de reincidência
                      (respostas lentas por lead). Valores ≥ 2 indicam que o mesmo cliente
                      esperou mais de uma vez na conversa.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={slowVolumeChart}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis yAxisId="left" />
                        <YAxis yAxisId="right" orientation="right" />
                        <Tooltip />
                        <Legend />
                        <Bar
                          yAxisId="left"
                          dataKey="Respostas lentas"
                          fill="#dc2626"
                        />
                        <Bar
                          yAxisId="left"
                          dataKey="Leads afetados"
                          fill="#f59e0b"
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="Reincidencia"
                          stroke="#7c3aed"
                          strokeWidth={2}
                          name="Reincidência (x)"
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>% de leads impactados por demora</CardTitle>
                    <CardDescription>
                      Percentual dos leads atendidos por cada vendedora que esperaram
                      &gt; 5 min em algum momento da conversa. Ordenado do pior para o melhor.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={slowImpactChart}
                        layout="vertical"
                        margin={{ left: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" unit="%" />
                        <YAxis
                          dataKey="name"
                          type="category"
                          width={110}
                          tick={{ fontSize: 12 }}
                        />
                        <Tooltip
                          formatter={(value: number, _name, item: any) => {
                            const p = item?.payload
                            return [
                              `${value}% (${p?.slow_response_leads_count}/${p?.leads_handled} leads)`,
                              "Leads impactados",
                            ]
                          }}
                        />
                        <Bar dataKey="% leads impactados" fill="#dc2626" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Mapa de calor — mensagens enviadas por hora</CardTitle>
                    <CardDescription>
                      Quanto mais escuro, maior o volume. Permite ver rapidamente onde cada
                      vendedora concentra o trabalho.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="overflow-x-auto">
                    <HourlyHeatmap sellers={sellers} />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="ranking" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Top por mensagens enviadas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>#</TableHead>
                          <TableHead>Vendedora</TableHead>
                          <TableHead className="text-right">Enviadas</TableHead>
                          <TableHead className="text-right">Recebidas</TableHead>
                          <TableHead className="text-right">Tempo médio</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rankingMessages.map((d, i) => (
                          <TableRow key={d.user_id}>
                            <TableCell>{i + 1}</TableCell>
                            <TableCell className="font-medium">{d.name}</TableCell>
                            <TableCell className="text-right">{d.messages_sent}</TableCell>
                            <TableCell className="text-right">{d.messages_received}</TableCell>
                            <TableCell className="text-right">
                              {formatSeconds(d.avg_response_time_seconds)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Top por conversão</CardTitle>
                    <CardDescription>Percentual de leads ganhos sobre leads atendidos.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>#</TableHead>
                          <TableHead>Vendedora</TableHead>
                          <TableHead className="text-right">Atendidos</TableHead>
                          <TableHead className="text-right">Ganhos</TableHead>
                          <TableHead className="text-right">% Conv.</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rankingConversion.map((d, i) => (
                          <TableRow key={d.user_id}>
                            <TableCell>{i + 1}</TableCell>
                            <TableCell className="font-medium">{d.name}</TableCell>
                            <TableCell className="text-right">{d.leads_handled}</TableCell>
                            <TableCell className="text-right">{d.nuvemshop_sales}</TableCell>
                            <TableCell className="text-right">
                              <Badge
                                variant={
                                  d.conversion_pct >= 5
                                    ? "default"
                                    : d.conversion_pct > 0
                                    ? "secondary"
                                    : "destructive"
                                }
                              >
                                {d.conversion_pct.toFixed(1)}%
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="table">
                <Card>
                  <CardHeader>
                    <CardTitle>Detalhamento por vendedora</CardTitle>
                    <CardDescription>
                      Valores agregados do período selecionado ({periodLabel}).
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Vendedora</TableHead>
                          <TableHead className="text-right">Dias</TableHead>
                          <TableHead className="text-right">Env.</TableHead>
                          <TableHead className="text-right">Rec.</TableHead>
                          <TableHead className="text-right">Perdidas</TableHead>
                          <TableHead className="text-right">Leads</TableHead>
                          <TableHead className="text-right">Ganhos</TableHead>
                          <TableHead className="text-right">Perdidos</TableHead>
                          <TableHead className="text-right">% Conv.</TableHead>
                          <TableHead className="text-right">Resp. lentas</TableHead>
                          <TableHead className="text-right">T. médio</TableHead>
                          <TableHead className="text-right">1ª resp.</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sellers.map((d) => (
                          <TableRow key={d.user_id}>
                            <TableCell className="font-medium whitespace-nowrap">{d.name}</TableCell>
                            <TableCell className="text-right">{d.days}</TableCell>
                            <TableCell className="text-right">{d.messages_sent}</TableCell>
                            <TableCell className="text-right">{d.messages_received}</TableCell>
                            <TableCell className="text-right">{d.conversations_missed}</TableCell>
                            <TableCell className="text-right">{d.leads_handled}</TableCell>
                            <TableCell className="text-right text-green-600 font-medium">
                              {d.nuvemshop_sales}
                            </TableCell>
                            <TableCell className="text-right text-red-600 font-medium">
                              {d.leads_lost_by_last_responder}
                            </TableCell>
                            <TableCell className="text-right">{d.conversion_pct.toFixed(1)}%</TableCell>
                            <TableCell className="text-right">{d.slow_responses_count}</TableCell>
                            <TableCell className="text-right">
                              {formatSeconds(d.avg_response_time_seconds)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatSeconds(d.avg_first_response_time_seconds)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>
    </div>
  )
}

function HourlyHeatmap({
  sellers,
}: {
  sellers: Array<SellerStat & { conversion_pct: number; days: number }>
}) {
  const hours = Array.from({ length: 24 }, (_, h) => h)
  const maxValue = Math.max(
    1,
    ...sellers.flatMap((s) =>
      hours.map((h) => s.hourly_breakdown?.messages_sent?.[String(h)] ?? 0)
    )
  )

  const colorFor = (v: number) => {
    if (v === 0) return "transparent"
    const intensity = v / maxValue
    const alpha = 0.15 + intensity * 0.75
    return `rgba(220, 38, 38, ${alpha.toFixed(2)})`
  }

  return (
    <div className="min-w-[700px]">
      <table className="w-full text-xs border-separate border-spacing-0">
        <thead>
          <tr>
            <th className="text-left pr-2 pb-1 sticky left-0 bg-background">Vendedora</th>
            {hours.map((h) => (
              <th key={h} className="text-center pb-1 font-normal text-muted-foreground">
                {String(h).padStart(2, "0")}
              </th>
            ))}
            <th className="text-right pl-2 pb-1">Total</th>
          </tr>
        </thead>
        <tbody>
          {sellers.map((s) => {
            const total = hours.reduce(
              (acc, h) => acc + (s.hourly_breakdown?.messages_sent?.[String(h)] ?? 0),
              0
            )
            return (
              <tr key={s.user_id}>
                <td className="pr-2 py-1 font-medium whitespace-nowrap sticky left-0 bg-background">
                  {s.name}
                </td>
                {hours.map((h) => {
                  const v = s.hourly_breakdown?.messages_sent?.[String(h)] ?? 0
                  return (
                    <td
                      key={h}
                      className="text-center py-1 border border-border/30"
                      style={{ backgroundColor: colorFor(v) }}
                      title={`${s.name} — ${String(h).padStart(2, "0")}h: ${v} msg`}
                    >
                      {v > 0 ? v : ""}
                    </td>
                  )
                })}
                <td className="text-right pl-2 py-1 font-semibold">{total}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function KpiCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode
  label: string
  value: string
  hint?: string
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground">{label}</span>
          {icon}
        </div>
        <div className="text-2xl font-bold">{value}</div>
        {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
      </CardContent>
    </Card>
  )
}
