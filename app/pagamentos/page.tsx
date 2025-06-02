"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Header from "@/components/header"
import { fetchPagamentos, deletePagamento, Pagamento } from "@/lib/firebase/pagamentos"
import { toast } from "sonner"
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
import { MoreHorizontal, Eye, Pencil, Trash2 } from "lucide-react"
import PagamentoFormModal from "@/components/pagamento-form-modal"

export default function ListaPagamentosPage() {
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [pagamentoToDelete, setPagamentoToDelete] = useState<Pagamento | null>(null)
  const [pagamentoToEdit, setPagamentoToEdit] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    loadPagamentos()
  }, [])

  async function loadPagamentos() {
    setIsLoading(true)
    setError(null)
    try {
      const data = await fetchPagamentos()
      setPagamentos(data)
    } catch (err) {
      setError("Erro ao carregar pagamentos.")
      toast.error("Erro ao carregar pagamentos")
    } finally {
      setIsLoading(false)
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

  const filteredPagamentos = pagamentos.filter((p) =>
    (p.finalidade?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.justificativa?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.tipo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.situacao?.toLowerCase().includes(searchTerm.toLowerCase()))
  )

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

  return (
    <div className="flex min-h-screen flex-col">
      <Header title="Solicitações de Pagamentos" />
      <main className="flex-1 p-4 md:p-6">
        <Card>
          <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0">
            <CardTitle>Lista de Solicitações de Pagamentos</CardTitle>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                placeholder="Pesquisar pagamento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-xs"
              />
              <Button onClick={() => router.push("/pagamentos/novo")}>Adicionar Pagamento</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
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
                  ) : filteredPagamentos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-4">Nenhum pagamento encontrado</TableCell>
                    </TableRow>
                  ) : (
                    filteredPagamentos.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>{p.id}</TableCell>
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
                              <DropdownMenuItem onClick={() => handleView(p.id!)}>
                                <Eye className="mr-2 h-4 w-4" />
                                Visualizar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setPagamentoToEdit(p.id!)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => setPagamentoToDelete(p)}
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