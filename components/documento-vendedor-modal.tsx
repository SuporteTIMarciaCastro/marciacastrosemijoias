"use client"

import type React from "react"
import { useEffect, useState } from "react"
import imageCompression from "browser-image-compression"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/context/auth-context"
import { Loader2, ShieldAlert } from "lucide-react"
import { addDocumentoVendedor } from "@/lib/firebase/documentos-vendedor"
import { registrarAuditoria } from "@/lib/firebase/auditoria"
import {
  uploadParaDrive,
  extensaoDoArquivo,
  PASTA_DRIVE_DOCUMENTOS_REVENDEDORAS,
} from "@/lib/google-drive"
import {
  DOCUMENTO_VENDEDOR_CODES,
  getDocumentoVendedorLabel,
  isDocumentoVendedorObrigatorio,
} from "@/lib/documento-vendedor"

interface DocumentoVendedorModalProps {
  isOpen: boolean
  onClose: () => void
  vendedorId: string
  vendedorNome: string
  /** pré-seleciona o tipo, usado pelos botões do checklist */
  tipoInicial?: string
  onSuccess: () => void
}

const MAX_FILE_SIZE_MB = 10
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

export default function DocumentoVendedorModal({
  isOpen,
  onClose,
  vendedorId,
  vendedorNome,
  tipoInicial,
  onSuccess,
}: DocumentoVendedorModalProps) {
  const [tipo, setTipo] = useState<string>(tipoInicial || DOCUMENTO_VENDEDOR_CODES[0])
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [mensagem, setMensagem] = useState<string | null>(null)
  const { toast } = useToast()
  const { user } = useAuth()

  useEffect(() => {
    if (!isOpen) return
    setTipo(tipoInicial || DOCUMENTO_VENDEDOR_CODES[0])
    setArquivo(null)
  }, [isOpen, tipoInicial])

  const handleArquivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast({
        title: "Arquivo muito grande",
        description: `O documento precisa ter no máximo ${MAX_FILE_SIZE_MB}MB.`,
        variant: "destructive",
      })
      e.target.value = ""
      return
    }
    setArquivo(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!arquivo) {
      toast({ title: "Erro", description: "Selecione o arquivo do documento.", variant: "destructive" })
      return
    }

    setIsSubmitting(true)
    try {
      setMensagem("Enviando documento...")

      let paraEnviar = arquivo
      if (arquivo.type.startsWith("image/")) {
        try {
          paraEnviar = await imageCompression(arquivo, {
            maxSizeMB: 2,
            maxWidthOrHeight: 2400,
            useWebWorker: true,
            initialQuality: 0.75,
          })
        } catch (error) {
          console.error("Erro ao comprimir documento:", error)
        }
      }

      // Nome sem dado pessoal: ele fica visível para quem lista a pasta no
      // Drive, mesmo sem abrir o conteúdo.
      const nomeArquivo = `vendedor_${vendedorId}_${tipo}_${Date.now()}`
      const nomeFinal = `${nomeArquivo}.${extensaoDoArquivo(arquivo.name)}`

      const driveUrl = await uploadParaDrive(paraEnviar, PASTA_DRIVE_DOCUMENTOS_REVENDEDORAS, {
        // Documento pessoal não é tornado público: herda a permissão da pasta.
        publico: false,
        nomeArquivo,
      })

      await addDocumentoVendedor({
        vendedorId,
        tipo,
        driveUrl,
        nomeArquivo: nomeFinal,
        tamanhoBytes: paraEnviar.size,
        enviadoPorEmail: user?.email || "",
        enviadoPorNome: user?.name || "",
      })

      await registrarAuditoria({
        acao: "documento.enviar",
        entidade: "vendedor",
        entidadeId: vendedorId,
        descricao: `${getDocumentoVendedorLabel(tipo)} enviado para o representante ${vendedorNome}.`,
        usuarioEmail: user?.email || "",
        usuarioNome: user?.name || "",
      })

      toast({
        title: "Documento enviado",
        description: `${getDocumentoVendedorLabel(tipo)} registrado com sucesso.`,
      })
      onSuccess()
      onClose()
    } catch (error) {
      console.error("Erro ao enviar documento:", error)
      toast({
        title: "Erro",
        description: "Não foi possível enviar o documento. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setMensagem(null)
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Documento do Representante</DialogTitle>
          </DialogHeader>

          <div className="flex gap-2 rounded-md border bg-secondary/40 p-3 text-xs text-muted-foreground">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <div>
              O arquivo vai para a pasta restrita do Drive e <strong>não fica público</strong>. Só
              quem tem acesso àquela pasta consegue abrir o documento.
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tipoDocVendedor">Tipo de documento</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENTO_VENDEDOR_CODES.map((codigo) => (
                    <SelectItem key={codigo} value={codigo}>
                      {getDocumentoVendedorLabel(codigo)}
                      {isDocumentoVendedorObrigatorio(codigo) ? " *" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">* documento obrigatório</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="arquivoDocVendedor">Arquivo</Label>
              <Input
                id="arquivoDocVendedor"
                type="file"
                accept="image/*,.pdf"
                onChange={handleArquivo}
                disabled={isSubmitting}
                className="cursor-pointer"
              />
              {arquivo && <p className="text-xs text-green-600">{arquivo.name}</p>}
              <p className="text-xs text-muted-foreground">
                Imagem ou PDF, no máximo {MAX_FILE_SIZE_MB}MB. Enviar de novo o mesmo tipo cria uma
                nova versão — a anterior é preservada no histórico.
              </p>
            </div>

            <div className="flex justify-end gap-4 pt-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Enviando..." : "Enviar Documento"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {mensagem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
          <div className="flex w-[320px] flex-col items-center gap-3 rounded-lg bg-card p-6 text-center shadow-2xl">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">{mensagem}</p>
          </div>
        </div>
      )}
    </>
  )
}
