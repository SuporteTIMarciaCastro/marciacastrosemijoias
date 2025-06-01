"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/context/auth-context"
import { useToast } from "@/components/ui/use-toast"
import { fetchWishlistItemById } from "@/lib/firebase/wishlist"
import type { WishlistItem } from "@/types"
import Header from "@/components/header"

export default function VisualizarDesejoPage({ params }: { params: { id: string } }) {
  const [item, setItem] = useState<WishlistItem | null>(null)
  const [isLoading, setIsLoading] = useState(true)
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

  if (!user) {
    return null
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header title="Visualizar Desejo" />
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
        <Header title="Visualizar Desejo" />
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
      <Header title="Visualizar Desejo" />

      <main className="flex-1 p-4 md:p-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Detalhes do Desejo</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => router.push("/lista-desejos")}>
                Voltar
              </Button>
              <Button onClick={() => router.push(`/lista-desejos/editar/${params.id}`)}>
                Editar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2">Informações do Cliente</h3>
                  <div className="space-y-2">
                    <p><span className="font-medium">Nome:</span> {item.nome}</p>
                    <p><span className="font-medium">Email:</span> {item.email}</p>
                    <p><span className="font-medium">Celular:</span> {item.celular}</p>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Detalhes do Produto</h3>
                  <div className="space-y-2">
                    <p><span className="font-medium">Produto:</span> {item.produto}</p>
                    <p><span className="font-medium">Loja Destino:</span> {item.lojaDestino}</p>
                    <p><span className="font-medium">Já Comprou:</span> {item.jaComprou ? "Sim" : "Não"}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Descrição</h3>
                <p className="text-gray-600">{item.descricao}</p>
              </div>

              {item.imagemBase64 && (
                <div>
                  <h3 className="font-semibold mb-2">Imagem</h3>
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
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
} 