"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useAuth } from "@/context/auth-context"
import { useToast } from "@/components/ui/use-toast"
import { fetchWishlistItemById, updateWishlistItem } from "@/lib/firebase/wishlist"
import type { WishlistItem } from "@/types"
import Header from "@/components/header"

export default function EditarDesejoPage({ params }: { params: { id: string } }) {
  const [item, setItem] = useState<WishlistItem | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    if (!user) {
      router.push("/login")
      return
    }

    const loadItem = async () => {
      try {
        const data = await fetchWishlistItemById(params.id)
        setItem(data)
      } catch (error) {
        toast({
          title: "Erro",
          description: "Não foi possível carregar os detalhes do item",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadItem()
  }, [params.id, user, router, toast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!item) return

    setIsSaving(true)
    try {
      await updateWishlistItem(params.id, item)
      toast({
        title: "Sucesso",
        description: "Item atualizado com sucesso",
      })
      router.push("/lista-desejos")
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o item",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (!user) {
    return null
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header title="Editar Desejo" />
        <main className="flex-1 p-4 md:p-6">
          <Card>
            <CardContent className="flex items-center justify-center p-6">
              <p>Carregando...</p>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  if (!item) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header title="Editar Desejo" />
        <main className="flex-1 p-4 md:p-6">
          <Card>
            <CardContent className="flex items-center justify-center p-6">
              <p>Item não encontrado</p>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header title="Editar Desejo" />

      <main className="flex-1 p-4 md:p-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Editar Desejo</CardTitle>
            <Button variant="outline" onClick={() => router.push("/lista-desejos")}>
              Voltar
            </Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold">Informações do Cliente</h3>
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome</Label>
                    <Input
                      id="nome"
                      value={item.nome}
                      onChange={(e) => setItem({ ...item, nome: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={item.email}
                      onChange={(e) => setItem({ ...item, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="celular">Celular</Label>
                    <Input
                      id="celular"
                      value={item.celular}
                      onChange={(e) => setItem({ ...item, celular: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold">Detalhes do Produto</h3>
                  <div className="space-y-2">
                    <Label htmlFor="produto">Produto</Label>
                    <Input
                      id="produto"
                      value={item.produto}
                      onChange={(e) => setItem({ ...item, produto: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lojaDestino">Loja Destino</Label>
                    <Input
                      id="lojaDestino"
                      value={item.lojaDestino}
                      onChange={(e) => setItem({ ...item, lojaDestino: e.target.value })}
                      required
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="jaComprou"
                      checked={item.jaComprou}
                      onCheckedChange={(checked) => setItem({ ...item, jaComprou: checked })}
                    />
                    <Label htmlFor="jaComprou">Já Comprou</Label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  value={item.descricao}
                  onChange={(e) => setItem({ ...item, descricao: e.target.value })}
                  className="min-h-[100px]"
                />
              </div>

              {item.imagemBase64 && (
                <div className="space-y-2">
                  <Label>Imagem Atual</Label>
                  <div className="relative h-64 w-64">
                    <Image
                      src={item.imagemBase64}
                      alt={item.produto}
                      fill
                      className="object-cover rounded-lg"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
} 