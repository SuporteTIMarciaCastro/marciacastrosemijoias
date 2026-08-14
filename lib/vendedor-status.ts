/**
 * Status do vendedor/representante.
 *
 * ATENÇÃO: as CHAVES deste mapa são os valores gravados no Firestore (campo
 * `status`). NUNCA altere as chaves — isso faria os vendedores já cadastrados
 * perderem o status. Para mudar o texto exibido, altere apenas o VALOR.
 */
export const VENDEDOR_STATUS_LABELS: Record<string, string> = {
  ativo: "Ativo",
  inativo: "Inativo",
}

export const VENDEDOR_STATUS_CODES = ["ativo", "inativo"] as const

export const VENDEDOR_STATUS_PADRAO = "ativo"

export const VENDEDOR_STATUS_CORES: Record<string, string> = {
  ativo: "bg-green-100 text-green-800",
  inativo: "bg-gray-100 text-gray-800",
}

export function getVendedorStatusLabel(status?: string | null): string {
  if (!status) return ""
  return VENDEDOR_STATUS_LABELS[status] ?? status
}

export function getVendedorStatusCor(status?: string | null): string {
  if (!status) return "bg-gray-100 text-gray-800"
  return VENDEDOR_STATUS_CORES[status] ?? "bg-gray-100 text-gray-800"
}
