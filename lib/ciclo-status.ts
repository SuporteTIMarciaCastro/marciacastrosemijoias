/**
 * Status do ciclo de consignação.
 *
 * ATENÇÃO: as CHAVES são os valores gravados no Firestore. NUNCA altere as
 * chaves — só os rótulos.
 *
 * `em_atraso` é o único que NÃO é gravado: ele é derivado na leitura por
 * getStatusEfetivoCiclo(). O projeto não tem job agendado, então um status de
 * atraso gravado nunca mudaria sozinho quando a data vencesse.
 */
export const CICLO_STATUS_LABELS: Record<string, string> = {
  em_andamento: "Em andamento",
  // Mantido apenas para não quebrar registros antigos que tenham este valor.
  // O fluxo atual não grava mais este status: entregue e sem prestação já é
  // "em andamento".
  aguardando_prestacao: "Aguardando prestação de contas",
  aguardando_pagamento: "Aguardando pagamento",
  em_atraso: "Em atraso",
  encerrado: "Encerrado",
  renegociado: "Renegociado",
}

// Status que podem ser gravados no banco (em_atraso fica de fora de propósito).
export const CICLO_STATUS_CODES = [
  "em_andamento",
  "aguardando_pagamento",
  "encerrado",
  "renegociado",
] as const

export const CICLO_STATUS_PADRAO = "em_andamento"

/**
 * Status que mantêm o ciclo ABERTO e portanto bloqueiam uma nova entrega.
 *
 * `renegociado` bloqueia por prudência: presume obrigação ainda pendente.
 * Se a regra do negócio for outra, basta removê-lo desta lista.
 */
export const CICLO_STATUS_ABERTOS = [
  "em_andamento",
  "aguardando_prestacao",
  "aguardando_pagamento",
  "renegociado",
]

export const CICLO_STATUS_CORES: Record<string, string> = {
  em_andamento: "bg-blue-100 text-blue-800",
  aguardando_prestacao: "bg-amber-100 text-amber-800",
  aguardando_pagamento: "bg-amber-100 text-amber-800",
  em_atraso: "bg-red-100 text-red-800",
  encerrado: "bg-green-100 text-green-800",
  renegociado: "bg-purple-100 text-purple-800",
}

/**
 * Formas de pagamento. Mesma regra: a CHAVE é o valor gravado, o rótulo é só
 * exibição.
 */
export const FORMA_PAGAMENTO_LABELS: Record<string, string> = {
  dinheiro: "Dinheiro",
  pix: "PIX",
  cartao: "Cartão",
  transferencia: "Transferência",
  outro: "Outro",
}

export const FORMA_PAGAMENTO_CODES = ["dinheiro", "pix", "cartao", "transferencia", "outro"] as const

export const FORMA_PAGAMENTO_PADRAO = "pix"

export function getFormaPagamentoLabel(forma?: string | null): string {
  if (!forma) return "-"
  return FORMA_PAGAMENTO_LABELS[forma] ?? forma
}

/** Status do pagamento da prestação de contas. */
export const STATUS_PAGAMENTO_LABELS: Record<string, string> = {
  pendente: "Pendente",
  parcial: "Parcial",
  pago: "Pago",
}

export function getStatusPagamentoLabel(status?: string | null): string {
  if (!status) return "-"
  return STATUS_PAGAMENTO_LABELS[status] ?? status
}

// Arredonda para 2 casas, evitando ruído de ponto flutuante em valores.
export function arredondar2(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100
}

/**
 * Valor que a revendedora deve repassar para a loja.
 *
 * A revendedora deve pelo que vendeu E pelo que está em falta (mercadoria que
 * sumiu é prejuízo assumido por ela), descontada a comissão sobre a venda.
 * `valorDevolvido` NÃO entra na conta — é registro de conferência do que voltou
 * fisicamente.
 */
export function calcularValorRepassar(
  valorVendido: number,
  valorFalta: number,
  percentualComissao: number
): { valorComissao: number; valorRepassar: number } {
  const vendido = Number.isFinite(valorVendido) ? valorVendido : 0
  const falta = Number.isFinite(valorFalta) ? valorFalta : 0
  const percentual = Number.isFinite(percentualComissao) ? percentualComissao : 0

  const valorComissao = arredondar2(vendido * (percentual / 100))
  const valorRepassar = arredondar2(vendido + falta - valorComissao)

  return { valorComissao, valorRepassar }
}

// Tolerância de meio centavo, para que arredondamento não impeça a quitação.
export function estaQuitado(totalPago: number, valorRepassar: number): boolean {
  return totalPago >= valorRepassar - 0.005
}

export function getCicloStatusLabel(status?: string | null): string {
  if (!status) return ""
  return CICLO_STATUS_LABELS[status] ?? status
}

export function getCicloStatusCor(status?: string | null): string {
  if (!status) return "bg-gray-100 text-gray-800"
  return CICLO_STATUS_CORES[status] ?? "bg-gray-100 text-gray-800"
}

/**
 * Status efetivo para exibição: devolve `em_atraso` quando o ciclo ainda está
 * aberto e a data prevista de encerramento já passou. Nada é gravado.
 */
export function getStatusEfetivoCiclo(ciclo: {
  status?: string
  dataEncerramentoPrevista?: string
}): string {
  const status = ciclo.status || CICLO_STATUS_PADRAO
  // `renegociado` fica de fora de propósito: é uma decisão gerencial explícita
  // e não deve ser mascarada por "em atraso".
  const podeAtrasar = ["em_andamento", "aguardando_prestacao", "aguardando_pagamento"]
  if (!podeAtrasar.includes(status)) {
    return status
  }
  if (!ciclo.dataEncerramentoPrevista) return status

  // Compara apenas a data (yyyy-mm-dd), evitando fuso horário.
  const hoje = new Date().toISOString().slice(0, 10)
  return ciclo.dataEncerramentoPrevista < hoje ? "em_atraso" : status
}

// Soma dias a uma data no formato yyyy-mm-dd, devolvendo no mesmo formato.
export function somarDias(dataISO: string, dias: number): string {
  if (!dataISO) return ""
  // Meio-dia UTC evita que o fuso horário jogue a data para o dia anterior.
  const data = new Date(`${dataISO}T12:00:00Z`)
  if (Number.isNaN(data.getTime())) return ""
  data.setUTCDate(data.getUTCDate() + dias)
  return data.toISOString().slice(0, 10)
}

// Exibe yyyy-mm-dd como dd/mm/yyyy.
export function formatarDataBR(dataISO?: string): string {
  if (!dataISO) return "-"
  const partes = dataISO.slice(0, 10).split("-")
  if (partes.length !== 3) return dataISO
  return `${partes[2]}/${partes[1]}/${partes[0]}`
}
