"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
import { MoreHorizontal, Eye, Pencil, Trash2 } from "lucide-react"

export default function ListaSolicitacoesPage() {
  const [materialRequests, setMaterialRequests] = useState<MaterialRequest[]>([])
  const [searchTerm, setSearchTerm] = useState("")
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

  const filteredRequests = materialRequests.filter(
    (request) =>
      request.setor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.status.toLowerCase().includes(searchTerm.toLowerCase()),
  )

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
              <Input
                placeholder="Pesquisar solicitação..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-xs"
              />
              <Button onClick={handleAddNew}>Adicionar Solicitação</Button>
            </div>
          </CardHeader>
          <CardContent>
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
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Abrir menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleView(request.id)}>
                                <Eye className="mr-2 h-4 w-4" />
                                Visualizar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEdit(request.id)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => setItemToDelete(request.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Remover
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
