export interface UserPermissions {
  // Permissões de Lista de Desejos
  listaDesejos: {
    visualizar: boolean;
    adicionar: boolean;
    editar: boolean;
    remover: boolean;
  };
  
  // Permissões de Lista de Garantia
  listaGarantia: {
    visualizar: boolean;
    adicionar: boolean;
    editar: boolean;
    remover: boolean;
  };
  
  // Permissões de Lista de Materiais
  listaMateriais: {
    visualizar: boolean;
    adicionar: boolean;
    editar: boolean;
    remover: boolean;
  };
  
  // Permissões de Pagamentos
  pagamentos: {
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