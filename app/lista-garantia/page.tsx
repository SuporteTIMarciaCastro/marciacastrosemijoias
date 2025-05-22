"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/context/auth-context"
import { useToast } from "@/components/ui/use-toast"
import { fetchWarrantyItems, deleteWarrantyItem } from "@/lib/firebase/warranty"
import type { WarrantyItem } from "@/types"
import Header from "@/components/header"
import GarantiaFormModal from "@/components/garantia-form-modal"
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

export default function ListaGarantiaPage() {
  const [warrantyItems, setWarrantyItems] = useState<WarrantyItem[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>(undefined)
  const [itemToDelete, setItemToDelete] = useState<string | null>(null)
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

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

  const filteredItems = warrantyItems.filter(
    (item) =>
      item.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.status.toLowerCase().includes(searchTerm.toLowerCase()),
  )

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
              <Input
                placeholder="Pesquisar garantia..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-xs"
              />
              <Button onClick={handleAddNew}>Adicionar Garantia</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="py-3 px-4 text-left">Nome</th>
                    <th className="py-3 px-4 text-left">Data da Compra</th>
                    <th className="py-3 px-4 text-left">Data de Validade</th>
                    <th className="py-3 px-4 text-left">Status</th>
                    <th className="py-3 px-4 text-left">Loja</th>
                    <th className="py-3 px-4 text-left">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="text-center py-4">
                        Carregando...
                      </td>
                    </tr>
                  ) : filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-4">
                        Nenhuma garantia encontrada
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => (
                      <tr key={item.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">{item.nome}</td>
                        <td className="py-3 px-4">{item.dataCompra}</td>
                        <td className="py-3 px-4">{item.dataValidade}</td>
                        <td className="py-3 px-4">{item.status}</td>
                        <td className="py-3 px-4">{item.loja}</td>
                        <td className="py-3 px-4">
                          <div className="flex flex-col sm:flex-row gap-2">
                            <Button variant="default" size="sm" onClick={() => handleEdit(item.id)}>
                              Editar
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => setItemToDelete(item.id)}>
                              Remover
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
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
    </div>
  )
}
