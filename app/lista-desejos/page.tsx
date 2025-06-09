"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/context/auth-context"
import { useToast } from "@/components/ui/use-toast"
import { fetchWishlistItems, deleteWishlistItem } from "@/lib/firebase/wishlist"
import type { WishlistItem } from "@/types"
import Header from "@/components/header"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Copy, ExternalLink } from "lucide-react"
import { ActionsMenu } from "@/components/actions-menu"

export default function ListaDesejosPage() {
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    if (!user) {
      router.push("/login")
      return
    }

    const loadWishlistItems = async () => {
      try {
        const items = await fetchWishlistItems()
        setWishlistItems(items)
      } catch (error) {
        toast({
          title: "Erro",
          description: "Não foi possível carregar a lista de desejos",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadWishlistItems()
  }, [user, router, toast])

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

  const filteredItems = wishlistItems.filter(
    (item) =>
      item.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.produto.toLowerCase().includes(searchTerm.toLowerCase()),
  )

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
              <Input
                placeholder="Pesquisar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-xs"
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2">
                    <ExternalLink className="h-4 w-4" />
                    Formulário para Cliente
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => router.push("/lista-desejos/formulario")}>
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
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Celular</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Já Comprou</TableHead>
                    <TableHead>Loja Destino</TableHead>
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
                  ) : filteredItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-4">
                        Nenhum item encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredItems.map((item, index) => (
                      <TableRow key={item.id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{item.nome}</TableCell>
                        <TableCell>{item.celular}</TableCell>
                        <TableCell>{item.email}</TableCell>
                        <TableCell>{item.produto}</TableCell>
                        <TableCell>{item.jaComprou ? "Sim" : "Não"}</TableCell>
                        <TableCell>{item.lojaDestino}</TableCell>
                        <TableCell>
                          {item.imagemUrl ? (
                            <div className="relative h-16 w-16">
                              <Image
                                src={item.imagemUrl}
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
    </div>
  )
}