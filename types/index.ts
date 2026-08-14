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
  // Número sequencial gravado na criação. Opcional: garantias criadas antes
  // desta funcionalidade não possuem o campo e exibem "—".
  numeroPedido?: number
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

// Tipo para vendedores/representantes (Gerenciador de Revendas)
export interface Vendedor {
  id: string
  nome: string
  nomeLower?: string
  cpf: string // apenas dígitos
  whatsapp?: string // apenas dígitos
  // E-mail do usuário do sistema vinculado a este vendedor. É o que permite
  // restringir a visão dele às próprias revendedoras.
  usuarioEmail?: string
  // Código do status, não o rótulo. Ver lib/vendedor-status.ts
  status: string
  createdAt?: string
  updatedAt?: string
  criadoPor?: string
}

// Tipo para revendedoras (Gerenciador de Revendas)
export interface Revendedora {
  id: string
  nome: string
  nomeLower?: string
  cpf: string // apenas dígitos
  rg?: string
  cep?: string
  logradouro?: string
  numero?: string
  complemento?: string
  bairro?: string
  cidade?: string
  uf?: string
  whatsapp?: string // apenas dígitos
  // Vínculo com a coleção `vendedores`. Opcional: revendedoras cadastradas antes
  // do cadastro de vendedores não têm o campo e usam apenas o texto abaixo.
  vendedorId?: string
  // Nome do vendedor no momento do salvamento. Em registros legados é o texto
  // livre digitado à mão.
  vendedorResponsavel?: string
  // Código do status, não o rótulo. Ver lib/revendedora-status.ts
  status: string
  limiteConsignado?: number // em reais
  // Prazo padrão dos ciclos desta revendedora, em dias. Pré-preenche o
  // formulário de entrega; ausente cai no padrão global de 30 dias.
  prazoPadraoDias?: number
  // Controle dos ciclos de consignação (Fatia 3). Opcionais: revendedoras
  // cadastradas antes disso não têm os campos.
  ultimoNumeroCiclo?: number // maior número de ciclo já emitido para ela
  cicloAbertoId?: string | null // ciclo em aberto, ou null quando não há
  createdAt?: string
  updatedAt?: string
  criadoPor?: string
}

// Documento anexado a uma revendedora (Gerenciador de Revendas)
// Um registro por ENVIO — nunca sobrescrito. O histórico é imutável por
// construção e a versão é a posição na lista ordenada por enviadoEm.
export interface DocumentoRevendedora {
  id: string
  revendedoraId: string
  tipo: string // código. Ver lib/documento-revendedora.ts
  driveUrl: string
  nomeArquivo: string
  tamanhoBytes?: number
  // Auditoria: quem enviou e quando
  enviadoPorEmail?: string
  enviadoPorNome?: string
  enviadoEm: string // ISO
}

// Prestação de contas de um ciclo de consignação
export interface PrestacaoContas {
  valorVendido: number
  valorDevolvido: number // conferência do que voltou; não entra no cálculo
  valorFalta: number
  percentualComissao: number
  valorComissao: number // snapshot calculado
  valorRepassar: number // snapshot calculado — nunca recalculado na leitura
  // Preenchido só quando o valor é renegociado, preservando o valor apurado
  // originalmente para não perder o histórico da negociação.
  valorRepassarOriginal?: number
  dataPrestacao: string // yyyy-mm-dd
  observacao?: string
  registradoPor?: string
}

// Um lançamento de pagamento dentro do ciclo (pode haver vários, parciais)
export interface PagamentoCiclo {
  id: string
  data: string // yyyy-mm-dd
  valor: number
  forma: string // código. Ver lib/ciclo-status.ts
  comprovanteUrl?: string
  observacao?: string
  registradoPor?: string
  createdAt?: string
}

// Registro do log de auditoria (Gerenciador de Revendas)
export interface RegistroAuditoria {
  id: string
  modulo: string
  acao: string // código. Ver lib/auditoria.ts
  entidade: string // 'revendedora' | 'vendedor' | 'ciclo' | 'documento'
  entidadeId?: string
  /** permite filtrar o histórico direto na ficha da revendedora */
  revendedoraId?: string
  descricao: string
  alteracoes?: { campo: string; de: string; para: string }[]
  usuarioEmail?: string
  usuarioNome?: string
  criadoEm: string // ISO
}

// Autorização de exceção: registra quem liberou uma operação bloqueada por
// regra de negócio e por quê. Sem esse rastro, autorizar não teria valor.
export interface AutorizacaoExcecao {
  justificativa: string
  motivoBloqueio: string // qual regra foi contornada
  autorizadoPorEmail?: string
  autorizadoPorNome?: string
  autorizadoEm: string // ISO
}

// Entrega adicional dentro de um ciclo já aberto. Só existe mediante
// autorização — o caminho normal é encerrar o ciclo antes de nova entrega.
export interface EntregaAdicional {
  id: string
  dataEntrega: string // yyyy-mm-dd
  vendedorEntregaId?: string
  vendedorEntregaNome?: string
  romaneioUrl?: string
  fotoEntregaUrl?: string
  assinaturaUrl?: string
  valorEntregue?: number
  observacao?: string
  autorizacao: AutorizacaoExcecao
  registradoEm: string // ISO
}

// Tipo para ciclos de consignação (Gerenciador de Revendas)
export interface Ciclo {
  id: string
  revendedoraId: string
  numeroCiclo: number // sequencial POR revendedora
  dataEntrega: string // yyyy-mm-dd
  vendedorEntregaId?: string
  vendedorEntregaNome?: string // snapshot do nome no momento da entrega
  romaneioUrl?: string
  fotoEntregaUrl?: string
  assinaturaUrl?: string
  // Valor da mercadoria entregue. Opcional: ciclos criados antes deste campo
  // não o possuem e contam como 0 na exposição, que é o correto para um dado
  // que nunca foi capturado.
  valorEntregue?: number
  prazoDias: number
  dataEncerramentoPrevista: string // yyyy-mm-dd, = dataEntrega + prazoDias
  // Código do status. `em_atraso` nunca é gravado. Ver lib/ciclo-status.ts
  status: string
  dataEncerramentoReal?: string
  observacao?: string
  /** preenchida quando o ciclo foi aberto contornando um bloqueio */
  autorizacao?: AutorizacaoExcecao
  /** entregas extras feitas dentro deste ciclo, sempre com autorização */
  entregasAdicionais?: EntregaAdicional[]
  // Campos da Fatia 4. Todos opcionais: ciclos encerrados pelo botão provisório
  // da Fatia 3 não os possuem e precisam continuar carregando sem erro.
  prestacaoContas?: PrestacaoContas
  pagamentos?: PagamentoCiclo[]
  totalPago?: number
  statusPagamento?: "pendente" | "parcial" | "pago"
  createdAt?: string
  updatedAt?: string
  criadoPor?: string
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
