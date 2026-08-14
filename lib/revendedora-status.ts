/**
 * Status da revendedora.
 *
 * ATENÇÃO: as CHAVES deste mapa são os valores gravados no Firestore (campo
 * `status`) e usados nas queries `where("status", "==", ...)`.
 * NUNCA altere as chaves — isso faria as revendedoras já cadastradas perderem
 * o status. Para mudar o texto que o usuário vê, altere apenas o VALOR.
 *
 * Diferente da Lista de Garantia (onde o rótulo virou a chave por acidente e
 * exigiu uma camada de tradução depois), aqui a chave já nasce como código.
 */
export const REVENDEDORA_STATUS_LABELS: Record<string, string> = {
  ativa: "Ativa",
  inadimplente: "Inadimplente",
  bloqueada: "Bloqueada",
  processo_judicial: "Em processo judicial",
  encerrada: "Encerrada",
}

// Ordem de exibição no filtro e no formulário.
export const REVENDEDORA_STATUS_CODES = [
  "ativa",
  "inadimplente",
  "bloqueada",
  "processo_judicial",
  "encerrada",
] as const

export const REVENDEDORA_STATUS_PADRAO = "ativa"

// Cores da badge por status.
export const REVENDEDORA_STATUS_CORES: Record<string, string> = {
  ativa: "bg-green-100 text-green-800",
  inadimplente: "bg-amber-100 text-amber-800",
  bloqueada: "bg-red-100 text-red-800",
  processo_judicial: "bg-purple-100 text-purple-800",
  encerrada: "bg-gray-100 text-gray-800",
}

// Converte o código armazenado para o rótulo visível. Código desconhecido é
// devolvido sem alteração, garantindo que nada suma da tela.
export function getRevendedoraStatusLabel(status?: string | null): string {
  if (!status) return ""
  return REVENDEDORA_STATUS_LABELS[status] ?? status
}

export function getRevendedoraStatusCor(status?: string | null): string {
  if (!status) return "bg-gray-100 text-gray-800"
  return REVENDEDORA_STATUS_CORES[status] ?? "bg-gray-100 text-gray-800"
}
