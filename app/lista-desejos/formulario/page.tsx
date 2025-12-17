"use client"

import type React from "react"

import { useState } from "react"
import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { addWishlistItem } from "@/lib/firebase/wishlist"
import { CheckCircle2 } from "lucide-react"
import { CompressibleImageInput } from "@/components/compressible-image-input"
// import { GoogleDriveUploader, UploadResult } from "@/google-drive-uploader-component/components/GoogleDriveUploader"

export default function FormularioDesejoPage() {
  const [formData, setFormData] = useState({
    nome: "",
    celular: "",
    email: "",
    produto: "",
    jaComprou: "Sim",
    lojaDestino: "",
    descricao: "",
    imagemUrl: "",
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [isCompressingImage, setIsCompressingImage] = useState(false)
  const [processingMessage, setProcessingMessage] = useState<string | null>(null)
  const [celularError, setCelularError] = useState("")
  const [jaComprouError, setJaComprouError] = useState("");
  const [lojaDestinoError, setLojaDestinoError] = useState("");
  const [imagemError, setImagemError] = useState("");
  const { toast } = useToast()

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    if (name === "celular") {
      // Máscara simples para o campo celular
      let cleaned = value.replace(/\D/g, "")
      let formatted = cleaned
      if (cleaned.length > 2) {
        formatted = `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`
      }
      if (cleaned.length > 7) {
        formatted = `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`
      }
      setFormData((prev) => ({ ...prev, [name]: formatted }))
      setCelularError("")
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }))
    }
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const uploadFileToDrive = async (file: File): Promise<string> => {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("folderId", "1dQYLq0i_h59A5ZOMI0a2JrdJ0Bu8IvBP") // ID da pasta da lista de desejos

    // Mostrar animação de upload enquanto o arquivo é processado
    setIsUploadingImage(true)
    setProcessingMessage("Enviando sua solicitação...")
    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Erro ao fazer upload do arquivo")
      }

      const result = await response.json()
      return result.fileUrl
    } finally {
      setProcessingMessage(null)
      setIsUploadingImage(false)
    }
  }

  const validateCelular = (celular: string) => {
    // Regex para (XX) XXXXX-XXXX
    return /^\(\d{2}\) \d{5}-\d{4}$/.test(celular)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    let hasError = false;

    if (!formData.jaComprou.trim()) {
      setJaComprouError("Selecione uma opção!");
      hasError = true;
    } else {
      setJaComprouError("");
    }

    if (!formData.lojaDestino.trim()) {
      setLojaDestinoError("Selecione uma loja!");
      hasError = true;
    } else {
      setLojaDestinoError("");
    }

    if (!selectedFile) {
      setImagemError("Selecione uma imagem do produto!");
      hasError = true;
    } else {
      setImagemError("");
    }

    // Validação de todos os campos obrigatórios
    if (!formData.nome.trim() || !formData.celular.trim() || !formData.email.trim() || !formData.produto.trim() || !formData.descricao.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive",
      })
      setIsSubmitting(false)
      return
    }

    if (hasError) {
      setIsSubmitting(false);
      return;
    }

    if (!validateCelular(formData.celular)) {
      setCelularError("O celular deve estar no formato (XX) XXXXX-XXXX")
      setIsSubmitting(false)
      return
    }

    try {
      let imagemUrl = ""
      if (selectedFile) {
        imagemUrl = await uploadFileToDrive(selectedFile)
      }

      const celularNumerico = formData.celular.replace(/\D/g, "")

      await addWishlistItem({
        ...formData,
        celular: celularNumerico,
        nome: formData.nome.toLowerCase(), // Converter nome para lowercase
        imagemUrl,
        jaComprou: formData.jaComprou === "Sim",
        status: "Pendente",
        data: new Date().toISOString(),
      })

      toast({
        title: "Sucesso",
        description: "Seu pedido foi enviado com sucesso!",
      })

      setIsSuccess(true)
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível enviar seu pedido. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleNewRequest = () => {
    setFormData({
      nome: "",
      celular: "",
      email: "",
      produto: "",
      jaComprou: "Sim",
      lojaDestino: "",
      descricao: "",
      imagemUrl: "",
    })
    setSelectedFile(null)
    setImagePreview(null)
    setIsSuccess(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex justify-center">
          <Image src="/logo.png" alt="Marcia Castro Semijoias" width={150} height={150} priority />
        </div>

        {isSuccess ? (
          <Card className="border-green-200 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center text-center space-y-4">
                <div className="rounded-full bg-green-100 p-3">
                  <CheckCircle2 className="h-12 w-12 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-green-700">Pedido Enviado com Sucesso!</h2>
                <p className="text-gray-600 max-w-md">
                  Obrigado por enviar seu pedido, {formData.nome}! Recebemos sua solicitação para o produto{" "}
                  <span className="font-semibold">{formData.produto}</span> e entraremos em contato em breve através do
                  telefone ou email fornecido.
                </p>
                <div className="pt-4 space-y-2">
                  <Button onClick={handleNewRequest} className="w-full sm:w-auto">
                    Enviar Outro Pedido
                  </Button>
                  <p className="text-sm text-gray-500 pt-2">
                    Caso tenha alguma dúvida, entre em contato conosco pelo WhatsApp ou visite uma de nossas lojas.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">Lista de Desejos da Marcia Castro Semijoias</h1>
              <p className="text-gray-700 mb-4">
                Nós somos uma marca reconhecida por possuir peças elegantes e de alta qualidade, perfeitas para
                complementar qualquer look.
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Formulário de Solicitação</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nome">Nome:</Label>
                      <Input id="nome" name="nome" value={formData.nome} onChange={handleInputChange} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="celular">Celular:</Label>
                      <Input
                        id="celular"
                        name="celular"
                        value={formData.celular}
                        onChange={handleInputChange}
                        required
                        maxLength={15}
                        pattern="\(\d{2}\) \d{5}-\d{4}"
                        placeholder="(99) 99999-9999"
                      />
                      {celularError && <span className="text-red-500 text-xs">{celularError}</span>}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email:</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="produto">Qual produto você deseja solicitar:</Label>
                    <Input id="produto" name="produto" value={formData.produto} onChange={handleInputChange} required />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="jaComprou">Já comprou na loja?</Label>
                    <Select
                      value={formData.jaComprou}
                      onValueChange={(value) => {
                        handleSelectChange("jaComprou", value);
                        setJaComprouError("");
                      }}
                      required
                    >
                      <SelectTrigger className={jaComprouError ? "border-red-500" : ""}>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Sim">Sim</SelectItem>
                        <SelectItem value="Não">Não</SelectItem>
                      </SelectContent>
                    </Select>
                    {jaComprouError && <span className="text-red-500 text-xs">{jaComprouError}</span>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lojaDestino">Enviar solicitação para a seguinte loja:</Label>
                    <Select
                      value={formData.lojaDestino}
                      onValueChange={(value) => {
                        handleSelectChange("lojaDestino", value);
                        setLojaDestinoError("");
                      }}
                      required
                    >
                      <SelectTrigger className={lojaDestinoError ? "border-red-500" : ""}>
                        <SelectValue placeholder="Selecione uma loja" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Cocais Shopping">Cocais Shopping</SelectItem>
                        <SelectItem value="Parnaíba Shopping">Parnaíba Shopping</SelectItem>
                        <SelectItem value="Rio Anil Shopping">Rio Anil Shopping</SelectItem>
                        <SelectItem value="Rio Poty Shopping">Rio Poty Shopping</SelectItem>
                        <SelectItem value="Teresina Shopping">Teresina Shopping</SelectItem>
                      </SelectContent>
                    </Select>
                    {lojaDestinoError && <span className="text-red-500 text-xs">{lojaDestinoError}</span>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="imagem">Imagem do Produto:</Label>
                    <CompressibleImageInput
                      id="imagem"
                      required
                      previewSrc={imagePreview}
                      onPreviewChange={setImagePreview}
                      onFileProcessed={setSelectedFile}
                      onErrorMessageChange={setImagemError}
                      errorMessage={imagemError}
                      isUploading={isUploadingImage}
                      processingMessage={processingMessage}
                      onCompressingChange={setIsCompressingImage}
                      onProcessingMessageChange={setProcessingMessage}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="descricao">Descrição:</Label>
                    <Textarea
                      id="descricao"
                      name="descricao"
                      placeholder="Descreva o produto..."
                      value={formData.descricao}
                      onChange={handleInputChange}
                      className="min-h-[100px]"
                      required
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={isSubmitting || isCompressingImage}>
                    {isSubmitting ? "Enviando..." : "Enviar"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
