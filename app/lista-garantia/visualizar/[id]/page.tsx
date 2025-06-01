"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { fetchWarrantyItem } from "@/lib/firebase/warranty"
import type { WarrantyItem } from "@/types"
import { StatusBadge } from "@/components/status-badge"
import { Calendar, MapPin, User, Mail, Phone, FileText, Image as ImageIcon } from "lucide-react"

export default function VisualizarGarantiaPage({ params }: { params: { id: string } }) {
  const [item, setItem] = useState<WarrantyItem | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    const loadItem = async () => {
      try {
        const data = await fetchWarrantyItem(params.id)
        setItem(data)
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
  }, [params.id, toast])

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-gray-50">
        <div className="w-full bg-white py-4 px-6 shadow-sm">
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
      <div className="flex min-h-screen flex-col bg-gray-50">
        <div className="w-full bg-white py-4 px-6 shadow-sm">
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
    <div className="flex min-h-screen flex-col bg-gray-50">
      <div className="w-full bg-white py-4 px-6 shadow-sm">
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
          <Card>
            <CardHeader>
              <CardTitle className="text-center text-2xl font-bold text-gray-800">
                Detalhes da Garantia
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6">
                {/* Status e Datas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Calendar className="h-4 w-4" />
                      <span>Data da Compra</span>
                    </div>
                    <p className="font-medium">{item.dataCompra}</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Calendar className="h-4 w-4" />
                      <span>Entrada da Solicitação</span>
                    </div>
                    <p className="font-medium">{item.dataValidade}</p>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2">
                  <span className="text-sm text-gray-500">Status:</span>
                  <StatusBadge status={item.status} />
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
                    <div className="relative h-64 w-full md:w-96 mx-auto">
                      <Image
                        src={item.imagemPecas}
                        alt="Imagem das peças"
                        fill
                        className="object-contain rounded-lg"
                      />
                    </div>
                  </div>
                )}

                {item.notaCompra && (
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Nota de Compra
                    </h3>
                    <div className="relative h-64 w-full md:w-96 mx-auto">
                      <Image
                        src={item.notaCompra}
                        alt="Nota de compra"
                        fill
                        className="object-contain rounded-lg"
                      />
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