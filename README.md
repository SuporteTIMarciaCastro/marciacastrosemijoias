# Sistema de Gerenciamento - Márcia Castro Semijoias

## Visão Geral
Este sistema foi desenvolvido para gerenciar diferentes aspectos do negócio da Márcia Castro Semijoias, incluindo lista de desejos, garantias, solicitações de materiais e pagamentos.

## Funcionalidades

### 1. Lista de Desejos
A lista de desejos permite cadastrar e gerenciar produtos desejados pelos clientes.

#### Recursos:
- Cadastro de novos itens com:
  - Nome do cliente
  - Descrição do produto
  - Preço
  - Data de cadastro
  - Status (Pendente, Em produção, Concluído)
- Visualização detalhada de cada item
- Edição de informações
- Remoção de itens
- Filtro de busca por cliente ou descrição

### 2. Lista de Garantia
Gerencia as garantias dos produtos vendidos.

#### Recursos:
- Cadastro de garantias com:
  - Nome do cliente
  - Produto
  - Data da compra
  - Data da garantia
  - Status (Pendente, Em análise, Aprovado, Rejeitado)
  - Observações
- Visualização detalhada
- Edição de informações
- Remoção de registros
- Filtro de busca

### 3. Lista de Materiais
Gerencia as solicitações de materiais para produção.

#### Recursos:
- Cadastro de solicitações com:
  - Setor (Comercial, Marketing, Financeiro, T.I)
  - Material solicitado
  - Quantidade
  - Data da solicitação
  - Status (Pendente, Em análise, Aprovado, Rejeitado)
  - Justificativa
- Visualização detalhada
- Edição de informações
- Remoção de solicitações
- Filtro de busca por setor ou material

### 4. Pagamentos
Gerencia as solicitações de pagamentos e reembolsos.

#### Tipos de Pagamento:

##### Reembolso
- Cadastro com:
  - Finalidade
  - Data
  - Dados para pagamento (dados bancários, PIX ou boleto)
  - Comprovante de pagamento (PDF ou imagem, máximo 900KB)
  - Boleto PDF (quando aplicável)
  - Status (Pendente, Autorizado, Rejeitado)

##### Agendado
- Cadastro com:
  - Forma de pagamento (Boleto, PIX, Cartão)
  - Finalidade
  - Data de vencimento
  - Dados específicos por forma:
    - Boleto: Upload do PDF
    - PIX: Chave PIX
    - Cartão: Link para pagamento
  - Status (Pendente, Autorizado, Rejeitado)

#### Recursos:
- Visualização detalhada
- Edição de informações
- Remoção de solicitações
- Filtro de busca
- Links clicáveis para pagamentos com cartão
- Visualização de comprovantes e boletos

## Navegação

### Menu Principal
- Lista de Desejos
- Lista de Garantia
- Lista de Materiais

### Funcionalidades Globais
- Alternância entre tema claro/escuro
- Botão de logout
- Responsividade para dispositivos móveis

## Dicas de Uso

### Upload de Arquivos
- Formatos aceitos: PDF e imagens
- Tamanho máximo: 900KB
- Imagens são automaticamente comprimidas

### Datas
- Todas as datas são exibidas no formato brasileiro (dd/mm/aaaa)
- Campos de data possuem calendário para seleção

### Status
- Cada módulo possui seus próprios status
- Status são exibidos com cores diferentes para fácil identificação:
  - Verde: Aprovado/Autorizado
  - Vermelho: Rejeitado
  - Cinza: Pendente

### Busca
- Todos os módulos possuem campo de busca
- A busca é feita em tempo real
- Funciona com texto parcial

## Suporte
Em caso de dúvidas ou problemas, entre em contato com o suporte técnico. 