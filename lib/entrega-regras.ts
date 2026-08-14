import { getRevendedoraStatusLabel } from "@/lib/revendedora-status"
import { DOCUMENTO_TIPO_LABELS } from "@/lib/documento-revendedora"
import type { Revendedora } from "@/types"

/**
 * Regras que autorizam (ou não) a entrega de mercadoria a uma revendedora.
 *
 * Centralizadas aqui, puras e sem dependência de Firestore, para que a mesma
 * regra valha na camada de dados (abrirCiclo) e na interface (botão
 * desabilitado com o motivo) — sem risco de as duas divergirem.
 */

/** Único status que autoriza receber mercadoria. */
export const STATUS_PERMITE_ENTREGA = ["ativa"]

/**
 * Documentos que precisam existir antes da entrega.
 *
 * Apenas os dois de peso jurídico: são eles que sustentam a cobrança se a
 * revendedora não prestar contas. RG, CPF e comprovante de residência seguem
 * no checklist da ficha, mas não travam a operação.
 */
export const DOCUMENTOS_EXIGIDOS_PARA_ENTREGA = ["contrato_consignacao", "termo_confissao"]

export function statusPermiteEntrega(status?: string): boolean {
  return STATUS_PERMITE_ENTREGA.includes(status || "")
}

/** Tipos exigidos que ainda não têm nenhum envio. */
export function documentosExigidosPendentes(documentos: { tipo: string }[]): string[] {
  const enviados = new Set(documentos.map((d) => d.tipo))
  return DOCUMENTOS_EXIGIDOS_PARA_ENTREGA.filter((tipo) => !enviados.has(tipo))
}

/**
 * Motivo que impede a entrega, ou null quando está tudo liberado.
 * O texto é o mesmo mostrado na tela e devolvido pelo erro da camada de dados.
 */
export function motivoBloqueioEntrega(
  revendedora: Pick<Revendedora, "status"> | null | undefined,
  documentos: { tipo: string }[]
): string | null {
  if (!revendedora) return "Revendedora não encontrada."

  if (!statusPermiteEntrega(revendedora.status)) {
    return `Revendedora com status "${getRevendedoraStatusLabel(revendedora.status)}" não pode receber mercadoria. Altere o status para "Ativa" para liberar.`
  }

  const pendentes = documentosExigidosPendentes(documentos)
  if (pendentes.length > 0) {
    const nomes = pendentes.map((tipo) => DOCUMENTO_TIPO_LABELS[tipo] ?? tipo).join(" e ")
    return `Envie ${nomes} antes de registrar a entrega.`
  }

  return null
}
