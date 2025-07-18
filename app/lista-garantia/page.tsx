"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/context/auth-context"
import { useToast } from "@/components/ui/use-toast"
import { fetchWarrantyItems, deleteWarrantyItem, finalizeWarrantyItem, fetchWarrantyItem, fetchWarrantyItemsPaginated, fetchWarrantyItemsPaginatedByName, fetchWarrantyItemsPaginatedWithFilters } from "@/lib/firebase/warranty"
import type { WarrantyItem } from "@/types"
import Header from "@/components/header"
import GarantiaFormModal from "@/components/garantia-form-modal"
import { StatusBadge } from "@/components/status-badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Eye, Pencil, Trash2, Filter, X } from "lucide-react"
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
import { ActionsMenu } from "@/components/actions-menu"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
} from "@/components/ui/pagination"

export default function ListaGarantiaPage() {
  const [warrantyItems, setWarrantyItems] = useState<WarrantyItem[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [lojaFilter, setLojaFilter] = useState("todas")
  const [finalizadaFilter, setFinalizadaFilter] = useState("todas")
  const [statusFilter, setStatusFilter] = useState("todos")
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>(undefined)
  const [itemToDelete, setItemToDelete] = useState<string | null>(null)
  const [itemToFinalize, setItemToFinalize] = useState<string | null>(null)
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(20)
  const [lastDoc, setLastDoc] = useState<any>(null)
  const [pageDocs, setPageDocs] = useState<any[]>([])
  const [totalItems, setTotalItems] = useState<number | null>(null)

  const loadWarrantyItems = async () => {
    setIsLoading(true)
    try {
      const items = await fetchWarrantyItems()
      setWarrantyItems(items)
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível carregar a lista de garantias",
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

    loadWarrantyItems()
  }, [user, router, toast])

  // Carregar total de itens (apenas para saber o total de páginas)
  useEffect(() => {
    if (!user) return
    const fetchTotal = async () => {
      try {
        const all = await fetchWarrantyItems()
        setTotalItems(all.length)
      } catch {}
    }
    fetchTotal()
  }, [user])

  // Carregar página de garantias
  useEffect(() => {
    if (!user) return
    setIsLoading(true)
    const loadPage = async () => {
      try {
        let startAfterDoc = null
        if (currentPage > 1 && pageDocs[currentPage - 2]) {
          startAfterDoc = pageDocs[currentPage - 2]
        }
        const result = await fetchWarrantyItemsPaginatedWithFilters({
          searchTerm,
          loja: lojaFilter,
          status: statusFilter,
          finalizada: finalizadaFilter,
          limitValue: pageSize,
          startAfterDoc
        })
        setWarrantyItems(result.items)
        // Salva o doc para navegação
        const newPageDocs = [...pageDocs]
        newPageDocs[currentPage - 1] = result.lastDoc
        setPageDocs(newPageDocs)
        setLastDoc(result.lastDoc)
      } catch (error) {
        toast({
          title: "Erro",
          description: "Não foi possível carregar a lista de garantias",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }
    loadPage()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, currentPage, searchTerm, lojaFilter, statusFilter, finalizadaFilter])

  // Sempre que filtros mudarem, resetar paginação
  useEffect(() => {
    setCurrentPage(1)
    setPageDocs([])
  }, [searchTerm, lojaFilter, finalizadaFilter, statusFilter])

  const handleDelete = async (id: string) => {
    setItemToDelete(null)
    try {
      await deleteWarrantyItem(id)
      setWarrantyItems(warrantyItems.filter((item) => item.id !== id))
      toast({
        title: "Sucesso",
        description: "Garantia removida com sucesso",
      })
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível remover a garantia",
        variant: "destructive",
      })
    }
  }

  const handleFinalize = async (id: string) => {
    setItemToFinalize(id)
  }

  const confirmFinalize = async () => {
    if (!itemToFinalize) return
    try {
      await finalizeWarrantyItem(itemToFinalize)
      setWarrantyItems(warrantyItems.map((item) => 
        item.id === itemToFinalize ? { ...item, finalized: true } : item
      ))
      // Buscar dados completos da garantia
      const item = await fetchWarrantyItem(itemToFinalize)
      if (item && item.email) {
        try {
          await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: item.email,
              nome: item.nome,
              status: 'Finalizada',
              loja: item.loja,
              garantiaId: item.id,
              dataCompra: item.dataCompra,
              dataValidade: item.dataValidade,
              descricaoPecas: item.descricaoPecas,
              observacao: item.observacao,
              notaCompra: item.notaCompra,
              imagemPecas: item.imagemPecas,
              vendedor: item.vendedor,
              finalizado: true,
              mensagemExtra: 'Sua solicitação de garantia foi encerrada. Caso tenha dúvidas, entre em contato com a loja.'
            })
          })
        } catch (e) {
          // Não interrompe o fluxo, apenas loga
          console.error('Erro ao enviar email de finalização', e)
        }
      }
      toast({
        title: "Sucesso",
        description: "Garantia finalizada com sucesso",
      })
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível finalizar a garantia",
        variant: "destructive",
      })
    } finally {
      setItemToFinalize(null)
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
    loadWarrantyItems()
  }

  const handlePrintWarranty = async (item: WarrantyItem) => {
    const jsPDF = (await import("jspdf")).jsPDF;
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [72.1, 210],
    });

    // Adiciona a logo
    const logoUrl = "/logovermelha.png";
    let logoImg: string | undefined = undefined;
    try {
      const response = await fetch(logoUrl);
      const blob = await response.blob();
      logoImg = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      doc.addImage(logoImg, "PNG", 5, 5, 20, 20);
    } catch (e) {
      // Se não conseguir carregar a logo, segue sem ela
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text("CUPOM DE GARANTIA", 28, 8);
    doc.setFontSize(8);
    doc.text("MARCIA DE LOURDES", 28, 14);
    doc.text("NASCIMENTO CASTRO BARROS", 28, 18);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    let y = 30;
    doc.text(`Data da Compra: ${item.dataCompra || "-"}`, 5, y);
    y += 6;
    doc.text(`Entrada da Solicitação: ${item.dataValidade || "-"}`, 5, y);
    y += 6;
    doc.text(`Nome: ${item.nome || "-"}`, 5, y);
    y += 6;
    doc.text(`Vendedor Responsável: ${item.vendedor || "-"}`, 5, y);
    y += 6;
    doc.text(`Email: ${item.email || "-"}`, 5, y);
    y += 6;
    doc.text(`WhatsApp: ${item.whatsapp || "-"}`, 5, y);
    y += 6;
    doc.text(`Loja: ${item.loja || "-"}`, 5, y);
    y += 6;
    doc.text(`Descrição das Peças: ${item.descricaoPecas || "-"}`, 5, y, { maxWidth: 62 });

    // Linhas para assinatura
    y += 35;
    doc.setFont('helvetica', 'bold');
    doc.text("Assinatura do Cliente (Entrega)", 5, y - 7);    
    doc.line(5, y, 67, y); // linha 1

    y += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('DATA:', 5, y);
    doc.setFont('helvetica', 'normal');
    doc.text('___/___/_____', 20, y);


    y += 15;
    doc.line(5, y, 67, y); // linha 2
    doc.setFont('helvetica', 'bold');
    doc.text("Assinatura do Cliente (Recebimento)", 5, y - 7);

    y += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('DATA:', 5, y);
    doc.setFont('helvetica', 'normal');
    doc.text('___/___/_____', 20, y);

    // Texto de orientação ao final do PDF
    y += 10;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(
      'Depois que você preencher esta solicitação de pedido, se inicia o prazo de 30 dias úteis para a entrega que será feita exclusivamente na loja Márcia Castro Semijoias pelo titular da compra devidamente identificado. Caso opte por enviar um terceiro para receber a peça, o mesmo deverá apresentar documento de identificação, sendo total responsabilidade do titular qualquer tipo de dano ou desvio causado pelo terceiro.',
      5,
      y,
      { maxWidth: 62 }
    );

    doc.save(`garantia-${item.id}.pdf`);
  };

  const statusOptions = [
    "Recebido loja",
    "Recebido comercial",
    "Recebido fábrica",
    "Devolvido comercial",
    "Devolvido loja",
    "Devolvido cliente",
    "Extraviada-crédito cliente",
    "Negado"
  ]

  const clearFilters = () => {
    setSearchTerm("")
    setLojaFilter("todas")
    setFinalizadaFilter("todas")
    setStatusFilter("todos")
  }

  // Remover filtro frontend, warrantyItems já está filtrado
  // const filteredItems = warrantyItems.filter(...)
  const filteredItems = warrantyItems

  // Obter lista única de lojas para o filtro
  const lojas = [...new Set(warrantyItems.map(item => item.loja))].sort()

  // Paginação
  const totalPages = totalItems ? Math.ceil(totalItems / pageSize) : 1

  if (!user) {
    return null
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header title="Lista de Garantia" />

      <main className="flex-1 p-4 md:p-6">
        <Card>
          <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0">
            <CardTitle>Lista de Garantia</CardTitle>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button onClick={handleAddNew}>Adicionar Garantia</Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filtros */}
            <div className="mb-6 space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Filter className="h-4 w-4" />
                Filtros
              </div>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <Input
                  placeholder="Pesquisar por nome ou status..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="md:col-span-1"
                />
                <Select value={lojaFilter} onValueChange={setLojaFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filtrar por Loja" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas as lojas</SelectItem>
                    {lojas.filter(loja => loja.trim() !== "").map((loja) => (
                      <SelectItem key={loja} value={loja}>
                        {loja}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={finalizadaFilter} onValueChange={setFinalizadaFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filtrar por Finalizada" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas</SelectItem>
                    <SelectItem value="sim">Finalizada</SelectItem>
                    <SelectItem value="nao">Pendente</SelectItem>
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
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="py-3 px-4 text-left">ID</th>
                    <th className="py-3 px-4 text-left">Finalizada</th>
                    <th className="py-3 px-4 text-left">Nome</th>
                    <th className="py-3 px-4 text-left">Celular</th>
                    <th className="py-3 px-4 text-left">Entrada da Solicitação</th>
                    <th className="py-3 px-4 text-left">Status</th>
                    <th className="py-3 px-4 text-left">Loja</th>
                    <th className="py-3 px-4 text-left">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} className="text-center py-4">
                        Carregando...
                      </td>
                    </tr>
                  ) : filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-4">
                        Nenhuma garantia encontrada
                      </td>
                    </tr>
                  ) : (
                    filteredItems.slice(0, pageSize).map((item, idx) => (
                      <tr key={item.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="py-3 px-4">{(currentPage - 1) * pageSize + idx + 1}</td>
                        <td className="py-3 px-4">
                          {item.finalized ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Finalizada
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              Pendente
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">{item.nome.toUpperCase()}</td>
                        <td className="py-3 px-4">{item.whatsapp || "-"}</td>
                        <td className="py-3 px-4">{item.dataValidade}</td>
                        <td className="py-3 px-4">
                          <StatusBadge status={item.status} />
                        </td>
                        <td className="py-3 px-4">{item.loja}</td>
                        <td className="py-3 px-4">
                          <ActionsMenu
                            viewPath="/lista-garantia/visualizar"
                            onEdit={() => handleEdit(item.id)}
                            onDelete={() => setItemToDelete(item.id)}
                            onFinalize={() => handleFinalize(item.id)}
                            pageType="listaGarantia"
                            itemId={item.id}
                            isFinalized={item.finalized}
                            onPrint={() => handlePrintWarranty(item)}
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {/* Paginação */}
            <div className="mt-6 flex justify-center">
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
                      {currentPage}
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
      </main>

      {/* Modal de Formulário */}
      <GarantiaFormModal
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
              Tem certeza que deseja excluir esta garantia? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => itemToDelete && handleDelete(itemToDelete)}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Diálogo de confirmação para finalização */}
      <AlertDialog open={!!itemToFinalize} onOpenChange={() => setItemToFinalize(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar finalização</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja finalizar esta garantia? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmFinalize}>Finalizar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
