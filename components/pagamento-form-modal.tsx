"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { updatePagamento, fetchPagamento, Pagamento } from "@/lib/firebase/pagamentos"
import { toast } from "sonner"
import { useAuth } from "@/context/auth-context"

const tiposPagamento = [
  { value: "reembolso", label: "Reembolso" },
  { value: "Agendado", label: "Agendado" },
]

const situacoes = [
  { value: "pendente", label: "Pendente", color: "text-yellow-600" },
  { value: "autorizado", label: "Autorizado", color: "text-green-600" },
  { value: "rejeitado", label: "Rejeitado", color: "text-red-600" },
]

interface FormData {
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

interface PagamentoFormModalProps {
  isOpen: boolean
  onClose: () => void
  pagamentoId: string | null
  onSuccess: () => void
}

export default function PagamentoFormModal({ isOpen, onClose, pagamentoId, onSuccess }: PagamentoFormModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [tipo, setTipo] = useState("reembolso")
  const [showBoletoPdf, setShowBoletoPdf] = useState(false)
  const [formaPagamento, setFormaPagamento] = useState("")
  const [form, setForm] = useState<FormData>({
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

  const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

  const { user } = useAuth()

  useEffect(() => {
    if (isOpen && pagamentoId) {
      loadPagamento()
    }
  }, [isOpen, pagamentoId])

  async function loadPagamento() {
    try {
      const pagamento = await fetchPagamento(pagamentoId!)
      if (pagamento) {
        setTipo(pagamento.tipo)
        setFormaPagamento(pagamento.formaPagamento || "")
        setForm({
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
    if (file.size > MAX_FILE_SIZE) {
      if (file.type.startsWith('image/')) {
        try {
          return await compressImage(file)
        } catch (error) {
          throw new Error(`Arquivo muito grande (${(file.size / 1024 / 1024).toFixed(2)}MB). Tamanho máximo permitido: 5MB`)
        }
      } else {
        throw new Error(`Arquivo muito grande (${(file.size / 1024 / 1024).toFixed(2)}MB). Tamanho máximo permitido: 5MB`)
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
        toast.error(`Arquivo muito grande (${(file.size / 1024 / 1024).toFixed(2)}MB). Tamanho máximo permitido: 5MB`)
        e.target.value = ''
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

    Object.keys(result).forEach(key => {
      if (!requiredFields.includes(key) && result[key as keyof typeof result] === undefined) {
        delete result[key as keyof typeof result]
      }
    })

    return result
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)

    try {
      let comprovantePagamentoUrl: string | undefined
      if (form.comprovantePagamento instanceof File) {
        comprovantePagamentoUrl = await uploadFileToDrive(form.comprovantePagamento)
      }

      let comprovanteDevolucaoUrl: string | undefined
      if (form.comprovanteDevolucao instanceof File) {
        comprovanteDevolucaoUrl = await uploadFileToDrive(form.comprovanteDevolucao)
      }

      const boletoPdfBase64 = form.boletoPdf instanceof File
        ? await convertFileToBase64(form.boletoPdf)
        : form.boletoPdf

      const pagamentoData: Omit<Pagamento, "id"> = {
        tipo,
        finalidade: form.finalidade,
        data: form.data || new Date().toISOString(),
        justificativa: form.justificativa,
        dadosPagamento: form.dadosPagamento,
        situacao: form.situacao,
        situacaoOrder: form.situacao === "pendente" ? 0 : 1,
        comprovantePagamento: comprovantePagamentoUrl,
        comprovanteDevolucao: comprovanteDevolucaoUrl,
        boletoPdf: boletoPdfBase64,
        dataVencimento: form.dataVencimento,
      }

      const cleanPagamentoData = removeUndefinedFields(pagamentoData)

      if (pagamentoId) {
        await updatePagamento(pagamentoId, cleanPagamentoData)
        toast.success("Pagamento atualizado com sucesso!")
      }
      
      onSuccess()
      onClose()
    } catch (error) {
      console.error("Erro ao salvar pagamento:", error)
      toast.error("Erro ao salvar pagamento")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Pagamento</DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          <div className="mb-4">
            <label className="block mb-1 font-medium">Tipo de Pagamento</label>
            <div className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background">
              <span className="text-muted-foreground">{tiposPagamento.find(tp => tp.value === tipo)?.label}</span>
            </div>
          </div>
          {(user?.permissions?.pagamentos?.editar_basico || user?.permissions?.pagamentos?.editar) ? (
            <form className="space-y-4" onSubmit={handleSubmit}>
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
                  {user?.permissions?.pagamentos?.editar && (
                    <div>
                      <label className="block mb-1 font-medium">Justificativa</label>
                      <Textarea name="justificativa" placeholder="Justifique o pagamento" value={form.justificativa} onChange={handleInputChange} />
                    </div>
                  )}
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
                      Aceita arquivos PDF ou imagens (máximo 900KB)
                    </p>
                    {form.comprovantePagamento && (
                      <div className="mt-1">
                        {form.comprovantePagamento instanceof File ? (
                          <p className="text-sm text-green-600">
                            Arquivo selecionado: {form.comprovantePagamento.name}
                          </p>
                        ) : (
                          <a
                            href={form.comprovantePagamento}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            Ver comprovante no Google Drive
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                  {user?.permissions?.pagamentos?.editar && (
                    <>
                      <div>
                        <label className="block mb-1 font-medium">Situação</label>
                        <Select value={form.situacao} onValueChange={(v) => handleSelectChange("situacao", v)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a situação">
                              {form.situacao && (
                                <span className={situacoes.find(s => s.value === form.situacao)?.color}>
                                  {situacoes.find(s => s.value === form.situacao)?.label}
                                </span>
                              )}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {situacoes.map((s) => (
                              <SelectItem key={s.value} value={s.value} className={s.color}>
                                {s.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="block mb-1 font-medium">Comprovante de devolução</label>
                        <Input 
                          name="comprovanteDevolucao" 
                          type="file" 
                          accept="image/*,.pdf"
                          onChange={handleFileChange}
                        />
                        <p className="text-sm text-muted-foreground mt-1">
                          Aceita arquivos PDF ou imagens (máximo 900KB)
                        </p>
                        {form.comprovanteDevolucao && (
                          <div className="mt-1">
                            {form.comprovanteDevolucao instanceof File ? (
                              <p className="text-sm text-green-600">
                                Arquivo selecionado: {form.comprovanteDevolucao.name}
                              </p>
                            ) : (
                              <a
                                href={form.comprovanteDevolucao}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                              >
                                Ver comprovante de devolução no Google Drive
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </>
              )}
              {tipo === "Agendado" && (
                <>
                  <div>
                    <label className="block mb-1 font-medium">Forma de Pagamento</label>
                    <div className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background">
                      <span className="text-muted-foreground capitalize">{formaPagamento}</span>
                    </div>
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">Finalidade do pagamento</label>
                    <Textarea name="finalidade" placeholder="Descreva a finalidade" value={form.finalidade} onChange={handleInputChange} />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">Data de vencimento</label>
                    <Input name="dataVencimento" type="date" value={form.dataVencimento} onChange={handleInputChange} />
                  </div>
                  {user?.permissions?.pagamentos?.editar && (
                    <div>
                      <label className="block mb-1 font-medium">Justificativa</label>
                      <Textarea name="justificativa" placeholder="Justifique o pagamento" value={form.justificativa} onChange={handleInputChange} />
                    </div>
                  )}
                  {(formaPagamento === "pix" || formaPagamento === "cartao") ? (
                    <div>
                      <label className="block mb-1 font-medium">Dados para pagamento</label>
                      <Input name="dadosPagamento" placeholder={formaPagamento === "pix" ? "Chave PIX" : "Link para pagamento"} value={form.dadosPagamento} onChange={handleInputChange} />
                    </div>
                  ) : null}
                  {formaPagamento === "boleto" ? (
                    <>
                      <div>
                        <label className="block mb-1 font-medium">Anexar boleto (PDF)</label>
                        <Input 
                          name="boletoPdf" 
                          type="file" 
                          accept="application/pdf"
                          onChange={handleFileChange}
                        />
                        <p className="text-sm text-muted-foreground mt-1">
                          Aceita apenas arquivos PDF (máximo 900KB)
                        </p>
                        {form.boletoPdf && (
                          <div className="mt-1">
                            {form.boletoPdf instanceof File ? (
                              <p className="text-sm text-green-600">
                                Arquivo selecionado: {form.boletoPdf.name}
                              </p>
                            ) : (
                              <a
                                href={form.boletoPdf}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                              >
                                Ver boleto no Google Drive
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block mb-1 font-medium">Comprovante de pagamento</label>
                        <Input 
                          name="comprovantePagamento" 
                          type="file" 
                          accept="image/*,.pdf"
                          onChange={handleFileChange}
                        />
                        <p className="text-sm text-muted-foreground mt-1">
                          Aceita arquivos PDF ou imagens (máximo 900KB)
                        </p>
                        {form.comprovantePagamento && (
                          <div className="mt-1">
                            {form.comprovantePagamento instanceof File ? (
                              <p className="text-sm text-green-600">
                                Arquivo selecionado: {form.comprovantePagamento.name}
                              </p>
                            ) : (
                              <a
                                href={form.comprovantePagamento}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                              >
                                Ver comprovante no Google Drive
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </>
                  ) : null}
                  {user?.permissions?.pagamentos?.editar && (
                    <>
                      <div>
                        <label className="block mb-1 font-medium">Situação</label>
                        <Select value={form.situacao} onValueChange={(v) => handleSelectChange("situacao", v)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a situação">
                              {form.situacao && (
                                <span className={situacoes.find(s => s.value === form.situacao)?.color}>
                                  {situacoes.find(s => s.value === form.situacao)?.label}
                                </span>
                              )}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {situacoes.map((s) => (
                              <SelectItem key={s.value} value={s.value} className={s.color}>
                                {s.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="block mb-1 font-medium">Comprovante de devolução</label>
                        <Input 
                          name="comprovanteDevolucao" 
                          type="file" 
                          accept="image/*,.pdf"
                          onChange={handleFileChange}
                        />
                        <p className="text-sm text-muted-foreground mt-1">
                          Aceita arquivos PDF ou imagens (máximo 900KB)
                        </p>
                        {form.comprovanteDevolucao && (
                          <div className="mt-1">
                            {form.comprovanteDevolucao instanceof File ? (
                              <p className="text-sm text-green-600">
                                Arquivo selecionado: {form.comprovanteDevolucao.name}
                              </p>
                            ) : (
                              <a
                                href={form.comprovanteDevolucao}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                              >
                                Ver comprovante de devolução no Google Drive
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </>
              )}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </form>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              Você não tem permissão para editar este pagamento.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
} 