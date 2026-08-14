export type PermissionKey = 'listaDesejos' | 'listaGarantia' | 'listaRetiradas' | 'listaMateriais' | 'pagamentos' | 'listaUsuarios' | 'estatisticasAtendimento' | 'gerenciadorRevendas';

export interface UserPermissions {
  // Permissões de Lista de Desejos
  listaDesejos: {
    visualizarPage: boolean;
    visualizar: boolean;
    adicionar: boolean;
    editar: boolean;
    editar_basico: boolean;
    remover: boolean;
  };
  
  // Permissões de Lista de Garantia
  listaGarantia: {
    visualizarPage: boolean;
    visualizar: boolean;
    adicionar: boolean;
    editar: boolean;
    editar_basico: boolean;
    remover: boolean;
    finalizar: boolean;
  };
  
  // Permissões de Lista de Retiradas (link externo)
  listaRetiradas: {
    visualizarPage: boolean;
    visualizar: boolean;
    adicionar: boolean;
    editar: boolean;
    remover: boolean;
  };

  // Permissões de Lista de Materiais
  listaMateriais: {
    visualizarPage: boolean;
    visualizar: boolean;
    adicionar: boolean;
    editar: boolean;
    editar_basico: boolean;
    remover: boolean;
  };
  
  // Permissões de Pagamentos
  pagamentos: {
    visualizarPage: boolean;
    visualizar: boolean;
    adicionar: boolean;
    editar: boolean;
    editar_basico: boolean;
    remover: boolean;
  };
  
  // Permissões de Lista de Usuários
  listaUsuarios: {
    visualizarPage: boolean;
    visualizar: boolean;
    adicionar: boolean;
    editar: boolean;
    remover: boolean;
  };

  // Permissões de Estatísticas de Atendimento
  estatisticasAtendimento: {
    visualizarPage: boolean;
  };

  // Permissões de Gerenciador de Revendas
  gerenciadorRevendas: {
    visualizarPage: boolean;
    visualizar: boolean;
    adicionar: boolean;
    editar: boolean;
    remover: boolean;
    // Capacidades por papel. Opcionais: usuários configurados antes destas
    // caixas existirem não as possuem e herdam da caixa equivalente antiga
    // (ver lib/permissoes-revenda.ts), então nada regride no dia do deploy.
    lancarPagamento?: boolean;
    verRelatorios?: boolean;
    gerenciarVendedores?: boolean;
    enviarDocumentos?: boolean;
    /** restringe a visão às revendedoras do vendedor vinculado ao usuário */
    apenasProprias?: boolean;
    /** autoriza entrega mesmo com pendência, mediante justificativa registrada */
    autorizarExcecao?: boolean;
  };
}

export interface User {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
  permissions?: UserPermissions;
} 