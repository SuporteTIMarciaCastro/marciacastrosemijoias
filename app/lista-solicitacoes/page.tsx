"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/context/auth-context"
import { useToast } from "@/components/ui/use-toast"
import { fetchMaterialRequests, deleteMaterialRequest } from "@/lib/firebase/material-requests"
import type { MaterialRequest } from "@/types"
import Header from "@/components/header"
import SolicitacaoFormModal from "@/components/solicitacao-form-modal"
import { GrauBadge } from "@/components/grau-badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { MoreHorizontal, Eye, Pencil, Trash2, Filter, X } from "lucide-react"
import { ActionsMenu } from "@/components/actions-menu"

export default function ListaSolicitacoesPage() {
  const [materialRequests, setMaterialRequests] = useState<MaterialRequest[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [setorFilter, setSetorFilter] = useState("todos")
  const [statusFilter, setStatusFilter] = useState("todos")
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>(undefined)
  const [itemToDelete, setItemToDelete] = useState<string | null>(null)
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const loadMaterialRequests = async () => {
    setIsLoading(true)
    try {
      const requests = await fetchMaterialRequests()
      setMaterialRequests(requests)
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível carregar a lista de solicitações",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!user) {
      router.push("/login")
      return
    }

    loadMaterialRequests()
  }, [user, router, toast])

  const handleDelete = async (id: string) => {
    setItemToDelete(null)
    try {
      await deleteMaterialRequest(id)
      setMaterialRequests(materialRequests.filter((request) => request.id !== id))
      toast({
        title: "Sucesso",
        description: "Solicitação removida com sucesso",
      })
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível remover a solicitação",
        variant: "destructive",
      })
    }
  }

  const handleAddNew = () => {
    setSelectedItemId(undefined)
    setIsModalOpen(true)
  }

  const handleEdit = (id: string) => {
    setSelectedItemId(id)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedItemId(undefined)
  }

  const handleSuccess = () => {
    loadMaterialRequests()
  }

  const handleView = (id: string) => {
    router.push(`/lista-solicitacoes/visualizar/${id}`)
  }

  const clearFilters = () => {
    setSearchTerm("")
    setSetorFilter("todos")
    setStatusFilter("todos")
  }

  const filteredRequests = materialRequests.filter((request) => {
    const matchesSearch = 
      request.setor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.status.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesSetor = 
      setorFilter === "todos" || 
      request.setor.toLowerCase().includes(setorFilter.toLowerCase())
    
    const matchesStatus = 
      statusFilter === "todos" || 
      request.status.toLowerCase().includes(statusFilter.toLowerCase())
    
    return matchesSearch && matchesSetor && matchesStatus
  })

  // Obter lista única de setores para o filtro
  const setores = [...new Set(materialRequests.map(request => request.setor))].sort()

  // Obter lista única de status para o filtro
  const statusOptions = [...new Set(materialRequests.map(request => request.status))].sort()

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "concluído":
        return <Badge className="bg-green-500">Concluído</Badge>
      case "recusado":
        return <Badge  variant="destructive">Recusado</Badge>
      case "pendente":
        return <Badge variant="outline">Pendente</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getGrauBadge = (grau: string) => {
    switch (grau.toLowerCase()) {
      case "urgente":
        return <Badge className="bg-red-500" variant="destructive">Urgente</Badge>
      case "médio":
        return <Badge className="bg-red-300" variant="secondary">Médio</Badge>
      case "baixo":
        return <Badge className="bg-red-100" variant="outline">Baixo</Badge>
      default:
        return <Badge variant="secondary">{grau}</Badge>
    }
  }

  const formatMateriaisPreview = (materiais: MaterialRequest["materiais"]) => {
    if (!materiais || materiais.length === 0) return "Sem materiais"
    
    return materiais.map(m => `${m.quantidade}x ${m.descricao}`).join(", ")
  }

  if (!user) {
    return null
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header title="Lista de Solicitações de Materiais" />

      <main className="flex-1 p-4 md:p-6">
        <Card>
          <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0">
            <CardTitle>Lista de Solicitações de Materiais</CardTitle>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button onClick={handleAddNew}>Adicionar Solicitação</Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filtros */}
            <div className="mb-6 space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Filter className="h-4 w-4" />
                Filtros
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Input
                  placeholder="Pesquisar por setor, descrição ou status..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="md:col-span-1"
                />
                <Select value={setorFilter} onValueChange={setSetorFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filtrar por Setor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os setores</SelectItem>
                    {setores.map((setor) => (
                      <SelectItem key={setor} value={setor}>
                        {setor}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filtrar por Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os status</SelectItem>
                    {statusOptions.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  variant="outline" 
                  onClick={clearFilters}
                  className="flex items-center gap-2"
                >
                  <X className="h-4 w-4" />
                  Limpar Filtros
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Setor</TableHead>
                    <TableHead>Materiais</TableHead>
                    <TableHead>Justificativa</TableHead>
                    <TableHead>Grau</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-4">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  ) : filteredRequests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-4">
                        Nenhuma solicitação encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRequests.map((request, index) => (
                      <TableRow key={request.id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{getStatusBadge(request.status)}</TableCell>
                        <TableCell>{request.setor}</TableCell>
                        <TableCell className="max-w-xs">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="truncate">
                                  {formatMateriaisPreview(request.materiais)}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-md">
                                <div className="space-y-1">
                                  {request.materiais?.map((material, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                      <span className="font-medium">{material.quantidade}x</span>
                                      <span>{material.descricao}</span>
                                    </div>
                                  ))}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{request.justificativa}</TableCell>
                        <TableCell>
                          <GrauBadge grau={request.grau} />
                        </TableCell>
                        <TableCell>
                          <ActionsMenu
                            viewPath="/lista-solicitacoes/visualizar"
                            onEdit={() => handleEdit(request.id)}
                            onDelete={() => setItemToDelete(request.id)}
                            pageType="listaMateriais"
                            itemId={request.id}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Modal de Formulário */}
      <SolicitacaoFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        itemId={selectedItemId}
        onSuccess={handleSuccess}
      />

      {/* Diálogo de confirmação para exclusão */}
      <AlertDialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta solicitação? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => itemToDelete && handleDelete(itemToDelete)}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
