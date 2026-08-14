"use client"

import { useState, useEffect } from "react"
import { fetchAutenticado } from "@/lib/api-client"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/context/auth-context"
import { useToast } from "@/components/ui/use-toast"
import { fetchWarrantyItems, countWarrantyItems, deleteWarrantyItem, fetchWarrantyItem, fetchWarrantyItemsPaginated, fetchWarrantyItemsPaginatedByName, fetchWarrantyItemsPaginatedWithFilters } from "@/lib/firebase/warranty"
import type { WarrantyItem } from "@/types"
import Header from "@/components/header"
import GarantiaFormModal from "@/components/garantia-form-modal"
import { StatusBadge } from "@/components/status-badge"
import { getWarrantyStatusLabel } from "@/lib/warranty-status"
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
import { FinalizeWarrantyModal } from "@/components/finalize-warranty-modal"
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
  const [searchInput, setSearchInput] = useState("")
  const [lojaFilter, setLojaFilter] = useState("todas")
  const [finalizadaFilter, setFinalizadaFilter] = useState("todas")
  const [statusFilter, setStatusFilter] = useState("todos")
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>(undefined)
  const [itemToDelete, setItemToDelete] = useState<string | null>(null)
  const [finalizeModalOpen, setFinalizeModalOpen] = useState(false)
  const [selectedWarrantyItem, setSelectedWarrantyItem] = useState<WarrantyItem | null>(null)
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(20)
  const [lastDoc, setLastDoc] = useState<any>(null)
  const [pageDocs, setPageDocs] = useState<any[]>([])
  const [totalItems, setTotalItems] = useState<number | null>(null)
  const searchParams = useSearchParams()

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
    // A lista visível é montada pelo efeito paginado mais abaixo. Carregar a
    // coleção inteira aqui além de desnecessário criava uma corrida: os dois
    // carregamentos escreviam no mesmo estado e vencia o que respondesse por
    // último.
  }, [user, router, toast])

  // Abrir modal de edição via URL (?edit=<id>)
  useEffect(() => {
    if (!user) return

    const editId = searchParams?.get('edit')
    const finalizedId = searchParams?.get('finalized')

    // Prioriza edição se ambos estiverem presentes
    if (editId) {
      setSelectedItemId(editId)
      setIsModalOpen(true)
      return
    }

    if (finalizedId) {
      setSelectedItemId(finalizedId)
      // busca o item e abre o modal de finalização com os dados
      const openFinalize = async () => {
        try {
          const item = await fetchWarrantyItem(finalizedId)
          setSelectedWarrantyItem(item ?? null)
          setFinalizeModalOpen(true)
        } catch (e) {
          toast({
            title: "Erro",
            description: "Não foi possível abrir a finalização da garantia",
            variant: "destructive",
          })
        }
      }
      openFinalize()
    }

    // Apenas ao montar ou quando searchParams mudar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, searchParams])

  //   // Abrir modal de finalização via URL (?finalized=<id>)
  // useEffect(() => {
  //   if (!user) return
  //   const editId = searchParams?.get('finalized')
  //   if (editId) {
  //     setSelectedItemId(editId)
  //     setIsModalOpen(true)
  //   }
  //   // Apenas ao montar ou quando searchParams mudar
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [user, searchParams])

  // Total de itens, apenas para calcular o número de páginas.
  // Conta no servidor: devolve o número sem baixar os documentos.
  useEffect(() => {
    if (!user) return
    const fetchTotal = async () => {
      try {
        setTotalItems(await countWarrantyItems())
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
    const item = warrantyItems.find(w => w.id === id)
    if (item) {
      setSelectedWarrantyItem(item)
      setFinalizeModalOpen(true)
    }
  }

  const handleFinalizeSuccess = async () => {
    // Recarregar a lista de garantias
    await loadWarrantyItems()
    
    // Enviar email se necessário
    if (selectedWarrantyItem && selectedWarrantyItem.email) {
      try {
        await fetchAutenticado('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: selectedWarrantyItem.email,
            nome: selectedWarrantyItem.nome,
            status: 'Finalizada',
            loja: selectedWarrantyItem.loja,
            garantiaId: selectedWarrantyItem.id,
            dataCompra: selectedWarrantyItem.dataCompra,
            dataValidade: selectedWarrantyItem.dataValidade,
            descricaoPecas: selectedWarrantyItem.descricaoPecas,
            observacao: selectedWarrantyItem.observacao,
            notaCompra: selectedWarrantyItem.notaCompra,
            imagemPecas: selectedWarrantyItem.imagemPecas,
            vendedor: selectedWarrantyItem.vendedor,
            finalizado: true,
            mensagemExtra: 'Sua solicitação de garantia foi encerrada. Caso tenha dúvidas, entre em contato com a loja.'
          })
        })
      } catch (e) {
        // Não interrompe o fluxo, apenas loga
        console.error('Erro ao enviar email de finalização', e)
      }
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
    doc.text("CUPOM DE GARANTIA", 27, 8);
    doc.setFontSize(8);
    doc.text("MARCIA DE LOURDES", 27, 14);
    doc.text("NASCIMENTO CASTRO BARROS", 27, 18);
    
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

    // Gerar QR Code com URL para visualizar a garantia (público)
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      const targetUrl = `${origin}/lista-garantia/visualizar/${encodeURIComponent(item.id)}`
      const qrModule: any = await import('qrcode')
      const QRCode = qrModule?.default ?? qrModule
      if (!QRCode?.toDataURL) {
        throw new Error('Biblioteca qrcode não encontrada ou método toDataURL indisponível')
      }
      const qrDataUrl: string = await QRCode.toDataURL(targetUrl, { margin: 1 })

      // Inserir QR Code no PDF (posição fixa, inferior)
      // Página: 72.1mm x 210mm. Vamos posicionar o QR próximo ao rodapé.
      const qrX = 17
      const qrY = 165
      const qrSize = 35
      doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize)

      // Legenda do QR
      // doc.setFont('helvetica', 'bold')
      // doc.setFontSize(7)
      // doc.text('Editar Garantia', qrX + qrSize + 3, qrY + 6)
      // doc.setFont('helvetica', 'normal')
      // doc.setFontSize(6)
      // doc.text('Escaneie para abrir a edição', qrX + qrSize + 3, qrY + 11, { maxWidth: 30 })
      // doc.setFontSize(5)
      // doc.text(editUrl, qrX + qrSize + 3, qrY + 17, { maxWidth: 35 })
    } catch (e) {
      // Se não conseguir gerar o QR, apenas segue sem ele
      console.warn('Falha ao gerar QR Code para o PDF', e)
    }

    doc.save(`garantia-${item.id}.pdf`);
  };

  const handleSearch = () => {
    const trimmed = searchInput.trim()

    if (trimmed.length === 0) {
      setSearchInput("")
      setSearchTerm("")
      return
    }

    if (trimmed.length < 3) {
      toast({
        title: "Busca muito curta",
        description: "Digite pelo menos 3 caracteres antes de pesquisar.",
        variant: "destructive",
      })
      return
    }

    setSearchInput(trimmed)
    setSearchTerm(trimmed)
  }

  const formatWhatsapp = (value?: string | null) => {
    if (!value) return "-"
    const digits = value.replace(/\D/g, "")
    if (digits.length === 11) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
    }
    if (digits.length === 10) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
    }
    return value
  }

  // Valores gravados no Firestore (usados no filtro). O texto exibido vem de getWarrantyStatusLabel.
  const statusOptions = [
    "Recebido loja",
    "Recebido comercial",
    "Recebido fábrica",
    "Recebido no escritório",
    "Devolvido comercial",
    "Devolvido loja",
    "Devolvido cliente",
    "Extraviada-crédito cliente",
    "Negado"
  ]

  const clearFilters = () => {
    setSearchInput("")
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
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                <div className="md:col-span-2 flex flex-col gap-2 sm:flex-row">
                  <Input
                    placeholder="Pesquisar por Nº do pedido, nome ou WhatsApp"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        handleSearch()
                      }
                    }}
                    className="flex-1"
                  />
                  <Button onClick={handleSearch} variant="secondary" className="w-full sm:w-auto">
                    Pesquisar
                  </Button>
                </div>
                <div className="md:col-span-1">
                  <Select value={lojaFilter} onValueChange={setLojaFilter}>
                    <SelectTrigger className="w-full">
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
                </div>
                <div className="md:col-span-1">
                  <Select value={finalizadaFilter} onValueChange={setFinalizadaFilter}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Filtrar por Finalizada" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas</SelectItem>
                      <SelectItem value="sim">Finalizada</SelectItem>
                      <SelectItem value="nao">Pendente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-1">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Filtrar por Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os status</SelectItem>
                      {statusOptions.map((status) => (
                        <SelectItem key={status} value={status}>
                          {getWarrantyStatusLabel(status)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-1">
                  <Button 
                    variant="outline" 
                    onClick={clearFilters}
                    className="flex items-center gap-2 w-full"
                  >
                    <X className="h-4 w-4" />
                    Limpar Filtros
                  </Button>
                </div>
              </div>
            </div>

            {/* Lista Mobile (cards) */}
            <div className="md:hidden space-y-3">
              {isLoading ? (
                <div className="text-center py-4">Carregando...</div>
              ) : filteredItems.length === 0 ? (
                <div className="text-center py-4">Nenhuma garantia encontrada</div>
              ) : (
                filteredItems.slice(0, pageSize).map((item) => (
                  <div key={item.id} className="border rounded-lg p-3 bg-card">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-xs text-gray-500">
                          {item.numeroPedido ? `Nº ${item.numeroPedido}` : "Nº —"}
                        </div>
                        <div className="font-semibold text-sm">{(item.nome || "").toUpperCase()}</div>
                      </div>
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
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <StatusBadge status={item.status} />
                      {item.finalized ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Finalizada</span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Pendente</span>
                      )}
                    </div>
                    <div className="mt-2 grid grid-cols-1 gap-1 text-sm text-muted-foreground">
                      <div><span className="font-medium">Loja:</span> {item.loja}</div>
                      <div><span className="font-medium">Entrada:</span> {item.dataValidade}</div>
                      <div><span className="font-medium">WhatsApp:</span> {formatWhatsapp(item.whatsapp)}</div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Tabela Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="py-3 px-4 text-left">Nº Pedido</th>
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
                    filteredItems.slice(0, pageSize).map((item) => (
                      <tr key={item.id} className="border-b hover:bg-secondary/50">
                        {/* Garantias antigas não possuem numeroPedido e exibem "—" */}
                        <td className="py-3 px-4">{item.numeroPedido ?? "—"}</td>
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
                        <td className="py-3 px-4">{formatWhatsapp(item.whatsapp)}</td>
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

      {/* Modal de Finalização */}
      <FinalizeWarrantyModal
        isOpen={finalizeModalOpen}
        onClose={() => {
          setFinalizeModalOpen(false)
          setSelectedWarrantyItem(null)
        }}
        warrantyItem={selectedWarrantyItem}
        onSuccess={handleFinalizeSuccess}
      />
    </div>
  )
}
