/**
 * Log de auditoria do Gerenciador de Revendas.
 *
 * Como sempre: a CHAVE é o código gravado, o rótulo é só exibição.
 */
export const ACAO_LABELS: Record<string, string> = {
  "revendedora.criar": "Revendedora cadastrada",
  "revendedora.editar": "Revendedora editada",
  "revendedora.excluir": "Revendedora excluída",
  "vendedor.criar": "Vendedor cadastrado",
  "vendedor.editar": "Vendedor editado",
  "vendedor.excluir": "Vendedor excluído",
  "ciclo.abrir": "Entrega registrada / ciclo aberto",
  "ciclo.entregaAdicional": "Entrega adicional autorizada",
  "ciclo.renegociar": "Ciclo renegociado",
  "prestacao.registrar": "Prestação de contas registrada",
  "prestacao.corrigir": "Prestação de contas corrigida",
  "pagamento.registrar": "Pagamento registrado",
  "pagamento.remover": "Pagamento removido",
  "documento.enviar": "Documento enviado",
}

export const ACAO_CODES = Object.keys(ACAO_LABELS)

export function getAcaoLabel(acao?: string | null): string {
  if (!acao) return ""
  return ACAO_LABELS[acao] ?? acao
}

/** Cor da etiqueta por família de ação. */
export function getAcaoCor(acao?: string | null): string {
  if (!acao) return "bg-gray-100 text-gray-800"
  if (acao.endsWith(".excluir") || acao === "pagamento.remover") return "bg-red-100 text-red-800"
  if (acao.startsWith("pagamento.") || acao.startsWith("prestacao."))
    return "bg-green-100 text-green-800"
  if (acao.startsWith("ciclo.")) return "bg-blue-100 text-blue-800"
  if (acao.startsWith("documento.")) return "bg-purple-100 text-purple-800"
  return "bg-gray-100 text-gray-800"
}

export interface AlteracaoCampo {
  campo: string
  de: string
  para: string
}

/** Campo comparado no diff: chave do objeto + rótulo + formatador opcional. */
export interface CampoAuditavel {
  chave: string
  rotulo: string
  formatar?: (valor: any) => string
}

const textoPadrao = (valor: any): string => {
  if (valor === undefined || valor === null || valor === "") return "(vazio)"
  if (typeof valor === "boolean") return valor ? "sim" : "não"
  return String(valor)
}

/**
 * Compara o estado anterior com o novo e devolve só o que mudou.
 *
 * Os valores são gravados JÁ FORMATADOS como texto ("R$ 3.000,00", não 3000):
 * o log precisa registrar o que a pessoa viu na tela, e continuar legível anos
 * depois mesmo que a formatação do sistema mude.
 */
export function calcularAlteracoes(
  antes: Record<string, any> | null | undefined,
  depois: Record<string, any> | null | undefined,
  campos: CampoAuditavel[]
): AlteracaoCampo[] {
  if (!antes || !depois) return []

  const alteracoes: AlteracaoCampo[] = []
  for (const campo of campos) {
    const formatar = campo.formatar ?? textoPadrao
    const valorAntes = antes[campo.chave]
    const valorDepois = depois[campo.chave]

    // Normaliza antes de comparar: "" e undefined são a mesma coisa aqui.
    const a = valorAntes ?? ""
    const d = valorDepois ?? ""
    if (String(a) === String(d)) continue

    alteracoes.push({
      campo: campo.rotulo,
      de: formatar(valorAntes),
      para: formatar(valorDepois),
    })
  }
  return alteracoes
}

export const formatarMoedaAuditoria = (valor: any): string =>
  typeof valor === "number"
    ? valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    : "(vazio)"
