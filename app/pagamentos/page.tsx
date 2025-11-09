"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Header from "@/components/header"
import { fetchPagamentos, deletePagamento, Pagamento, fetchPagamentosWithFilters, fetchCriadoresPagamentos } from "@/lib/firebase/pagamentos"
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
import { MoreHorizontal, Eye, Pencil, Trash2, CalendarIcon, X } from "lucide-react"
import PagamentoFormModal from "@/components/pagamento-form-modal"
import { QueryDocumentSnapshot } from "firebase/firestore"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale/pt-BR"
import { Label } from "@/components/ui/label"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"

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
  const [alertOpen, setAlertOpen] = useState(false)
  
  // Filtros
  const [criadoPor, setCriadoPor] = useState<string>("todos")
  const [dataInicio, setDataInicio] = useState<Date | undefined>(undefined)
  const [dataFim, setDataFim] = useState<Date | undefined>(undefined)
  const [dataInicioInput, setDataInicioInput] = useState<string>("")
  const [dataFimInput, setDataFimInput] = useState<string>("")
  const [criadores, setCriadores] = useState<string[]>([])
  const [isLoadingCriadores, setIsLoadingCriadores] = useState(false)
  const [indexErrorLink, setIndexErrorLink] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      router.push("/login")
      return
    }
    loadCriadores()
    loadPagamentos()
  }, [user, router])

  // Carregar lista de criadores
  const loadCriadores = async () => {
    setIsLoadingCriadores(true)
    try {
      const lista = await fetchCriadoresPagamentos()
      setCriadores(lista)
    } catch (error) {
      console.error("Erro ao carregar criadores:", error)
    } finally {
      setIsLoadingCriadores(false)
    }
  }

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
      setAlertOpen(true)
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

  // Aplicar filtros
  const handleApplyFilters = async () => {
    setPageStack([])
    await loadPagamentos()
  }

  // Limpar todos os filtros
  const handleClearFilters = async () => {
    setCriadoPor("todos")
    setDataInicio(undefined)
    setDataFim(undefined)
    setDataInicioInput("")
    setDataFimInput("")
    setSearchInput("")
    setSearchTerm("")
    setPageStack([])
    setIndexErrorLink(null)
    await loadPagamentos()
  }

  // Converter data do calendário para formato string
  const handleDataInicioSelect = (date: Date | undefined) => {
    setDataInicio(date)
    if (date) {
      setDataInicioInput(format(date, "yyyy-MM-dd"))
    } else {
      setDataInicioInput("")
    }
  }

  const handleDataFimSelect = (date: Date | undefined) => {
    setDataFim(date)
    if (date) {
      setDataFimInput(format(date, "yyyy-MM-dd"))
    } else {
      setDataFimInput("")
    }
  }

  async function loadPagamentos(startAfterDoc?: QueryDocumentSnapshot, goingBack = false) {
    setIsLoading(true)
    setError(null)
    try {
      let result;
      
      // Converter datas do input para formato string se necessário
      let dataInicioStr = ""
      let dataFimStr = ""
      
      if (dataInicio) {
        dataInicioStr = format(dataInicio, "yyyy-MM-dd")
      } else if (dataInicioInput.trim() !== "") {
        dataInicioStr = dataInicioInput.trim()
      }
      
      if (dataFim) {
        dataFimStr = format(dataFim, "yyyy-MM-dd")
      } else if (dataFimInput.trim() !== "") {
        dataFimStr = dataFimInput.trim()
      }
      
      // Verificar se há filtros ativos (Firestore ou busca)
      const hasFirestoreFilters = criadoPor !== "todos" || dataInicioStr !== "" || dataFimStr !== ""
      const hasSearchTerm = searchTerm.trim() !== ""
      const hasAnyFilter = hasFirestoreFilters || hasSearchTerm
      
      if (hasAnyFilter) {
        result = await fetchPagamentosWithFilters({
          searchTerm,
          criadoPor: criadoPor !== "todos" ? criadoPor : "",
          dataInicio: dataInicioStr,
          dataFim: dataFimStr,
          limitValue: 10,
          startAfterDoc
        });
      } else {
        // Usar paginação normal quando não há filtros
        result = await fetchPagamentos(10, startAfterDoc);
      }
      
      setPagamentos(result.pagamentos)
      setLastDoc(result.lastDoc)
      setIsLastPage(result.pagamentos.length < 10)
      
      // Limpar erro de índice se a query funcionou
      if (indexErrorLink) {
        setIndexErrorLink(null)
      }
      
      if (!goingBack && startAfterDoc) {
        setPageStack((prev) => [...prev, startAfterDoc])
      } else if (goingBack) {
        setPageStack((prev) => prev.slice(0, -1))
      }
    } catch (err: any) {
      // Verificar se é erro de índice faltando
      if (err?.isIndexError && err?.indexLink) {
        setIndexErrorLink(err.indexLink)
        setError("Índice do Firestore necessário. Clique no link abaixo para criar.")
        toast.error("Índice do Firestore necessário", {
          description: "Clique no link na mensagem de erro para criar o índice",
          duration: 10000,
        })
      } else {
      setError("Erro ao carregar pagamentos.")
      toast.error("Erro ao carregar pagamentos")
        setIndexErrorLink(null)
      }
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

  // Os pagamentos já vêm ordenados do Firestore
  const orderedPagamentos = pagamentos

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
          <CardHeader className="flex flex-col space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0">
              <CardTitle>Lista de Solicitações de Pagamentos</CardTitle>
              {canAdd && (
                <Button onClick={() => router.push("/pagamentos/novo")}>Adicionar Pagamento</Button>
              )}
            </div>

            {/* Busca por termo */}
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
                disabled={isSearching}
              >
                {isSearching ? "Buscando..." : "Buscar"}
              </Button>
              {searchTerm && (
                <Button 
                  onClick={handleClearSearch} 
                  variant="outline"
                  size="sm"
                >
                  Limpar Busca
                </Button>
              )}
            </div>

            {/* Filtros */}
            <Accordion type="single" collapsible>
              <AccordionItem value="filters">
                <AccordionTrigger>Filtros</AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    {/* Filtro por Criado Por */}
                    <div className="space-y-2">
                      <Label htmlFor="criadoPor">Criado Por</Label>
                      <Select value={criadoPor} onValueChange={setCriadoPor}>
                        <SelectTrigger id="criadoPor">
                          <SelectValue placeholder="Selecione o usuário" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todos</SelectItem>
                          {isLoadingCriadores ? (
                            <SelectItem value="loading" disabled>Carregando...</SelectItem>
                          ) : (
                            criadores.map((criador) => (
                              <SelectItem key={criador} value={criador}>
                                {criador}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Filtro Data Início */}
                    <div className="space-y-2">
                      <Label htmlFor="dataInicio">Data Início</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal h-10"
                            title={dataInicio ? format(dataInicio, "dd/MM/yyyy", { locale: ptBR }) : "Selecione a data de início"}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                            {dataInicio ? (
                              <>
                                <span className="flex-1 text-left">
                                  {format(dataInicio, "dd/MM/yyyy", { locale: ptBR })}
                                </span>
                                <X 
                                  className="h-4 w-4 ml-2 shrink-0 opacity-50 hover:opacity-100" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDataInicio(undefined);
                                    setDataInicioInput("");
                                  }}
                                />
                              </>
                            ) : (
                              <span className="text-muted-foreground">Selecione</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={dataInicio}
                            onSelect={handleDataInicioSelect}
                            locale={ptBR}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Filtro Data Fim */}
                    <div className="space-y-2">
                      <Label htmlFor="dataFim">Data Fim</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal h-10"
                            title={dataFim ? format(dataFim, "dd/MM/yyyy", { locale: ptBR }) : "Selecione a data de fim"}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                            {dataFim ? (
                              <>
                                <span className="flex-1 text-left">
                                  {format(dataFim, "dd/MM/yyyy", { locale: ptBR })}
                                </span>
                                <X 
                                  className="h-4 w-4 ml-2 shrink-0 opacity-50 hover:opacity-100" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDataFim(undefined);
                                    setDataFimInput("");
                                  }}
                                />
                              </>
                            ) : (
                              <span className="text-muted-foreground">Selecione</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={dataFim}
                            onSelect={handleDataFimSelect}
                            locale={ptBR}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Botões de ação dos filtros */}
                    <div className="space-y-2 md:col-span-2 lg:col-span-1">
                      <Label>&nbsp;</Label>
                      <div className="flex gap-2">
                        <Button onClick={handleApplyFilters} className="flex-1">
                          Aplicar
                        </Button>
                        <Button onClick={handleClearFilters} variant="outline" className="flex-1">
                          Limpar
                        </Button>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardHeader>
          <CardContent>
            {/* Mensagem de erro com link do índice */}
            {indexErrorLink && (
              <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    Índice do Firestore necessário
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    Para usar os filtros, é necessário criar um índice no Firebase. Clique no link abaixo para criar automaticamente:
                  </p>
                  <a 
                    href={indexErrorLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline break-all"
                  >
                    {indexErrorLink}
                  </a>
                  <Button 
                    onClick={() => {
                      window.open(indexErrorLink, '_blank')
                    }}
                    className="w-fit mt-2"
                    variant="outline"
                  >
                    Abrir no Firebase Console
                  </Button>
                </div>
              </div>
            )}
            
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Criado por</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Finalidade</TableHead>
                    <TableHead>Situação</TableHead>
                    <TableHead>Data de Vencimento</TableHead>
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
                  ) : pagamentos.length === 0 ? (
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

      <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Erro</AlertDialogTitle>
            <AlertDialogDescription>
              Digite pelo menos 3 caracteres para pesquisar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setAlertOpen(false)}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}