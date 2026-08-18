/**
 * Tipos de documento do vendedor/representante.
 *
 * Mesma regra dos demais cadastros: a CHAVE é o valor gravado no Firestore e
 * NUNCA muda; o rótulo é só exibição.
 *
 * Espelha lib/documento-revendedora.ts de propósito — os dois cadastros têm
 * ciclos de vida independentes, e unificar agora amarraria um ao outro sem
 * ganho real.
 */
export const DOCUMENTO_VENDEDOR_LABELS: Record<string, string> = {
  contrato_representacao: "Contrato de Representação (assinado)",
  rg: "RG",
  cpf: "CPF",
  comprovante_residencia: "Comprovante de Residência",
  outro: "Outro documento",
}

export const DOCUMENTO_VENDEDOR_CODES = [
  "contrato_representacao",
  "rg",
  "cpf",
  "comprovante_residencia",
  "outro",
] as const

/** Obrigatórios para o representante ser considerado regular. */
export const DOCUMENTOS_VENDEDOR_OBRIGATORIOS = [
  "contrato_representacao",
  "rg",
  "cpf",
  "comprovante_residencia",
]

export function getDocumentoVendedorLabel(tipo?: string | null): string {
  if (!tipo) return ""
  return DOCUMENTO_VENDEDOR_LABELS[tipo] ?? tipo
}

export function isDocumentoVendedorObrigatorio(tipo: string): boolean {
  return DOCUMENTOS_VENDEDOR_OBRIGATORIOS.includes(tipo)
}

/** Tipos obrigatórios que ainda não têm nenhum envio. */
export function documentosVendedorPendentes(documentos: { tipo: string }[]): string[] {
  const enviados = new Set(documentos.map((d) => d.tipo))
  return DOCUMENTOS_VENDEDOR_OBRIGATORIOS.filter((tipo) => !enviados.has(tipo))
}

/**
 * Agrupa os envios por tipo, do mais recente para o mais antigo.
 * A posição na lista É a versão — não existe campo `versao` gravado, porque
 * nada é apagado e a ordem por data já resolve.
 */
export function agruparDocumentosVendedor<T extends { tipo: string; enviadoEm?: string }>(
  documentos: T[]
): Map<string, T[]> {
  const mapa = new Map<string, T[]>()
  for (const documento of documentos) {
    const atual = mapa.get(documento.tipo) ?? []
    atual.push(documento)
    mapa.set(documento.tipo, atual)
  }
  for (const lista of mapa.values()) {
    lista.sort((a, b) => (b.enviadoEm || "").localeCompare(a.enviadoEm || ""))
  }
  return mapa
}
