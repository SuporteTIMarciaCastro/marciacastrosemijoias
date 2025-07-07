"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import Header from "@/components/header"
import { addPagamento, Pagamento } from "@/lib/firebase/pagamentos"
import { toast } from "sonner"
import { useAuth } from "@/context/auth-context"


const tiposPagamento = [
  { value: "reembolso", label: "Reembolso" },
  { value: "Agendado", label: "Agendado" },
]

interface FormData {
  finalidade: string
  data: string
  justificativa: string
  dadosPagamento: string
  comprovantePagamento: File | undefined
  boletoPdf: File | undefined
  dataVencimento: string
  formaPagamento: string
  anexos: File[]
}

export default function NovoPagamentoPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [tipo, setTipo] = useState("reembolso")
  const [showBoletoPdf, setShowBoletoPdf] = useState(false)
  const [formaPagamento, setFormaPagamento] = useState("")
  const [form, setForm] = useState<FormData>({
    finalidade: "",
    data: "",
    justificativa: "",
    dadosPagamento: "",
    comprovantePagamento: undefined,
    boletoPdf: undefined,
    dataVencimento: "",
    formaPagamento: "",
    anexos: [],
  })

  useEffect(() => {
    if (!user) {
      router.push("/login")
      return
    }

    if (!user.permissions?.pagamentos?.adicionar) {
      toast.error("Você não tem permissão para adicionar pagamentos")
      router.push("/pagamentos")
      return
    }
  }, [user, router])

  const MAX_FILE_SIZE = 4 * 1024 * 1024 // 4MB

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (name === "dadosPagamento") {
      setShowBoletoPdf(value.toLowerCase().includes("boleto"))
    }
  }

  const uploadFileToDrive = async (file: File): Promise<string> => {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("folderId", "1i55quYEmytJU_AhBs3b2AnZVAo3YAnlT") // ID da pasta de pagamentos

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      throw new Error("Erro ao fazer upload do arquivo")
    }

    const result = await response.json()
    return result.fileUrl
  }

  const convertFileToBase64 = async (file: File): Promise<string> => {
    if (file.size > MAX_FILE_SIZE) {
      throw new Error('Arquivo muito grande. Tamanho máximo permitido: 4MB')
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target?.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, files } = e.target
    if (files && files[0]) {
      const file = files[0]
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`Arquivo muito grande (${(file.size / 1024 / 1024).toFixed(2)}MB). Tamanho máximo permitido: 4MB`)
        e.target.value = ''
        return
      }
      setForm((prev) => ({ ...prev, [name]: file }))
    }
  }

  function handleAnexosChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (files) {
      const validFiles = Array.from(files).filter(file => file.size <= MAX_FILE_SIZE)
      if (validFiles.length < files.length) {
        toast.error("Algum arquivo excede o limite de 4MB e foi ignorado.")
      }
      setForm((prev) => ({ ...prev, anexos: validFiles }))
    }
  }

  async function uploadAnexosToDrive(files: File[]): Promise<string[]> {
    const urls: string[] = []
    for (const file of files) {
      try {
        const url = await uploadFileToDrive(file)
        urls.push(url)
      } catch (e) {
        toast.error(`Erro ao enviar o arquivo: ${file.name}`)
      }
    }
    return urls
  }

  function removeUndefinedFields<T extends object>(obj: T): T {
    return Object.fromEntries(
      Object.entries(obj).filter(([_, value]) => value !== undefined)
    ) as T
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)

    try {
      let comprovantePagamentoUrl: string | undefined
      if (form.comprovantePagamento instanceof File) {
        comprovantePagamentoUrl = await uploadFileToDrive(form.comprovantePagamento)
      }

      let boletoPdfUrl: string | undefined
      if (form.boletoPdf instanceof File) {
        boletoPdfUrl = await uploadFileToDrive(form.boletoPdf)
      }

      // Upload dos anexos
      let anexosUrls: string[] = []
      if (form.anexos && form.anexos.length > 0) {
        anexosUrls = await uploadAnexosToDrive(form.anexos)
      }

      const pagamentoData: Omit<Pagamento, "id"> = {
        tipo,
        finalidade: form.finalidade,
        data: form.data || new Date().toISOString(),
        justificativa: form.justificativa,
        dadosPagamento: form.dadosPagamento,
        situacao: "pendente",
        situacaoOrder: 0,
        comprovantePagamento: comprovantePagamentoUrl,
        boletoPdf: boletoPdfUrl,
        dataVencimento: form.dataVencimento,
        formaPagamento: formaPagamento,
        criadoPor: user?.name || "",
        anexos: anexosUrls,
      }

      const cleanPagamentoData = removeUndefinedFields(pagamentoData)
      await addPagamento(cleanPagamentoData)
      toast.success("Pagamento criado com sucesso!")
      router.push("/pagamentos")
    } catch (error) {
      console.error("Erro ao salvar pagamento:", error)
      toast.error("Erro ao salvar pagamento")
    } finally {
      setIsLoading(false)
    }
  }

  if (!user) {
    return null
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
            <form onSubmit={handleSubmit} className="space-y-4">
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
              
              {tipo === "reembolso" && (
                <>
                  <div>
                    <label className="block mb-1 font-medium">Finalidade do pagamento</label>
                    <Textarea name="finalidade" placeholder="Descreva a finalidade" value={form.finalidade} onChange={handleInputChange} />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">Data</label>
                    <Input name="data" type="date" value={form.data} onChange={handleInputChange} />
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
                    <label className="block mb-1 font-medium">Comprovante de pagamento</label>
                    <Input 
                      name="comprovantePagamento" 
                      type="file" 
                      accept="image/*,.pdf"
                      onChange={handleFileChange}
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Aceita arquivos PDF ou imagens (máximo 4MB)
                    </p>
                    {form.comprovantePagamento && (
                      <p className="text-sm text-green-600 mt-1">
                        Arquivo selecionado: {form.comprovantePagamento.name}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">Anexar arquivos (opcional)</label>
                    <Input
                      name="anexos"
                      type="file"
                      multiple
                      accept="image/*,application/pdf"
                      onChange={handleAnexosChange}
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Aceita imagens ou PDF (máximo 4MB cada)
                    </p>
                    {form.anexos.length > 0 && (
                      <ul className="text-sm text-green-600 mt-1">
                        {form.anexos.map((file, idx) => (
                          <li key={idx}>{file.name}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </>
              )}
              {tipo === "Agendado" && (
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
                  {formaPagamento === "pix" || formaPagamento === "cartao" ? (
                    <div>
                      <label className="block mb-1 font-medium">Dados para pagamento</label>
                      <Input name="dadosPagamento" placeholder={formaPagamento === "pix" ? "Chave PIX" : "Link para pagamento"} value={form.dadosPagamento} onChange={handleInputChange} />
                    </div>
                  ) : formaPagamento === "boleto" ? (
                    <div>
                      <label className="block mb-1 font-medium">Anexar boleto (PDF)</label>
                      <Input 
                        name="boletoPdf" 
                        type="file" 
                        accept="application/pdf"
                        onChange={handleFileChange}
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        Aceita apenas arquivos PDF (máximo 4MB)
                      </p>
                      {form.boletoPdf && (
                        <p className="text-sm text-green-600 mt-1">
                          Arquivo selecionado: {form.boletoPdf.name}
                        </p>
                      )}
                    </div>
                  ) : null}
                  <div>
                    <label className="block mb-1 font-medium">Anexar arquivos (opcional)</label>
                    <Input
                      name="anexos"
                      type="file"
                      multiple
                      accept="image/*,application/pdf"
                      onChange={handleAnexosChange}
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Aceita imagens ou PDF (máximo 4MB cada)
                    </p>
                    {form.anexos.length > 0 && (
                      <ul className="text-sm text-green-600 mt-1">
                        {form.anexos.map((file, idx) => (
                          <li key={idx}>{file.name}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </>
              )}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => router.push("/pagamentos")}>
                  Cancelar
                </Button>
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
