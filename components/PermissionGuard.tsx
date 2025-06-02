import { ReactNode } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { UserPermissions } from '@/types/permissions';

interface PermissionGuardProps {
  children: ReactNode;
  module: keyof UserPermissions;
  action: 'visualizar' | 'adicionar' | 'editar' | 'remover';
  fallback?: ReactNode;
}

export function PermissionGuard({ 
  children, 
  module, 
  action, 
  fallback = null 
}: PermissionGuardProps) {
  const { can, loading } = usePermissions();

  if (loading) {
    return null;
  }

  if (!can(module, action)) {
    return fallback;
  }

  return <>{children}</>;
} 