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

export default function ListaPagamentosPage() {
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const router = useRouter()

  useEffect(() => {
    async function loadPagamentos() {
      setIsLoading(true)
      setError(null)
      try {
        const data = await fetchPagamentos()
        setPagamentos(data)
      } catch (err) {
        setError("Erro ao carregar pagamentos.")
      } finally {
        setIsLoading(false)
      }
    }
    loadPagamentos()
  }, [])

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

  return (
    <div className="flex min-h-screen flex-col">
      <Header title="Solicitações de Pagamentos" />
      <main className="flex-1 p-4 md:p-6">
        <Card>
          <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0">
            <CardTitle>Lista de Solicitaçõesde Pagamentos</CardTitle>
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
                    <TableHead>Justificativa</TableHead>
                    <TableHead>Situação</TableHead>
                    <TableHead>Ações</TableHead>
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
                    filteredPagamentos.map((p, index) => (
                      <TableRow key={p.id}>
                        <TableCell>{p.id}</TableCell>
                        <TableCell>{p.tipo}</TableCell>
                        <TableCell className="max-w-xs truncate">{p.finalidade}</TableCell>
                        <TableCell className="max-w-xs truncate">{p.justificativa}</TableCell>
                        <TableCell>{getStatusBadge(p.situacao)}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-2">
                            <Button variant="default" size="sm" onClick={() => router.push(`/pagamentos/novo?id=${p.id}`)}>
                              Editar
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => {/* implementar remoção */}}>
                              Remover
                            </Button>
                          </div>
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