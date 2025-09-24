export type PermissionKey = 'listaDesejos' | 'listaGarantia' | 'listaMateriais' | 'pagamentos' | 'listaUsuarios';

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
}

export interface User {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
  permissions?: UserPermissions;
} 