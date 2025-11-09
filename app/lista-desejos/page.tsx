"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/context/auth-context"
import { useToast } from "@/components/ui/use-toast"
import { fetchWishlistItems, deleteWishlistItem, markWishlistItemAsAvisado, fetchWishlistItemsPaginated, fetchWishlistItemsPaginatedWithFilters } from "@/lib/firebase/wishlist"
import type { WishlistItem } from "@/types"
import Header from "@/components/header"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Copy, ExternalLink, Filter, X } from "lucide-react"
import { ActionsMenu } from "@/components/actions-menu"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
} from "@/components/ui/pagination"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

// Função utilitária para converter URL do Google Drive
function getGoogleDriveEmbedUrl(url: string): string {
  const fileIdMatch = url.match(/id=([a-zA-Z0-9_-]+)/) || url.match(/d\/([a-zA-Z0-9_-]+)/);
  if (fileIdMatch && fileIdMatch[1]) {
    return `https://drive.google.com/uc?id=${fileIdMatch[1]}`;
  }
  return url;
}

export default function ListaDesejosPage() {
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [lojaDestinoFilter, setLojaDestinoFilter] = useState("todas")
  const [avisadoFilter, setAvisadoFilter] = useState("todos")
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(20)
  const [lastDoc, setLastDoc] = useState<any>(null)
  const [pageDocs, setPageDocs] = useState<any[]>([])
  const [totalItems, setTotalItems] = useState<number | null>(null)
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const [inputSearchTerm, setInputSearchTerm] = useState("")
  const [alertOpen, setAlertOpen] = useState(false)



  // Carregar página de itens da lista de desejos
  useEffect(() => {
    if (!user) return
    setIsLoading(true)
    const loadPage = async () => {
      try {
        let startAfterDoc = null
        if (currentPage > 1 && pageDocs[currentPage - 2]) {
          startAfterDoc = pageDocs[currentPage - 2]
        }
        const result = await fetchWishlistItemsPaginatedWithFilters({
          searchTerm,
          lojaDestino: lojaDestinoFilter,
          avisado: avisadoFilter,
          limitValue: pageSize,
          startAfterDoc
        })
        setWishlistItems(result.items)
        setTotalItems(result.totalCount)
        // Salva o doc para navegação
        const newPageDocs = [...pageDocs]
        newPageDocs[currentPage - 1] = result.lastDoc
        setPageDocs(newPageDocs)
        setLastDoc(result.lastDoc)
      } catch (error) {
        console.error("Erro ao carregar página:", error);
        
        // Verificar se é erro de índice faltando
        if (error instanceof Error && error.message.includes('indexes')) {
          console.log("🔥 CRIE OS ÍNDICES DO FIREBASE AQUI: https://console.firebase.google.com");
          console.log("📋 Instruções completas em: firebase-indexes.md");
        }
        
        toast({
          title: "Erro",
          description: "Não foi possível carregar a lista de desejos",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }
    loadPage()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, currentPage, searchTerm, lojaDestinoFilter, avisadoFilter])

  // Sempre que filtros mudarem, resetar paginação
  useEffect(() => {
    setCurrentPage(1)
    setPageDocs([])
  }, [searchTerm, lojaDestinoFilter, avisadoFilter])

  const handleDelete = async (id: string) => {
    if (!window.confirm("Tem certeza que deseja remover este item da lista de desejos?")) {
      return
    }

    try {
      await deleteWishlistItem(id)
      setWishlistItems(wishlistItems.filter((item) => item.id !== id))
      toast({
        title: "Sucesso",
        description: "Item removido com sucesso",
      })
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível remover o item",
        variant: "destructive",
      })
    }
  }

  const handleCopyFormUrl = () => {
    const formUrl = `${window.location.origin}/lista-desejos/formulario`
    navigator.clipboard.writeText(formUrl)
    toast({
      title: "URL copiada",
      description: "O link do formulário foi copiado para a área de transferência",
    })
  }

  const handleMarkAvisado = async (id: string) => {
    if (!window.confirm("Tem certeza que deseja marcar este item como avisado?")) {
      return
    }

    try {
      await markWishlistItemAsAvisado(id)
      setWishlistItems((items) =>
        items.map((item) =>
          item.id === id ? { ...item, avisado: true } : item
        )
      )
      toast({
        title: "Sucesso",
        description: "Item marcado como avisado!",
      })
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível marcar como avisado",
        variant: "destructive",
      })
    }
  }

  const clearFilters = () => {
    setInputSearchTerm("")
    setSearchTerm("")
    setLojaDestinoFilter("todas")
    setAvisadoFilter("todos")
  }

  // Obter lista única de lojas destino para o filtro
  const lojasDestino = [...new Set(wishlistItems.map(item => item.lojaDestino))].sort()

  // Calcular total de páginas
  const totalPages = totalItems ? Math.ceil(totalItems / pageSize) : 1
  
  // Calcular informações da paginação
  const startItem = totalItems ? (currentPage - 1) * pageSize + 1 : 0
  const endItem = totalItems ? Math.min(currentPage * pageSize, totalItems) : 0

  if (!user) {
    return null
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header title="Lista de Desejos" />

      <main className="flex-1 p-4 md:p-6">
        <Card>
          <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0">
            <CardTitle>Lista de Desejos</CardTitle>
            <div className="flex flex-col sm:flex-row gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2">
                    <ExternalLink className="h-4 w-4" />
                    Formulário para Cliente
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => window.open("/lista-desejos/formulario", "_blank")}>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Abrir Formulário
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleCopyFormUrl}>
                    <Copy className="mr-2 h-4 w-4" />
                    Copiar URL
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
                <div className="flex gap-2 md:col-span-1">
                  <Input
                    placeholder="Pesquisar por nome ou produto..."
                    value={inputSearchTerm}
                    onChange={(e) => setInputSearchTerm(e.target.value)}
                  />
                  <Button onClick={() => {
                    if (inputSearchTerm.length < 3) {
                      setAlertOpen(true)
                    } else {
                      setSearchTerm(inputSearchTerm)
                    }
                  }}>Buscar</Button>
                </div>
                <Select value={lojaDestinoFilter} onValueChange={setLojaDestinoFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filtrar por Loja Destino" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas as lojas</SelectItem>
                    {lojasDestino.filter(loja => loja && loja.trim() !== "").map((loja) => (
                      <SelectItem key={loja} value={loja}>
                        {loja}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={avisadoFilter} onValueChange={setAvisadoFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filtrar por Avisado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="sim">Avisado</SelectItem>
                    <SelectItem value="nao">Não avisado</SelectItem>
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
                    <TableHead>Avisado</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Celular</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Loja Destino</TableHead>
                    <TableHead>Data Criação</TableHead>
                    <TableHead>Imagem</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-4">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  ) : wishlistItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-4">
                        Nenhum item encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    wishlistItems.map((item: WishlistItem, index: number) => (
                      <TableRow key={item.id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>
                          {item.avisado ? (
                            <span className="inline-block rounded px-2 py-1 text-xs font-semibold bg-green-100 text-green-700">Sim</span>
                          ) : (
                            <span className="inline-block rounded px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-600">Não</span>
                          )}
                        </TableCell>
                        <TableCell>{item.nome}</TableCell>
                        <TableCell>{item.celular}</TableCell>
                        <TableCell>{item.produto}</TableCell>
                        <TableCell>{item.lojaDestino}</TableCell>
                        <TableCell>
                          {item.createdAt ? (
                            new Date(item.createdAt).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric'
                            })
                          ) : (
                            'Data não disponível'
                          )}
                        </TableCell>
                        <TableCell>
                          {item.imagemUrl ? (
                            <div className="relative h-16 w-16">
                              <Image
                                src={`/api/image-proxy?url=${encodeURIComponent(getGoogleDriveEmbedUrl(item.imagemUrl))}`}
                                alt={item.produto}
                                fill
                                className="object-cover rounded-md"
                              />
                            </div>
                          ) : (
                            "Sem imagem"
                          )}
                        </TableCell>
                        <TableCell>{item.descricao}</TableCell>
                        <TableCell>
                          <ActionsMenu
                            viewPath="/lista-desejos/visualizar"
                            editPath="/lista-desejos/editar"
                            itemId={item.id}
                            onDelete={() => handleDelete(item.id)}
                            pageType="listaDesejos"
                            avisado={item.avisado}
                            onMarkAvisado={() => handleMarkAvisado(item.id)}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            {/* Paginação */}
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-gray-600">
                {totalItems ? `Mostrando ${startItem} a ${endItem} de ${totalItems} itens` : 'Carregando...'}
              </div>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={e => {
                        e.preventDefault()
                        if (currentPage > 1) setCurrentPage(currentPage - 1)
                      }}
                      aria-disabled={currentPage === 1}
                    />
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationLink href="#" isActive>
                      {currentPage} de {totalPages}
                    </PaginationLink>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={e => {
                        e.preventDefault()
                        if (currentPage < totalPages) setCurrentPage(currentPage + 1)
                      }}
                      aria-disabled={currentPage === totalPages}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </CardContent>
        </Card>
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
      </main>
    </div>
  )
}