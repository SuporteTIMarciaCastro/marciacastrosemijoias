/**
 * Quem aparece em Estatisticas de Atendimento.
 *
 * A API externa (integracao do Kommo) devolve TODO o historico, incluindo
 * atendentes que sairam da empresa ha meses e contas que nao sao de
 * atendimento (as lojas, registros sem nome). Isso poluia a tela e distorcia
 * os rankings e os insights, que comparam uma pessoa com as outras.
 *
 * A filtragem e por `user_id`, nunca por nome: o id e estavel no Kommo,
 * enquanto o nome muda com correcao de grafia, acento ou maiuscula.
 *
 * IMPORTANTE: esta lista e fechada. Quem nao estiver aqui NAO aparece na tela,
 * mesmo atendendo no Kommo. Ao contratar alguem, inclua o id dela aqui — para
 * descobrir o id, consulte a API de metricas e procure o campo `user_id` ao
 * lado do nome.
 *
 * Nada e apagado: os dados continuam existindo na origem e voltam a aparecer
 * assim que o id for reincluido.
 */

export const ATENDENTES_ATIVOS: { id: number; nome: string }[] = [
  { id: 12058112, nome: "CYNARA" },
  { id: 14970615, nome: "MARIA CLARA" },
  { id: 15512727, nome: "LETICIA" },
  // Conta da administracao: nao e atendente, mas tem volume real e a diretoria
  // quer continuar acompanhando.
  { id: 8375945, nome: "Administração" },
]

const IDS_ATIVOS = new Set(ATENDENTES_ATIVOS.map((a) => a.id))

/** true quando o registro pertence a alguem que deve aparecer na tela. */
export function ehAtendenteAtivo(registro: { user_id?: number | null }): boolean {
  return typeof registro?.user_id === "number" && IDS_ATIVOS.has(registro.user_id)
}
