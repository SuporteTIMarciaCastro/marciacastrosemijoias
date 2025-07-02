// Tipo para itens da lista de desejos
export interface WishlistItem {
  id: string
  nome: string
  celular: string
  email: string
  produto: string
  jaComprou: boolean
  lojaDestino: string
  descricao: string
  imagemUrl?: string
  status: "Pendente" | "Em produção" | "Concluído"
  data: string
  createdAt?: string
  updatedAt?: string
  avisado?: boolean
}

// Tipo para itens de garantia
export interface WarrantyItem {
  id: string
  nome: string
  vendedor?: string
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
  finalized?: boolean
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
  materiais?: {
    quantidade: string
    descricao: string
    status?: 'aceito' | 'recusado'
  }[]
  createdAt: Date
  updatedAt: Date
}
