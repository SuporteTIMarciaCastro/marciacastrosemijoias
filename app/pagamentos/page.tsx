"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Header from "@/components/header"
import { fetchPagamentos, deletePagamento, Pagamento, fetchPagamentosWithFilters } from "@/lib/firebase/pagamentos"
import { toast } from "sonner"
import { useAuth } from "@/context/auth-context"
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
import { MoreHorizontal, Eye, Pencil, Trash2, ChevronDown, ChevronUp } from "lucide-react"
import PagamentoFormModal from "@/components/pagamento-form-modal"
import { QueryDocumentSnapshot } from "firebase/firestore"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"

export default function ListaPagamentosPage() {
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [pagamentoToDelete, setPagamentoToDelete] = useState<Pagamento | null>(null)
  const [pagamentoToEdit, setPagamentoToEdit] = useState<string | null>(null)
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null)
  const [pageStack, setPageStack] = useState<QueryDocumentSnapshot[]>([])
  const [isLastPage, setIsLastPage] = useState(false)
  const router = useRouter()
  const { user } = useAuth()
  const [order, setOrder] = useState<'desc' | 'asc'>("desc")

  useEffect(() => {
    if (!user) {
      router.push("/login")
      return
    }
    loadPagamentos()
  }, [user, router])

  // Função para executar busca
  const handleSearch = async () => {
    const trimmed = searchInput.trim()

    if (trimmed.length === 0) {
      setSearchInput("")
      setSearchTerm("")
      setPageStack([])
      await loadPagamentos()
      return
    }

    if (trimmed.length < 3) {
      toast.error("Digite pelo menos 3 letras antes de pesquisar.")
      return
    }

    setSearchTerm(trimmed)
    setPageStack([])
    setIsSearching(true)
    try {
      await loadPagamentos()
    } finally {
      setIsSearching(false)
    }
  }

  // Limpar busca
  const handleClearSearch = async () => {
    setSearchInput("")
    setSearchTerm("")
    setPageStack([])
    await loadPagamentos()
  }

  async function loadPagamentos(startAfterDoc?: QueryDocumentSnapshot, goingBack = false) {
    setIsLoading(true)
    setError(null)
    try {
      let result;
      if (searchTerm.trim()) {
        // Usar busca global quando há termo de busca
        result = await fetchPagamentosWithFilters({
          searchTerm,
          limitValue: 10,
          startAfterDoc
        });
      } else {
        // Usar paginação normal quando não há busca
        result = await fetchPagamentos(10, startAfterDoc);
      }
      
      setPagamentos(result.pagamentos)
      setLastDoc(result.lastDoc)
      setIsLastPage(result.pagamentos.length < 10)
      
      if (!goingBack && startAfterDoc) {
        setPageStack((prev) => [...prev, startAfterDoc])
      } else if (goingBack) {
        setPageStack((prev) => prev.slice(0, -1))
      }
    } catch (err) {
      setError("Erro ao carregar pagamentos.")
      toast.error("Erro ao carregar pagamentos")
    } finally {
      setIsLoading(false)
    }
  }

  async function handleNextPage() {
    if (lastDoc) {
      await loadPagamentos(lastDoc)
    }
  }

  async function handlePrevPage() {
    if (pageStack.length > 1) {
      // Remove o cursor atual e pega o anterior
      const prevStack = [...pageStack]
      prevStack.pop()
      const prevCursor = prevStack.length > 0 ? prevStack[prevStack.length - 1] : undefined
      await loadPagamentos(prevCursor, true)
    } else {
      // Primeira página
      await loadPagamentos(undefined, true)
    }
  }

  async function handleDelete(pagamento: Pagamento) {
    try {
      await deletePagamento(pagamento.id!)
      toast.success("Pagamento removido com sucesso!")
      loadPagamentos()
    } catch (error) {
      toast.error("Erro ao remover pagamento")
    } finally {
      setPagamentoToDelete(null)
    }
  }

  const filteredPagamentos = searchTerm.trim() ? pagamentos : pagamentos.filter((p) =>
    (p.finalidade?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.justificativa?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.tipo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.situacao?.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  // Ordenação dos pagamentos filtrados
  const orderedPagamentos = [...filteredPagamentos].sort((a, b) => {
    if (!a.createdAt || !b.createdAt) return 0
    if (order === "asc") {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    } else {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    }
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "autorizado":
        return <Badge className="bg-green-500">Autorizado</Badge>
      case "rejeitado":
        return <Badge variant="destructive">Rejeitado</Badge>
      case "pendente":
      default:
        return <Badge variant="outline">Pendente</Badge>
    }
  }

  const handleView = (id: string) => {
    router.push(`/pagamentos/visualizar/${id}`)
  }

  if (!user) {
    return null
  }

  const canAdd = user.permissions?.pagamentos?.adicionar
  const canEdit = user.permissions?.pagamentos?.editar_basico || user.permissions?.pagamentos?.editar
  const canDelete = user.permissions?.pagamentos?.remover
  const canView = user.permissions?.pagamentos?.visualizar

  return (
    <div className="flex min-h-screen flex-col">
      <Header title="Solicitações de Pagamentos" />
      <main className="flex-1 p-4 md:p-6">
        <Card>
          <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0">
            <CardTitle>Lista de Solicitações de Pagamentos</CardTitle>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Pesquisar pagamento (mín. 3 letras)..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      handleSearch()
                    }
                  }}
                  className="max-w-xs"
                  disabled={isSearching}
                />
                <Button 
                  onClick={handleSearch} 
                  variant="secondary"
                  disabled={isSearching || searchInput.trim().length < 3}
                >
                  {isSearching ? "Buscando..." : "Buscar"}
                </Button>
                {searchTerm && (
                  <Button 
                    onClick={handleClearSearch} 
                    variant="outline"
                    size="sm"
                  >
                    Limpar
                  </Button>
                )}
              </div>
              {canAdd && (
                <Button onClick={() => router.push("/pagamentos/novo")}>Adicionar Pagamento</Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Criado por</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Finalidade</TableHead>
                    <TableHead>Situação</TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => setOrder(order === 'asc' ? 'desc' : 'asc')}>Data de Vencimento
                      <span className="inline-block align-middle ml-1">
                        {order === 'asc' ? <ChevronUp className="w-4 h-4 inline" /> : <ChevronDown className="w-4 h-4 inline" />}
                      </span>
                    </TableHead>
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-4">Carregando...</TableCell>
                    </TableRow>
                  ) : error ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-4 text-red-500">{error}</TableCell>
                    </TableRow>
                  ) : filteredPagamentos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-4">Nenhum pagamento encontrado</TableCell>
                    </TableRow>
                  ) : (
                    orderedPagamentos.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>{p.criadoPor || '-'}</TableCell>
                        <TableCell>{p.tipo}</TableCell>
                        <TableCell className="max-w-xs truncate">{p.finalidade}</TableCell>
                        <TableCell>{getStatusBadge(p.situacao)}</TableCell>
                        <TableCell>
                          {p.tipo === "Agendado" && p.dataVencimento ? (
                            new Date(p.dataVencimento + 'T00:00:00').toLocaleDateString('pt-BR')
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
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
                              {canView && (
                                <DropdownMenuItem onClick={() => handleView(p.id!)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  Visualizar
                                </DropdownMenuItem>
                              )}
                              {canEdit && (
                                <DropdownMenuItem onClick={() => setPagamentoToEdit(p.id!)}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Editar
                                </DropdownMenuItem>
                              )}
                              {canDelete && (
                                <DropdownMenuItem 
                                  onClick={() => setPagamentoToDelete(p)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Remover
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              <div className="flex justify-between items-center mt-4 gap-2">
                <Button onClick={handlePrevPage} disabled={isLoading || pageStack.length === 0} variant="outline">
                  Página anterior
                </Button>
                <span className="text-sm font-medium">Página {pageStack.length + 1}</span>
                <Button onClick={handleNextPage} disabled={isLoading || isLastPage || !lastDoc} variant="outline">
                  Próxima página
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      <AlertDialog open={!!pagamentoToDelete} onOpenChange={() => setPagamentoToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este pagamento? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => pagamentoToDelete && handleDelete(pagamentoToDelete)}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PagamentoFormModal
        isOpen={!!pagamentoToEdit}
        onClose={() => setPagamentoToEdit(null)}
        pagamentoId={pagamentoToEdit}
        onSuccess={loadPagamentos}
      />
    </div>
  )
} 