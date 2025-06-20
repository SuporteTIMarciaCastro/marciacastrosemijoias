"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { fetchWarrantyItem } from "@/lib/firebase/warranty"
import type { WarrantyItem } from "@/types"
import { StatusBadge } from "@/components/status-badge"
import { Calendar, MapPin, User, Mail, Phone, FileText, Image as ImageIcon, Copy } from "lucide-react"
import { use } from "react"

// Re-adicionando getGoogleDriveEmbedUrl para gerar a URL de imagem bruta
const getGoogleDriveEmbedUrl = (url: string): string => {
  const fileIdMatch = url.match(/id=([a-zA-Z0-9_-]+)/) || url.match(/d\/([a-zA-Z0-9_-]+)/)
  if (fileIdMatch && fileIdMatch[1]) {
    // Usamos 'uc?id=' para obter o conteúdo bruto da imagem
    return `https://drive.google.com/uc?id=${fileIdMatch[1]}`
  }
  return url // Retorna a URL original se o ID não for encontrado
}

export default function VisualizarGarantiaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [item, setItem] = useState<WarrantyItem | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    const loadItem = async () => {
      try {
        const data = await fetchWarrantyItem(id)
        setItem(data)
        if (data?.imagemPecas) {
          console.log("Valor de item.imagemPecas:", data.imagemPecas)
          console.log("URLs de imagem divididas:", data.imagemPecas.split(","))
        }
      } catch (error) {
        toast({
          title: "Erro",
          description: "Não foi possível carregar os detalhes da garantia",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadItem()
  }, [id, toast])

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-900">
        <div className="w-full bg-white py-4 px-6 shadow-sm dark:bg-gray-900">
          <div className="max-w-4xl mx-auto">
            <Image
              src="/logo.png"
              alt="Márcia Castro Semi Joias"
              width={200}
              height={60}
              className="h-12 w-auto"
            />
          </div>
        </div>
        <main className="flex-1 p-4 md:p-6">
          <div className="max-w-4xl mx-auto">
            <Card>
              <CardContent className="flex items-center justify-center p-6">
                <p>Carregando...</p>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    )
  }

  if (!item) {
    return (
      <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-900">
        <div className="w-full bg-white py-4 px-6 shadow-sm dark:bg-gray-900">
          <div className="max-w-4xl mx-auto">
            <Image
              src="/logo.png"
              alt="Márcia Castro Semi Joias"
              width={200}
              height={60}
              className="h-12 w-auto"
            />
          </div>
        </div>
        <main className="flex-1 p-4 md:p-6">
          <div className="max-w-4xl mx-auto">
            <Card>
              <CardContent className="flex items-center justify-center p-6">
                <p>Garantia não encontrada</p>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-900">
      <div className="w-full bg-white py-4 px-6 shadow-sm dark:bg-gray-900">
        <div className="max-w-4xl mx-auto">
          <Image
            src="/logo.png"
            alt="Márcia Castro Semi Joias"
            width={200}
            height={60}
            className="h-12 w-auto"
          />
        </div>
      </div>
      <main className="flex-1 p-4 md:p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-center text-2xl font-bold text-gray-800 dark:text-gray-100">
                  Detalhes da Garantia
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const url = window.location.href
                    navigator.clipboard.writeText(url)
                    toast({
                      title: "URL copiada",
                      description: "O link da garantia foi copiado para a área de transferência",
                    })
                  }}
                  className="flex items-center gap-2"
                >
                  <Copy className="h-4 w-4" />
                  Copiar Link
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6">
                {/* Status e Datas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <Calendar className="h-4 w-4" />
                      <span>Data da Compra</span>
                    </div>
                    <p className="font-medium dark:text-gray-100">{item.dataCompra}</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <Calendar className="h-4 w-4" />
                      <span>Entrada da Solicitação</span>
                    </div>
                    <p className="font-medium dark:text-gray-100">{item.dataValidade}</p>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Status:</span>
                  {item.finalized ? (
                    <>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        Finalizado
                      </span>
                      <span className="mx-1 font-bold text-gray-500 dark:text-gray-400">{'->'}</span>
                      <StatusBadge status={item.status} />
                    </>
                  ) : (
                    <StatusBadge status={item.status} />
                  )}
                </div>

                {/* Informações do Cliente */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Informações do Cliente
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <User className="h-4 w-4" />
                        <span>Nome</span>
                      </div>
                      <p className="font-medium">{item.nome}</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <User className="h-4 w-4" />
                        <span>Vendedor Responsável</span>
                      </div>
                      <p className="font-medium">{item.vendedor || 'Não informado'}</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Mail className="h-4 w-4" />
                        <span>Email</span>
                      </div>
                      <p className="font-medium">{item.email || "Não informado"}</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Phone className="h-4 w-4" />
                        <span>WhatsApp</span>
                      </div>
                      <p className="font-medium">{item.whatsapp || "Não informado"}</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <MapPin className="h-4 w-4" />
                        <span>Loja</span>
                      </div>
                      <p className="font-medium">{item.loja}</p>
                    </div>
                  </div>
                </div>

                {/* Descrição e Justificativa */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Descrição das Peças
                    </h3>
                    <p className="text-gray-600 whitespace-pre-wrap">{item.descricaoPecas}</p>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Justificativa
                    </h3>
                    <p className="text-gray-600 whitespace-pre-wrap">{item.observacao}</p>
                  </div>
                </div>

                {/* Imagens */}
                {item.imagemPecas && (
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <ImageIcon className="h-5 w-5" />
                      Imagem das Peças
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {item.imagemPecas.split(",").map((url: string, index: number) => {
                        return (
                          <div key={index} className="space-y-2">
                            <div className="relative h-64 w-full">
                              <img
                                src={`/api/image-proxy?url=${encodeURIComponent(getGoogleDriveEmbedUrl(url))}`}
                                alt={`Imagem das peças ${index + 1}`}
                                className="object-contain rounded-lg w-full h-full"
                              />
                            </div>
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:text-blue-800 break-all"
                            >
                              {url}
                            </a>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {item.notaCompra && (
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Nota de Compra
                    </h3>
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-blue-600" />
                      <a
                        href={item.notaCompra}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 break-all"
                      >
                        {item.notaCompra}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
} 