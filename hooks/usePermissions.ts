import { useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { UserPermissions } from '@/types/permissions';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export function usePermissions() {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPermissions() {
      if (!user) {
        setPermissions(null);
        setLoading(false);
        return;
      }

      try {
        // Se for admin, tem todas as permissões
        if (user.isAdmin) {
          setPermissions({
            listaDesejos: { visualizar: true, adicionar: true, editar: true, remover: true },
            listaGarantia: { visualizar: true, adicionar: true, editar: true, remover: true },
            listaMateriais: { visualizar: true, adicionar: true, editar: true, remover: true },
            pagamentos: { visualizar: true, adicionar: true, editar: true, remover: true }
          });
          setLoading(false);
          return;
        }

        // Se o usuário já tem permissões carregadas, usa elas
        if (user.permissions) {
          setPermissions(user.permissions);
          setLoading(false);
          return;
        }

        // Busca permissões no Firestore
        const userDoc = await getDoc(doc(db, 'users', user.email));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setPermissions(userData.permissions || null);
        }
      } catch (error) {
        console.error('Erro ao carregar permissões:', error);
      } finally {
        setLoading(false);
      }
    }

    loadPermissions();
  }, [user]);

  const can = (module: keyof UserPermissions, action: 'visualizar' | 'adicionar' | 'editar' | 'remover') => {
    if (!user) return false;
    if (user.isAdmin) return true;
    if (!permissions) return false;
    return permissions[module]?.[action] || false;
  };

  return {
    permissions,
    loading,
    can
  };
} 