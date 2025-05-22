// Tipo para itens da lista de desejos
export interface WishlistItem {
  id: string
  nome: string
  celular: string
  email: string
  produto: string
  jaComprou: boolean
  lojaDestino: string
  imagemBase64: string | null
  descricao: string
  createdAt?: string
  updatedAt?: string
}

// Tipo para itens de garantia
export interface WarrantyItem {
  id: string
  nome: string
  dataCompra: string
  dataValidade: string
  status: string
  loja: string
  observacao?: string
  notaCompra?: string
  whatsapp?: string
  email?: string
  imagemPecas?: string | null
  descricaoPecas?: string
  createdAt?: string
  updatedAt?: string
}

// Tipo para solicitações de materiais
export interface MaterialRequest {
  id: string
  setor: string
  descricao: string
  justificativa: string
  grau: string
  status: string
  createdAt?: string
  updatedAt?: string
}
