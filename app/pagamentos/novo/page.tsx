"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import Header from "@/components/header"

const tiposPagamento = [
  { value: "reembolso", label: "Reembolso" },
  { value: "pendente", label: "Pendente" },
]

const situacoes = [
  { value: "pendente", label: "Pendente" },
  { value: "autorizado", label: "Autorizado" },
  { value: "rejeitado", label: "Rejeitado" },
]

export default function NovoPagamentoPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  // Se for edição, pode buscar o pagamento pelo id: searchParams.get('id')
  const [tipo, setTipo] = useState("reembolso")
  const [showBoletoPdf, setShowBoletoPdf] = useState(false)
  const [formaPagamento, setFormaPagamento] = useState("")
  const [form, setForm] = useState({
    quemPagou: "",
    finalidade: "",
    data: "",
    justificativa: "",
    dadosPagamento: "",
    prazo: "",
    situacao: "pendente",
    comprovantePagamento: undefined,
    comprovanteDevolucao: undefined,
    dataVencimento: "",
  })

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (name === "dadosPagamento") {
      setShowBoletoPdf(value.toLowerCase().includes("boleto"))
    }
  }

  function handleSelectChange(name: string, value: string) {
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, files } = e.target
    setForm((prev) => ({ ...prev, [name]: files ? files[0] : undefined }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    // Aqui você pode enviar os dados do formulário para a API ou backend
    alert("Pagamento salvo com sucesso! (simulação)")
    router.push("/pagamentos")
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header title="Novo Pagamento" />
      <main className="flex-1 p-4 md:p-6 flex flex-col items-center">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle>Cadastro de Pagamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <label className="block mb-1 font-medium">Tipo de Pagamento</label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {tiposPagamento.map((tp) => (
                    <SelectItem key={tp.value} value={tp.value}>{tp.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <form className="space-y-4" onSubmit={handleSubmit}>
              {tipo === "reembolso" && (
                <>
                  <div>
                    <label className="block mb-1 font-medium">Quem pagou</label>
                    <Input name="quemPagou" placeholder="Nome do funcionário" value={form.quemPagou} onChange={handleInputChange} />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">Finalidade do pagamento</label>
                    <Textarea name="finalidade" placeholder="Descreva a finalidade" value={form.finalidade} onChange={handleInputChange} />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">Data</label>
                    <Input name="data" type="date" value={form.data} onChange={handleInputChange} />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">Justificativa</label>
                    <Textarea name="justificativa" placeholder="Justifique o pagamento" value={form.justificativa} onChange={handleInputChange} />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">Dados para pagamento</label>
                    <Input name="dadosPagamento" placeholder="Dados bancários, PIX ou boleto" value={form.dadosPagamento} onChange={handleInputChange} />
                  </div>
                  {showBoletoPdf && (
                    <div>
                      <label className="block mb-1 font-medium">Anexar PDF do boleto</label>
                      <Input name="boletoPdf" type="file" accept="application/pdf" onChange={handleFileChange} />
                    </div>
                  )}
                  <div>
                    <label className="block mb-1 font-medium">Situação</label>
                    <Select value={form.situacao} onValueChange={(v) => handleSelectChange("situacao", v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a situação" />
                      </SelectTrigger>
                      <SelectContent>
                        {situacoes.map((s) => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">Comprovante de pagamento</label>
                    <Input name="comprovantePagamento" type="file" onChange={handleFileChange} />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">Comprovante de devolução</label>
                    <Input name="comprovanteDevolucao" type="file" onChange={handleFileChange} />
                  </div>
                </>
              )}
              {tipo === "pendente" && (
                <>
                  <div>
                    <label className="block mb-1 font-medium">Forma de Pagamento</label>
                    <Select value={formaPagamento} onValueChange={setFormaPagamento}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a forma de pagamento" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="boleto">Boleto</SelectItem>
                        <SelectItem value="pix">PIX</SelectItem>
                        <SelectItem value="cartao">Cartão</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">Finalidade do pagamento</label>
                    <Textarea name="finalidade" placeholder="Descreva a finalidade" value={form.finalidade} onChange={handleInputChange} />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">Data de vencimento</label>
                    <Input name="dataVencimento" type="date" value={form.dataVencimento} onChange={handleInputChange} />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">Justificativa</label>
                    <Textarea name="justificativa" placeholder="Justifique o pagamento" value={form.justificativa} onChange={handleInputChange} />
                  </div>
                  {formaPagamento === "pix" || formaPagamento === "cartao" ? (
                    <div>
                      <label className="block mb-1 font-medium">Dados para pagamento</label>
                      <Input name="dadosPagamento" placeholder={formaPagamento === "pix" ? "Chave PIX" : "Dados do cartão"} value={form.dadosPagamento} onChange={handleInputChange} />
                    </div>
                  ) : null}
                  {formaPagamento === "boleto" ? (
                    <div>
                      <label className="block mb-1 font-medium">Anexar boleto (PDF)</label>
                      <Input name="boletoPdf" type="file" accept="application/pdf" onChange={handleFileChange} />
                    </div>
                  ) : null}
                  <div>
                    <label className="block mb-1 font-medium">Situação</label>
                    <Select value={form.situacao} onValueChange={(v) => handleSelectChange("situacao", v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a situação" />
                      </SelectTrigger>
                      <SelectContent>
                        {situacoes.map((s) => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">Comprovante de pagamento</label>
                    <Input name="comprovantePagamento" type="file" onChange={handleFileChange} />
                  </div>
                </>
              )}
              <div className="flex justify-end">
                <Button type="submit">Salvar</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
} 