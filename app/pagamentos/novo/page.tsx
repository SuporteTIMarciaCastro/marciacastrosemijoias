"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import Header from "@/components/header"
import { addPagamento, updatePagamento, fetchPagamento, Pagamento } from "@/lib/firebase/pagamentos"
import { toast } from "sonner"

const tiposPagamento = [
  { value: "reembolso", label: "Reembolso" },
  { value: "a vencer", label: "A Vencer" },
]

const situacoes = [
  { value: "pendente", label: "Pendente" },
  { value: "autorizado", label: "Autorizado" },
  { value: "rejeitado", label: "Rejeitado" },
]

interface FormData {
  quemPagou: string
  finalidade: string
  data: string
  justificativa: string
  dadosPagamento: string
  situacao: string
  comprovantePagamento: File | string | undefined
  comprovanteDevolucao: File | string | undefined
  boletoPdf: File | string | undefined
  dataVencimento: string
}

export default function NovoPagamentoPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const id = searchParams.get('id')
  const [isLoading, setIsLoading] = useState(false)
  const [tipo, setTipo] = useState("reembolso")
  const [showBoletoPdf, setShowBoletoPdf] = useState(false)
  const [formaPagamento, setFormaPagamento] = useState("")
  const [form, setForm] = useState<FormData>({
    quemPagou: "",
    finalidade: "",
    data: "",
    justificativa: "",
    dadosPagamento: "",
    situacao: "pendente",
    comprovantePagamento: undefined,
    comprovanteDevolucao: undefined,
    boletoPdf: undefined,
    dataVencimento: "",
  })

  const MAX_FILE_SIZE = 900 * 1024 // 900KB para dar margem de segurança

  useEffect(() => {
    if (id) {
      loadPagamento()
    }
  }, [id])

  async function loadPagamento() {
    try {
      const pagamento = await fetchPagamento(id!)
      if (pagamento) {
        setTipo(pagamento.tipo)
        setForm({
          quemPagou: pagamento.quemPagou || "",
          finalidade: pagamento.finalidade,
          data: pagamento.data || "",
          justificativa: pagamento.justificativa,
          dadosPagamento: pagamento.dadosPagamento || "",
          situacao: pagamento.situacao,
          comprovantePagamento: pagamento.comprovantePagamento,
          comprovanteDevolucao: pagamento.comprovanteDevolucao,
          boletoPdf: pagamento.boletoPdf,
          dataVencimento: pagamento.dataVencimento || "",
        })
      }
    } catch (error) {
      toast.error("Erro ao carregar pagamento")
    }
  }

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

  const compressImage = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          let width = img.width
          let height = img.height
          
          // Reduzir tamanho se necessário
          const maxDimension = 1200
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = (height * maxDimension) / width
              width = maxDimension
            } else {
              width = (width * maxDimension) / height
              height = maxDimension
            }
          }

          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          ctx?.drawImage(img, 0, 0, width, height)
          
          // Converter para base64 com qualidade reduzida
          const base64 = canvas.toDataURL('image/jpeg', 0.7)
          resolve(base64)
        }
        img.onerror = reject
        img.src = e.target?.result as string
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const convertFileToBase64 = async (file: File): Promise<string> => {
    // Verificar tamanho do arquivo
    if (file.size > MAX_FILE_SIZE) {
      if (file.type.startsWith('image/')) {
        // Se for imagem, tenta comprimir
        try {
          return await compressImage(file)
        } catch (error) {
          throw new Error(`Arquivo muito grande (${(file.size / 1024 / 1024).toFixed(2)}MB). Tamanho máximo permitido: 900KB`)
        }
      } else {
        // Se não for imagem, rejeita
        throw new Error(`Arquivo muito grande (${(file.size / 1024 / 1024).toFixed(2)}MB). Tamanho máximo permitido: 900KB`)
      }
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, files } = e.target
    if (files && files[0]) {
      const file = files[0]
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`Arquivo muito grande (${(file.size / 1024 / 1024).toFixed(2)}MB). Tamanho máximo permitido: 900KB`)
        e.target.value = '' // Limpa o input
        return
      }
      setForm((prev) => ({ ...prev, [name]: file }))
    } else {
      setForm((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  const removeUndefinedFields = (obj: Omit<Pagamento, "id">): Omit<Pagamento, "id"> => {
    const requiredFields = ['tipo', 'finalidade', 'justificativa', 'situacao']
    const result = { ...obj }

    // Remover campos undefined, exceto os obrigatórios
    Object.keys(result).forEach(key => {
      if (!requiredFields.includes(key) && result[key as keyof typeof result] === undefined) {
        delete result[key as keyof typeof result]
      }
    })

    return result
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Converter arquivos para base64
      const comprovantePagamentoBase64 = form.comprovantePagamento instanceof File 
        ? await convertFileToBase64(form.comprovantePagamento)
        : form.comprovantePagamento

      const comprovanteDevolucaoBase64 = form.comprovanteDevolucao instanceof File
        ? await convertFileToBase64(form.comprovanteDevolucao)
        : form.comprovanteDevolucao

      const boletoPdfBase64 = form.boletoPdf instanceof File
        ? await convertFileToBase64(form.boletoPdf)
        : form.boletoPdf

      const pagamentoData: Omit<Pagamento, "id"> = {
        tipo,
        quemPagou: form.quemPagou,
        finalidade: form.finalidade,
        data: form.data || new Date().toISOString(),
        justificativa: form.justificativa,
        dadosPagamento: form.dadosPagamento,
        situacao: form.situacao,
        comprovantePagamento: comprovantePagamentoBase64,
        comprovanteDevolucao: comprovanteDevolucaoBase64,
        boletoPdf: boletoPdfBase64,
        dataVencimento: form.dataVencimento,
      }

      // Remover campos undefined antes de enviar ao Firestore
      const cleanPagamentoData = removeUndefinedFields(pagamentoData)

      if (id) {
        await updatePagamento(id, cleanPagamentoData)
        toast.success("Pagamento atualizado com sucesso!")
      } else {
        await addPagamento(cleanPagamentoData)
        toast.success("Pagamento criado com sucesso!")
      }
      
      router.push("/pagamentos")
    } catch (error) {
      console.error("Erro ao salvar pagamento:", error)
      toast.error("Erro ao salvar pagamento")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header title={id ? "Editar Pagamento" : "Novo Pagamento"} />
      <main className="flex-1 p-4 md:p-6 flex flex-col items-center">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle>{id ? "Editar Pagamento" : "Cadastro de Pagamento"}</CardTitle>
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
                  {id && (
                    <>
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
                </>
              )}
              {tipo === "a vencer" && (
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
                  {id && (
                    <>
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
                      {formaPagamento !== "boleto" && (
                        <div>
                          <label className="block mb-1 font-medium">Comprovante de pagamento</label>
                          <Input name="comprovantePagamento" type="file" onChange={handleFileChange} />
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
              <div className="flex justify-end">
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
} 