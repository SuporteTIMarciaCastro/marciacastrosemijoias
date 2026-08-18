import { getStatusEfetivoCiclo, arredondar2, diasAteVencer } from "@/lib/ciclo-status"
import type { Ciclo, Revendedora, Vendedor } from "@/types"

/**
 * Alertas do Gerenciador de Revendas.
 *
 * Tudo aqui é calculado na LEITURA — nada é gravado e nada depende de job
 * agendado (o projeto não tem cron). Mesma estratégia do status `em_atraso`.
 *
 * Funções puras de propósito: dá para testar por linha de comando, sem browser
 * e sem Firestore.
 */

/** Percentual do limite a partir do qual a revendedora entra em alerta. */
export const LIMITE_ALERTA = 80
/** Percentual a partir do qual a situação é crítica. */
export const LIMITE_CRITICO = 100

export type ClassificacaoLimite = "ok" | "alerta" | "critico" | "sem_limite"

/**
 * Valor em aberto de um único ciclo.
 *
 * Com prestação registrada, o número real é o saldo devedor apurado.
 * Sem prestação, a exposição é a mercadoria que está na mão da revendedora —
 * daí o `valorEntregue`. Ciclos criados antes desse campo existir devolvem 0,
 * que é o correto para um dado que não foi capturado.
 */
export function valorEmAbertoDoCiclo(ciclo: Ciclo): number {
  const prestacao = ciclo.prestacaoContas
  if (prestacao) {
    const totalPago = ciclo.totalPago ?? 0
    return arredondar2(Math.max(0, prestacao.valorRepassar - totalPago))
  }
  // Sem prestação, a exposição é toda a mercadoria na mão dela — inclusive a
  // das entregas adicionais autorizadas dentro do mesmo ciclo.
  const adicionais = (ciclo.entregasAdicionais ?? []).reduce(
    (soma, entrega) => soma + Math.max(0, entrega.valorEntregue ?? 0),
    0
  )
  return arredondar2(Math.max(0, ciclo.valorEntregue ?? 0) + adicionais)
}

/** Soma o valor em aberto de todos os ciclos recebidos (já devem ser os abertos). */
export function calcularExposicao(ciclos: Ciclo[]): number {
  return arredondar2(ciclos.reduce((soma, ciclo) => soma + valorEmAbertoDoCiclo(ciclo), 0))
}

/** Algum ciclo aberto com prazo vencido, pelo status efetivo já existente. */
export function temAtraso(ciclos: Ciclo[]): boolean {
  return ciclos.some((ciclo) => getStatusEfetivoCiclo(ciclo) === "em_atraso")
}

/**
 * Classifica a exposição contra o limite consignado.
 * Sem limite definido não há percentual possível — é pendência de cadastro,
 * não situação de risco, por isso tem classificação própria.
 */
export function classificarLimite(exposicao: number, limite?: number): ClassificacaoLimite {
  if (!limite || limite <= 0) return "sem_limite"
  const percentual = (exposicao / limite) * 100
  if (percentual >= LIMITE_CRITICO) return "critico"
  if (percentual >= LIMITE_ALERTA) return "alerta"
  return "ok"
}

/** Percentual do limite consumido. Devolve null quando não há limite. */
export function percentualDoLimite(exposicao: number, limite?: number): number | null {
  if (!limite || limite <= 0) return null
  return Math.round((exposicao / limite) * 100)
}

/**
 * Saldo devedor APURADO: só ciclos que já tiveram prestação de contas.
 *
 * Diferente da exposição total, que inclui mercadoria entregue e ainda não
 * prestada. A distinção importa no relatório de inadimplência: mercadoria na
 * mão dentro do prazo é ciclo em andamento, não dívida. Usar a exposição total
 * como critério faria toda revendedora com mercadoria aparecer como
 * inadimplente, esvaziando o relatório de significado.
 */
export function saldoDevedorApurado(ciclos: Ciclo[]): number {
  return arredondar2(
    ciclos.reduce((soma, ciclo) => {
      const prestacao = ciclo.prestacaoContas
      if (!prestacao) return soma
      return soma + Math.max(0, prestacao.valorRepassar - (ciclo.totalPago ?? 0))
    }, 0)
  )
}

/** Dias de atraso de um ciclo. Zero quando não está atrasado. */
export function diasEmAtraso(ciclo: Ciclo): number {
  if (getStatusEfetivoCiclo(ciclo) !== "em_atraso") return 0
  const prevista = ciclo.dataEncerramentoPrevista
  if (!prevista) return 0
  // Meio-dia UTC nos dois lados: neutraliza o fuso, como em somarDias().
  const hoje = new Date().toISOString().slice(0, 10)
  const diferenca =
    new Date(`${hoje}T12:00:00Z`).getTime() - new Date(`${prevista}T12:00:00Z`).getTime()
  return Math.max(0, Math.round(diferenca / 86400000))
}

/** Maior atraso entre os ciclos recebidos. */
export function maxDiasEmAtraso(ciclos: Ciclo[]): number {
  return ciclos.reduce((maior, ciclo) => Math.max(maior, diasEmAtraso(ciclo)), 0)
}

/**
 * Ciclo dentro da faixa de aviso: falta pouco para vencer, mas ainda não
 * venceu. Serve para cobrar a prestação de contas com antecedência.
 */
export function estaPrestesAVencer(ciclo: Ciclo): boolean {
  return getStatusEfetivoCiclo(ciclo) === "a_vencer"
}

/**
 * Menor número de dias até o vencimento entre os ciclos que estão na faixa de
 * aviso. É esse número que a tela mostra na contagem regressiva.
 */
export function menorDiasParaVencer(ciclos: Ciclo[]): number | null {
  const prazos = ciclos
    .filter((ciclo) => estaPrestesAVencer(ciclo))
    .map((ciclo) => diasAteVencer(ciclo.dataEncerramentoPrevista))
    .filter((dias): dias is number => dias !== null)

  return prazos.length > 0 ? Math.min(...prazos) : null
}

export interface LinhaRelatorioVendedor {
  /** vazio identifica a linha "Sem vendedor definido" */
  vendedorId: string
  nome: string
  status?: string
  totalRevendedoras: number
  totalEmAberto: number
  emAtraso: number
  comDocumentoPendente: number
}

/**
 * Agrupa as revendedoras por vendedor responsável.
 *
 * O agrupamento é por `vendedorId`, nunca por nome. Revendedoras com o campo
 * legado de texto livre (sem vínculo) caem numa linha "Sem vendedor definido" —
 * não somem do relatório nem são agrupadas por string, que quebraria com
 * acento, espaço a mais ou homônimo.
 */
export function montarRelatorioVendedores(
  vendedores: Vendedor[],
  revendedoras: Revendedora[],
  situacoes: Map<string, SituacaoRevendedora>,
  pendenciasDocumento: Map<string, number>
): LinhaRelatorioVendedor[] {
  const linhas = new Map<string, LinhaRelatorioVendedor>()

  // Todo vendedor aparece, mesmo sem revendedora vinculada.
  for (const vendedor of vendedores) {
    linhas.set(vendedor.id, {
      vendedorId: vendedor.id,
      nome: vendedor.nome,
      status: vendedor.status,
      totalRevendedoras: 0,
      totalEmAberto: 0,
      emAtraso: 0,
      comDocumentoPendente: 0,
    })
  }

  for (const revendedora of revendedoras) {
    const chave = revendedora.vendedorId && linhas.has(revendedora.vendedorId)
      ? revendedora.vendedorId
      : ""

    if (!linhas.has(chave)) {
      linhas.set(chave, {
        vendedorId: "",
        nome: "Sem vendedor definido",
        totalRevendedoras: 0,
        totalEmAberto: 0,
        emAtraso: 0,
        comDocumentoPendente: 0,
      })
    }

    const linha = linhas.get(chave)!
    const situacao = situacoes.get(revendedora.id)
    linha.totalRevendedoras++
    linha.totalEmAberto = arredondar2(linha.totalEmAberto + (situacao?.exposicao ?? 0))
    if (situacao?.emAtraso) linha.emAtraso++
    if ((pendenciasDocumento.get(revendedora.id) ?? 0) > 0) linha.comDocumentoPendente++
  }

  return Array.from(linhas.values()).sort((a, b) => b.totalEmAberto - a.totalEmAberto)
}

export interface SituacaoRevendedora {
  exposicao: number
  emAtraso: boolean
  /** dentro da faixa de aviso: falta pouco para vencer, mas ainda nao venceu */
  prestesAVencer: boolean
  /** dias restantes ate o vencimento, quando na faixa de aviso */
  diasParaVencer: number | null
  classificacao: ClassificacaoLimite
  percentual: number | null
}

/**
 * Monta a situação de cada revendedora a partir dos ciclos abertos.
 * O agrupamento é feito em memória: como só existe um ciclo aberto por
 * revendedora (invariante do `cicloAbertoId`), essa lista é pequena e não
 * cresce com o histórico.
 */
export function montarSituacoes(
  revendedoras: Revendedora[],
  ciclosAbertos: Ciclo[]
): Map<string, SituacaoRevendedora> {
  const porRevendedora = new Map<string, Ciclo[]>()
  for (const ciclo of ciclosAbertos) {
    const atual = porRevendedora.get(ciclo.revendedoraId) ?? []
    atual.push(ciclo)
    porRevendedora.set(ciclo.revendedoraId, atual)
  }

  const situacoes = new Map<string, SituacaoRevendedora>()
  for (const revendedora of revendedoras) {
    const ciclos = porRevendedora.get(revendedora.id) ?? []
    const exposicao = calcularExposicao(ciclos)
    const diasParaVencer = menorDiasParaVencer(ciclos)
    situacoes.set(revendedora.id, {
      exposicao,
      emAtraso: temAtraso(ciclos),
      prestesAVencer: diasParaVencer !== null,
      diasParaVencer,
      classificacao: classificarLimite(exposicao, revendedora.limiteConsignado),
      percentual: percentualDoLimite(exposicao, revendedora.limiteConsignado),
    })
  }
  return situacoes
}
