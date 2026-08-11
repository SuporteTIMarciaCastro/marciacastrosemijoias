/**
 * Rótulos de exibição dos status de garantia.
 *
 * ATENÇÃO: as CHAVES deste mapa são os valores realmente gravados no Firestore
 * (campo `status`) e usados nas queries `where("status", "==", ...)`.
 * NUNCA altere as chaves — isso faria os pedidos já salvos perderem o status.
 * Para mudar o texto que o usuário vê, altere apenas o VALOR.
 */
export const WARRANTY_STATUS_LABELS: Record<string, string> = {
  "Recebido loja": "Atendimento (recebido do cliente)",
  "Recebido comercial": "Comercial (recebido do atendimento)",
  "Recebido fábrica": "Enviado para a fábrica",
  "Recebido no escritório": "Recebido no escritório",
  "Devolvido comercial": "Comercial (retornou da fábrica)",
  "Devolvido loja": "Atendimento (retornou do comercial)",
  "Devolvido cliente": "Devolvido ao cliente",
  "Extraviada-crédito cliente": "Extraviada-crédito cliente",
  Negado: "Negado",
}

/**
 * Converte o valor armazenado no banco para o rótulo visível.
 * Valores desconhecidos (registros antigos, "Finalizada", etc.) são devolvidos
 * sem alteração, garantindo que nada suma da tela.
 */
export function getWarrantyStatusLabel(status?: string | null): string {
  if (!status) return ""
  return WARRANTY_STATUS_LABELS[status] ?? status
}
