'use client';

import Header from "@/components/header";
import { fetchAutenticado } from "@/lib/api-client"
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { db } from '@/lib/firebase/firebase';
import { collection, getDocs } from 'firebase/firestore';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, UserPlus } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import type { UserPermissions } from '@/types/permissions';
import { PRESETS_PAPEL } from '@/lib/permissoes-revenda';

// Define um tipo mais robusto para o usuário, evitando o uso excessivo de `any`
type UserData = {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  permissions?: UserPermissions;
};

export default function UsuariosPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [openAdd, setOpenAdd] = useState(false);
  
  const initialFormState = { name: '', email: '', password: '', isAdmin: false };
  const initialPermsState: UserPermissions = {
    listaDesejos: { visualizarPage: false, visualizar: false, adicionar: false, editar: false, editar_basico: false, remover: false },
    listaGarantia: { visualizarPage: false, visualizar: false, adicionar: false, editar: false, editar_basico: false, remover: false, finalizar: false },
    listaRetiradas: { visualizarPage: false, visualizar: false, adicionar: false, editar: false, remover: false },
    listaMateriais: { visualizarPage: false, visualizar: false, adicionar: false, editar: false, editar_basico: false, remover: false },
    pagamentos: { visualizarPage: false, visualizar: false, adicionar: false, editar: false, editar_basico: false, remover: false },
    listaUsuarios: { visualizarPage: false, visualizar: false, adicionar: false, editar: false, remover: false },
    estatisticasAtendimento: { visualizarPage: false },
    gerenciadorRevendas: { visualizarPage: false, visualizar: false, adicionar: false, editar: false, remover: false, lancarPagamento: false, verRelatorios: false, gerenciarVendedores: false, enviarDocumentos: false, apenasProprias: false, autorizarExcecao: false },
  };

  const [form, setForm] = useState(initialFormState);
  const [perms, setPerms] = useState<UserPermissions>(initialPermsState);
  const [isEdit, setIsEdit] = useState<{ active: boolean; uid: string | null }>({ active: false, uid: null });

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (!user.permissions?.listaUsuarios?.visualizarPage) {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  const fetchUsers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const usersData = querySnapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as UserData[];
      setUsers(usersData);
    } catch (e) {
      console.error('Erro ao carregar usuários', e);
      alert('Falha ao carregar a lista de usuários.');
    }
  };

  // Carregar usuários na montagem do componente
  useEffect(() => {
    fetchUsers();
  }, []);

  const handleApiResponse = async (response: Response) => {
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.error || `Erro na operação: ${response.statusText}`);
    }
    // Sucesso: fecha modal, reseta formulário e recarrega lista
    setOpenAdd(false);
    await fetchUsers();
  };

  const handleUpdateUser = async () => {
    if (!isEdit.uid) return;
    try {
      const res = await fetchAutenticado(`/api/users/update/${isEdit.uid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password || undefined, // Não envia senha se estiver vazia
          isAdmin: form.isAdmin,
          permissions: perms,
        }),
      });
      await handleApiResponse(res);
    } catch (e) {
      console.error('Erro ao atualizar usuário', e);
      alert(e instanceof Error ? e.message : 'Falha ao atualizar usuário');
    }
  };

  const handleCreateUser = async () => {
    try {
      const res = await fetchAutenticado('/api/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          isAdmin: form.isAdmin,
          permissions: perms,
        }),
      });
      await handleApiResponse(res);
    } catch (e) {
      console.error('Erro ao criar usuário', e);
      alert(e instanceof Error ? e.message : 'Falha ao criar usuário');
    }
  };

  const handleDeleteUser = async (uid: string) => {
    if (!confirm('Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.')) return;
    try {
      const res = await fetchAutenticado(`/api/users/delete/${uid}`, { method: 'DELETE' });
      await handleApiResponse(res);
    } catch (e) {
      console.error('Erro ao excluir usuário', e);
      alert(e instanceof Error ? e.message : 'Falha ao excluir usuário');
    }
  };

  const openCreateModal = () => {
    setIsEdit({ active: false, uid: null });
    setForm(initialFormState);
    setPerms(initialPermsState);
    setOpenAdd(true);
  };

  const openEditModal = (u: UserData) => {
    setIsEdit({ active: true, uid: u.id });
    setForm({ name: u.name || '', email: u.email || '', password: '', isAdmin: !!u.isAdmin });
    setPerms(u.permissions || initialPermsState);
    setOpenAdd(true);
  };

  const sections = useMemo(() => ([
    // 
    { key: 'listaDesejos', label: 'Lista de Desejos', fields: [
      { key: 'visualizarPage', label: 'Visualizar página' }, 
      { key: 'visualizar', label: 'Visualizar item' },
      { key: 'adicionar', label: 'Adicionar item' }, 
      { key: 'editar', label: 'Editar item' },
      { key: 'editar_basico', label: 'Editar básico' }, 
      { key: 'remover', label: 'Remover item' },
    ]},
    { key: 'listaGarantia', label: 'Lista de Garantia', fields: [
      { key: 'visualizarPage', label: 'Visualizar página' }, 
      { key: 'visualizar', label: 'Visualizar item' },
      { key: 'adicionar', label: 'Adicionar item' }, 
      { key: 'editar', label: 'Editar item' },
      { key: 'editar_basico', label: 'Editar básico' }, 
      { key: 'remover', label: 'Remover item' },
      { key: 'finalizar', label: 'Finalizar item' },
    ]},
    { key: 'listaRetiradas', label: 'Lista de Retiradas', fields: [
      { key: 'visualizarPage', label: 'Visualizar página' },
      { key: 'visualizar', label: 'Visualizar item' },
      { key: 'adicionar', label: 'Adicionar item' },
      { key: 'editar', label: 'Editar item' },
      { key: 'remover', label: 'Remover item' },
    ]},
    { key: 'listaMateriais', label: 'Lista de Materiais', fields: [
      { key: 'visualizarPage', label: 'Visualizar página' },
      { key: 'visualizar', label: 'Visualizar item' },
      { key: 'adicionar', label: 'Adicionar item' }, 
      { key: 'editar', label: 'Editar item' },
      { key: 'editar_basico', label: 'Editar básico' }, 
      { key: 'remover', label: 'Remover item' },
    ]},
    { key: 'pagamentos', label: 'Pagamentos', fields: [
      { key: 'visualizarPage', label: 'Visualizar página' }, 
      { key: 'visualizar', label: 'Visualizar item' },
      { key: 'adicionar', label: 'Adicionar item' }, 
      { key: 'editar', label: 'Editar item' },
      { key: 'editar_basico', label: 'Editar básico' }, 
      { key: 'remover', label: 'Remover item' },
    ]},
    { key: 'listaUsuarios', label: 'Lista de Usuários', fields: [
        { key: 'visualizarPage', label: 'Visualizar Página' },
        { key: 'visualizar', label: 'Visualizar Usuário' },
        { key: 'adicionar', label: 'Adicionar Usuário' },
        { key: 'editar', label: 'Editar Usuário' },
        { key: 'remover', label: 'Remover Usuário' },
    ]},
    { key: 'estatisticasAtendimento', label: 'Estatísticas de Atendimento', fields: [
        { key: 'visualizarPage', label: 'Visualizar Página' },
    ]},
    { key: 'gerenciadorRevendas', label: 'Gerenciador de Revendas', presets: PRESETS_PAPEL, fields: [
      { key: 'visualizarPage', label: 'Visualizar página' },
      { key: 'visualizar', label: 'Visualizar item' },
      { key: 'adicionar', label: 'Adicionar item' },
      { key: 'editar', label: 'Editar item' },
      { key: 'remover', label: 'Remover item' },
      { key: 'lancarPagamento', label: 'Lançar prestação e pagamento' },
      { key: 'verRelatorios', label: 'Ver relatórios' },
      { key: 'gerenciarVendedores', label: 'Gerenciar vendedores' },
      { key: 'enviarDocumentos', label: 'Enviar documentos' },
      { key: 'apenasProprias', label: 'Somente as próprias revendedoras' },
      { key: 'autorizarExcecao', label: 'Autorizar entrega com pendência' },
    ]},
  ]), []);

  // Aplica um preset de papel: substitui apenas as caixas daquela seção.
  const aplicarPreset = (sectionKey: keyof UserPermissions, preset: Record<string, boolean>) => {
    setPerms(prev => ({
      ...prev,
      [sectionKey]: { ...prev[sectionKey], ...preset },
    }));
  };

  const togglePerm = (sectionKey: keyof UserPermissions, field: string, value: boolean) => {
    setPerms(prev => ({
      ...prev,
      [sectionKey]: { ...prev[sectionKey], [field]: value },
    }));
  };

  if (loading) return null;
  if (!user) return null; // Retorna nulo enquanto verifica o usuário para evitar piscar a tela

  return (
    <div className="flex flex-col gap-4 p-4">
      <Header title="Lista de Usuários" />

      <div className="flex justify-end">
        <Dialog open={openAdd} onOpenChange={setOpenAdd}>
          <DialogTrigger asChild>
            <Button onClick={openCreateModal}>
              <UserPlus className="mr-2 h-4 w-4" />
              Adicionar Usuário
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{isEdit.active ? 'Editar Usuário' : 'Adicionar Usuário'}</DialogTitle>
            </DialogHeader>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">Nome</label>
                <Input id="name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nome do usuário" />
              </div>
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">E-mail</label>
                <Input id="email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@exemplo.com" />
              </div>
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">Senha</label>
                <Input id="password" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder={isEdit.active ? 'Deixe em branco para não alterar' : '••••••••'} />
              </div>
              <div className="flex items-center gap-2 pt-1 md:pt-6">
                <Checkbox id="isAdmin" checked={form.isAdmin} onCheckedChange={(v) => setForm({ ...form, isAdmin: !!v })} />
                <label htmlFor="isAdmin" className="text-sm">Administrador</label>
              </div>
            </div>

            <div className="space-y-4 pb-2">
              <h3 className="text-lg font-semibold">Permissões</h3>
              {sections.map(section => (
                <div key={section.key} className="border rounded-md p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div className="font-semibold text-base">{section.label}</div>
                    {/* Presets marcam o conjunto de caixas de uma vez; depois dá
                        para ajustar caixa por caixa normalmente. */}
                    {'presets' in section && section.presets && (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-gray-500">Aplicar papel:</span>
                        {Object.keys(section.presets).map((papel) => (
                          <Button
                            key={papel}
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => aplicarPreset(section.key as keyof UserPermissions, (section as any).presets[papel])}
                          >
                            {papel}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {section.fields.map(field => (
                      <div key={field.key} className="flex items-center gap-2">
                        <Checkbox
                          id={`${section.key}-${field.key}`}
                          checked={!!(perms as any)[section.key]?.[field.key]}
                          onCheckedChange={(v) => togglePerm(section.key as keyof UserPermissions, field.key, !!v)}
                        />
                        <label htmlFor={`${section.key}-${field.key}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">{field.label}</label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenAdd(false)}>Cancelar</Button>
              <Button onClick={isEdit.active ? handleUpdateUser : handleCreateUser}>
                {isEdit.active ? 'Salvar Alterações' : 'Criar Usuário'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Admin</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={4} className="text-center">Carregando...</TableCell></TableRow>
            ) : users.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.name}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>{u.isAdmin ? 'Sim' : 'Não'}</TableCell>
                <TableCell className="text-right space-x-2">
                  {user.permissions?.listaUsuarios?.editar && (
                    <Button variant="outline" size="sm" onClick={() => openEditModal(u)}><Pencil className="h-4 w-4" /></Button>
                  )}
                  {user.permissions?.listaUsuarios?.remover && (
                    <Button variant="destructive" size="sm" onClick={() => handleDeleteUser(u.id)}><Trash2 className="h-4 w-4" /></Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
