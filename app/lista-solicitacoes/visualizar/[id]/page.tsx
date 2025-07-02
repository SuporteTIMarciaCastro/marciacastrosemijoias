"use client"

import { useState, useEffect, use as usePromise } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/context/auth-context"
import { useToast } from "@/components/ui/use-toast"
import { fetchMaterialRequest } from "@/lib/firebase/material-requests"
import type { MaterialRequest } from "@/types"
import Header from "@/components/header"
import { GrauBadge } from "@/components/grau-badge"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft } from "lucide-react"

export default function VisualizarSolicitacaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = usePromise(params)
  const [solicitacao, setSolicitacao] = useState<MaterialRequest | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    if (!user) {
      router.push("/login")
      return
    }

    const loadSolicitacao = async () => {
      try {
        const data = await fetchMaterialRequest(id)
        if (data) {
          setSolicitacao(data)
        } else {
          toast({
            title: "Erro",
            description: "Solicitação não encontrada",
            variant: "destructive",
          })
          router.push("/lista-solicitacoes")
        }
      } catch (error) {
        toast({
          title: "Erro",
          description: "Não foi possível carregar os dados da solicitação",
          variant: "destructive",
        })
        router.push("/lista-solicitacoes")
      } finally {
        setIsLoading(false)
      }
    }

    loadSolicitacao()
  }, [id, user, router, toast])

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "concluído":
        return <Badge className="bg-green-500">Concluído</Badge>
      case "recusado":
        return <Badge variant="destructive">Recusado</Badge>
      case "pendente":
        return <Badge variant="outline">Pendente</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  if (!user) {
    return null
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header title="Visualizar Solicitação" />
        <main className="flex-1 p-4 md:p-6">
          <div className="flex justify-center items-center h-full">
            <p>Carregando...</p>
          </div>
        </main>
      </div>
    )
  }

  if (!solicitacao) {
    return null
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header title="Visualizar Solicitação" />

      <main className="flex-1 p-4 md:p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Button
            variant="ghost"
            className="mb-4"
            onClick={() => router.push("/lista-solicitacoes")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>

          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Detalhes da Solicitação</CardTitle>
                {getStatusBadge(solicitacao.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-2">Setor</h3>
                  <p>{solicitacao.setor}</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Grau de Necessidade</h3>
                  <GrauBadge grau={solicitacao.grau} />
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Materiais Solicitados</h3>
                <div className="border rounded-lg divide-y">
                  {solicitacao.materiais?.map((material, index) => (
                    <div key={index} className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{material.descricao}</p>
                        {material.status === 'aceito' && (
                          <Badge className="bg-green-500 text-white">Aceito ✔</Badge>
                        )}
                        {material.status === 'recusado' && (
                          <Badge variant="destructive">Recusado ✖</Badge>
                        )}
                        {(!material.status || material.status === undefined) && (
                          <Badge variant="outline">Pendente</Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Quantidade: {material.quantidade}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Justificativa</h3>
                <p className="whitespace-pre-wrap">{solicitacao.justificativa}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-2">Data de Criação</h3>
                  <p>{new Date(solicitacao.createdAt).toLocaleDateString('pt-BR')}</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Última Atualização</h3>
                  <p>{new Date(solicitacao.updatedAt).toLocaleDateString('pt-BR')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
} 