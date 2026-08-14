/**
 * Tipos de documento da revendedora.
 *
 * ATENÇÃO: as CHAVES são os valores gravados no Firestore. NUNCA altere as
 * chaves — só os rótulos.
 *
 * O comprovante de pagamento NÃO está aqui de propósito: ele é anexado dentro
 * de cada pagamento do ciclo (Fatia 4), onde tem o contexto de valor, data e
 * forma. Duplicar aqui criaria dois lugares para a mesma informação.
 */
export const DOCUMENTO_TIPO_LABELS: Record<string, string> = {
  rg: "RG",
  cpf: "CPF",
  comprovante_residencia: "Comprovante de Residência",
  contrato_consignacao: "Contrato de Consignação (assinado)",
  termo_confissao: "Termo de Confissão de Dívida (assinado)",
  boletim_ocorrencia: "Boletim de Ocorrência",
}

// Ordem de exibição no checklist e no seletor.
export const DOCUMENTO_TIPO_CODES = [
  "rg",
  "cpf",
  "comprovante_residencia",
  "contrato_consignacao",
  "termo_confissao",
  "boletim_ocorrencia",
] as const

/** Obrigatórios para a revendedora ser considerada regular. */
export const DOCUMENTOS_OBRIGATORIOS = [
  "rg",
  "cpf",
  "comprovante_residencia",
  "contrato_consignacao",
  "termo_confissao",
]

/**
 * Documentos pessoais sensíveis (LGPD). Sobem com `publico: false` e vão para a
 * pasta restrita. Os demais são documentos do negócio, mas por simplicidade e
 * segurança todo o conjunto recebe o mesmo tratamento.
 */
export const DOCUMENTOS_SENSIVEIS = ["rg", "cpf", "comprovante_residencia"]

export function getDocumentoTipoLabel(tipo?: string | null): string {
  if (!tipo) return ""
  return DOCUMENTO_TIPO_LABELS[tipo] ?? tipo
}

export function isDocumentoObrigatorio(tipo: string): boolean {
  return DOCUMENTOS_OBRIGATORIOS.includes(tipo)
}

/**
 * Lista os tipos obrigatórios que ainda não têm nenhum envio.
 * Recebe os documentos já carregados — não faz consulta.
 */
export function documentosPendentes(documentos: { tipo: string }[]): string[] {
  const enviados = new Set(documentos.map((d) => d.tipo))
  return DOCUMENTOS_OBRIGATORIOS.filter((tipo) => !enviados.has(tipo))
}

/**
 * Agrupa os envios por tipo, do mais recente para o mais antigo.
 * A posição na lista É a versão: o primeiro é a versão atual. Não existe campo
 * `versao` gravado — número de versão no banco é mais uma coisa que pode
 * duplicar ou furar, e como nada é apagado a ordem por data já resolve.
 */
export function agruparPorTipo<T extends { tipo: string; enviadoEm?: string }>(
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
