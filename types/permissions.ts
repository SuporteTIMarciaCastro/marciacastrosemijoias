export type PermissionKey = 'listaDesejos' | 'listaGarantia' | 'listaMateriais' | 'pagamentos';

export interface UserPermissions {
  // Permissões de Lista de Desejos
  listaDesejos: {
    visualizarPage: boolean;
    visualizar: boolean;
    adicionar: boolean;
    editar: boolean;
    remover: boolean;
  };
  
  // Permissões de Lista de Garantia
  listaGarantia: {
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
    remover: boolean;
  };
  
  // Permissões de Pagamentos
  pagamentos: {
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