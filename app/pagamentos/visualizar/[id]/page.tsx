"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/context/auth-context"
import { useToast } from "@/components/ui/use-toast"
import { fetchPagamento } from "@/lib/firebase/pagamentos"
import type { Pagamento } from "@/lib/firebase/pagamentos"
import Header from "@/components/header"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft } from "lucide-react"
import { use } from "react"

export default function VisualizarPagamentoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [pagamento, setPagamento] = useState<Pagamento | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    if (!user) {
      router.push("/login")
      return
    }

    if (!user.permissions?.pagamentos?.visualizar) {
      toast({
        title: "Erro",
        description: "Você não tem permissão para visualizar pagamentos",
        variant: "destructive",
      })
      router.push("/dashboard")
      return
    }

    const loadPagamento = async () => {
      try {
        const data = await fetchPagamento(id)
        if (data) {
          setPagamento(data)
        } else {
          toast({
            title: "Pagamento não encontrado",
            description: "O pagamento solicitado não existe.",
            variant: "destructive",
          })
          router.push("/dashboard")
        }
      } catch (error) {
        console.error("Erro ao carregar pagamento:", error)
        toast({
          title: "Erro",
          description: "Não foi possível carregar os detalhes do pagamento.",
          variant: "destructive",
        })
        router.push("/dashboard")
      } finally {
        setIsLoading(false)
      }
    }

    loadPagamento()
  }, [id, user, router, toast])

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

  if (!user) {
    return null
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header title="Visualizar Pagamento" />
        <main className="flex-1 p-4 md:p-6">
          <div className="flex justify-center items-center h-full">
            <p>Carregando...</p>
          </div>
        </main>
      </div>
    )
  }

  if (!pagamento) {
    return null
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header title="Visualizar Pagamento" />

      <main className="flex-1 p-4 md:p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Button
            variant="ghost"
            className="mb-4"
            onClick={() => router.push("/pagamentos")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>

          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Detalhes do Pagamento</CardTitle>
                {getStatusBadge(pagamento.situacao)}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-2">Tipo</h3>
                  <p>{pagamento.tipo}</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Data</h3>
                  <p>{pagamento.data ? new Date(pagamento.data).toLocaleDateString('pt-BR') : '-'}</p>
                </div>
                {pagamento.tipo === "Agendado" && pagamento.formaPagamento && (
                  <div>
                    <h3 className="font-semibold mb-2">Forma de Pagamento</h3>
                    <p className="capitalize">{pagamento.formaPagamento}</p>
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-semibold mb-2">Finalidade</h3>
                <p className="whitespace-pre-wrap">{pagamento.finalidade}</p>
              </div>

              {pagamento.justificativa && (
                <div>
                  <h3 className="font-semibold mb-2">Justificativa</h3>
                  <p className="whitespace-pre-wrap">{pagamento.justificativa}</p>
                </div>
              )}

              <div>
                <h3 className="font-medium text-sm text-muted-foreground">Dados para pagamento</h3>
                {pagamento.tipo === "Agendado" && pagamento.dadosPagamento?.toLowerCase().includes("http") ? (
                  <a 
                    href={pagamento.dadosPagamento} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline mt-1 block"
                  >
                    Clique aqui para acessar o link de pagamento
                  </a>
                ) : (
                  <p className="mt-1">{pagamento.dadosPagamento || "-"}</p>
                )}
              </div>

              {pagamento.tipo === "Agendado" && pagamento.formaPagamento === "boleto" && pagamento.boletoPdf && (
                <div>
                  <h3 className="font-semibold mb-2">Boleto</h3>
                  <a 
                    href={pagamento.boletoPdf} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Visualizar boleto
                  </a>
                </div>
              )}

              {pagamento.dataVencimento && (
                <div>
                  <h3 className="font-semibold mb-2">Data de Vencimento</h3>
                  <p>{pagamento.dataVencimento ? new Date(pagamento.dataVencimento + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}</p>
                </div>
              )}

              {pagamento.comprovantePagamento && (
                <div>
                  <h3 className="font-semibold mb-2">Comprovante de Pagamento</h3>
                  {pagamento.comprovantePagamento.startsWith('data:image/') ? (
                    <div className="mt-2">
                      <img 
                        src={pagamento.comprovantePagamento} 
                        alt="Comprovante de pagamento" 
                        className="max-w-full h-auto rounded-lg border"
                      />
                    </div>
                  ) : (
                    <a 
                      href={pagamento.comprovantePagamento} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline"
                    >
                      Visualizar comprovante
                    </a>
                  )}
                </div>
              )}

              {pagamento.comprovanteDevolucao && (
                <div>
                  <h3 className="font-semibold mb-2">Comprovante de Devolução</h3>
                  <a 
                    href={pagamento.comprovanteDevolucao} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    Visualizar comprovante
                  </a>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
} 