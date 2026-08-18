"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/context/auth-context"
import { collection, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase/config"
import { addVendedor, updateVendedor, fetchVendedor, findVendedorByCpf } from "@/lib/firebase/vendedores"
import { isValidCpf, maskCpfInput, normalizeCpf } from "@/lib/cpf"
import {
  VENDEDOR_STATUS_CODES,
  VENDEDOR_STATUS_PADRAO,
  getVendedorStatusLabel,
} from "@/lib/vendedor-status"
import { registrarAuditoria } from "@/lib/firebase/auditoria"
import { calcularAlteracoes, type CampoAuditavel } from "@/lib/auditoria"
import DocumentoVendedorModal from "@/components/documento-vendedor-modal"
import { fetchDocumentosByVendedor } from "@/lib/firebase/documentos-vendedor"
import {
  DOCUMENTO_VENDEDOR_CODES,
  agruparDocumentosVendedor,
  documentosVendedorPendentes,
  getDocumentoVendedorLabel,
  isDocumentoVendedorObrigatorio,
} from "@/lib/documento-vendedor"
import type { DocumentoVendedor } from "@/types"
import { Check, AlertTriangle, FileText, ChevronDown, ChevronRight } from "lucide-react"

interface VendedorFormModalProps {
  isOpen: boolean
  onClose: () => void
  vendedorId?: string // se fornecido, é edição
  onSuccess: () => void
  /** Nomes das revendedoras vinculadas a este vendedor (calculado na página) */
  revendedorasVinculadas?: string[]
}

const formInicial = {
  nome: "",
  cpf: "",
  whatsapp: "",
  usuarioEmail: "",
  status: VENDEDOR_STATUS_PADRAO,
}

// Radix não aceita string vazia como value de item.
const SEM_USUARIO = "__sem_usuario__"

// Campos acompanhados pelo log de auditoria.
const CAMPOS_VENDEDOR: CampoAuditavel[] = [
  { chave: "nome", rotulo: "Nome" },
  { chave: "cpf", rotulo: "CPF" },
  { chave: "whatsapp", rotulo: "WhatsApp" },
  { chave: "usuarioEmail", rotulo: "Usuário vinculado" },
  { chave: "status", rotulo: "Status", formatar: (v) => getVendedorStatusLabel(v) || "(vazio)" },
]

const maskWhatsapp = (value: string) => {
  const num = value.replace(/\D/g, "").slice(0, 11)
  if (num.length <= 2) return num
  if (num.length <= 7) return `(${num.slice(0, 2)}) ${num.slice(2)}`
  return `(${num.slice(0, 2)}) ${num.slice(2, 7)}-${num.slice(7)}`
}

export default function VendedorFormModal({
  isOpen,
  onClose,
  vendedorId,
  onSuccess,
  revendedorasVinculadas = [],
}: VendedorFormModalProps) {
  const [formData, setFormData] = useState(formInicial)
  const [usuarios, setUsuarios] = useState<{ email: string; name?: string }[]>([])
  const [original, setOriginal] = useState<Record<string, any> | null>(null)
  const [documentos, setDocumentos] = useState<DocumentoVendedor[]>([])
  const [modalDocumento, setModalDocumento] = useState(false)
  const [tipoDocInicial, setTipoDocInicial] = useState<string | undefined>(undefined)
  const [historicoAberto, setHistoricoAberto] = useState<Record<string, boolean>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth()

  // Lista de usuários do sistema para o vínculo. Select em vez de campo livre:
  // e-mail digitado errado quebraria o vínculo em silêncio.
  useEffect(() => {
    if (!isOpen) return
    getDocs(collection(db, "users"))
      .then((snap) => {
        setUsuarios(
          snap.docs
            .map((d) => d.data() as { email?: string; name?: string })
            .filter((u): u is { email: string; name?: string } => !!u.email)
            .sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email))
        )
      })
      .catch((error) => {
        console.error("Erro ao carregar usuários:", error)
        setUsuarios([])
      })
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return

    if (!vendedorId) {
      setFormData(formInicial)
      setOriginal(null)
      setDocumentos([])
      return
    }

    carregarDocumentos()

    setIsLoading(true)
    fetchVendedor(vendedorId)
      .then((item) => {
        if (!item) return
        setOriginal(item)
        setFormData({
          nome: item.nome || "",
          cpf: maskCpfInput(item.cpf || ""),
          whatsapp: maskWhatsapp(item.whatsapp || ""),
          usuarioEmail: item.usuarioEmail || "",
          status: item.status || VENDEDOR_STATUS_PADRAO,
        })
      })
      .catch((error) => {
        console.error("Erro ao carregar vendedor:", error)
        toast({
          title: "Erro",
          description: "Não foi possível carregar os dados do vendedor",
          variant: "destructive",
        })
      })
      .finally(() => setIsLoading(false))
  }, [vendedorId, isOpen, toast])

  const carregarDocumentos = async () => {
    if (!vendedorId) return
    try {
      setDocumentos(await fetchDocumentosByVendedor(vendedorId))
    } catch (error) {
      console.error("Erro ao carregar documentos do vendedor:", error)
      setDocumentos([])
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    let novoValor = value
    if (name === "cpf") novoValor = maskCpfInput(value)
    else if (name === "whatsapp") novoValor = maskWhatsapp(value)
    setFormData((prev) => ({ ...prev, [name]: novoValor }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.nome.trim()) {
      toast({ title: "Erro", description: "Informe o nome do vendedor.", variant: "destructive" })
      return
    }

    if (!isValidCpf(formData.cpf)) {
      toast({
        title: "CPF inválido",
        description: "Confira o CPF digitado — os dígitos verificadores não conferem.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      const duplicado = await findVendedorByCpf(formData.cpf, vendedorId)
      if (duplicado) {
        toast({
          title: "CPF já cadastrado",
          description: `Este CPF já pertence ao vendedor "${duplicado.nome}".`,
          variant: "destructive",
        })
        setIsSubmitting(false)
        return
      }

      const dados = {
        nome: formData.nome,
        cpf: normalizeCpf(formData.cpf),
        whatsapp: formData.whatsapp,
        usuarioEmail: formData.usuarioEmail.trim().toLowerCase(),
        status: formData.status,
      }

      const autoria = { usuarioEmail: user?.email || "", usuarioNome: user?.name || "" }

      if (vendedorId) {
        await updateVendedor(vendedorId, dados)
        toast({ title: "Sucesso", description: "Vendedor atualizado com sucesso!" })
        await registrarAuditoria({
          acao: "vendedor.editar",
          entidade: "vendedor",
          entidadeId: vendedorId,
          descricao: `Cadastro do vendedor ${dados.nome} editado.`,
          alteracoes: calcularAlteracoes(original, dados, CAMPOS_VENDEDOR),
          ...autoria,
        })
      } else {
        const novoId = await addVendedor({ ...dados, criadoPor: user?.email || "" })
        toast({ title: "Sucesso", description: "Vendedor cadastrado com sucesso!" })
        await registrarAuditoria({
          acao: "vendedor.criar",
          entidade: "vendedor",
          entidadeId: novoId,
          descricao: `Vendedor ${dados.nome} cadastrado.`,
          ...autoria,
        })
      }

      onSuccess()
      onClose()
    } catch (error) {
      console.error("Erro ao salvar vendedor:", error)
      toast({
        title: "Erro",
        description: `Não foi possível ${vendedorId ? "atualizar" : "cadastrar"} o vendedor. Tente novamente.`,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Versão atual = primeiro de cada grupo, ordenado por data desc.
  const documentosPorTipo = agruparDocumentosVendedor(documentos)
  const pendentesVendedor = documentosVendedorPendentes(documentos)

  const abrirEnvio = (tipo?: string) => {
    setTipoDocInicial(tipo)
    setModalDocumento(true)
  }

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{vendedorId ? "Editar Vendedor" : "Adicionar Vendedor"}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <p>Carregando...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">
                Nome <span className="text-red-500">*</span>
              </Label>
              <Input id="nome" name="nome" value={formData.nome} onChange={handleInputChange} required />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cpf">
                  CPF <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="cpf"
                  name="cpf"
                  value={formData.cpf}
                  onChange={handleInputChange}
                  placeholder="000.000.000-00"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input
                  id="whatsapp"
                  name="whatsapp"
                  value={formData.whatsapp}
                  onChange={handleInputChange}
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    {VENDEDOR_STATUS_CODES.map((codigo) => (
                      <SelectItem key={codigo} value={codigo}>
                        {getVendedorStatusLabel(codigo)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="usuarioEmail">Usuário do sistema vinculado</Label>
              <Select
                value={formData.usuarioEmail || SEM_USUARIO}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    usuarioEmail: value === SEM_USUARIO ? "" : value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o usuário" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SEM_USUARIO}>Nenhum</SelectItem>
                  {usuarios.map((usuario) => (
                    <SelectItem key={usuario.email} value={usuario.email}>
                      {usuario.name ? `${usuario.name} — ${usuario.email}` : usuario.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Necessário apenas se este vendedor tiver login próprio e a permissão
                &quot;Somente as próprias revendedoras&quot;. É o vínculo que define a carteira dele.
              </p>
            </div>

            {vendedorId && (
              <div className="rounded-md border p-3">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-medium text-foreground/80">
                    Documentos do representante
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => abrirEnvio()}>
                    Enviar documento
                  </Button>
                </div>

                {pendentesVendedor.length > 0 ? (
                  <div className="mb-3 flex gap-2 rounded-md border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <div>
                      Faltando: {pendentesVendedor.map((t) => getDocumentoVendedorLabel(t)).join(", ")}.
                    </div>
                  </div>
                ) : (
                  <div className="mb-3 flex gap-2 rounded-md border border-green-300 bg-green-50 p-2.5 text-xs text-green-800 dark:border-green-700 dark:bg-green-950 dark:text-green-200">
                    <Check className="h-4 w-4 shrink-0" />
                    <span>Documentação completa.</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  {DOCUMENTO_VENDEDOR_CODES.map((tipo) => {
                    const versoes = documentosPorTipo.get(tipo) ?? []
                    const atual = versoes[0]
                    const anteriores = versoes.slice(1)
                    const obrigatorio = isDocumentoVendedorObrigatorio(tipo)
                    const aberto = historicoAberto[tipo]

                    return (
                      <div key={tipo} className="rounded border p-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="flex items-center gap-2 text-sm">
                            {atual ? (
                              <Check className="h-4 w-4 text-green-600" />
                            ) : obrigatorio ? (
                              <AlertTriangle className="h-4 w-4 text-amber-600" />
                            ) : (
                              <span className="h-4 w-4" />
                            )}
                            {getDocumentoVendedorLabel(tipo)}
                            {obrigatorio && <span className="text-red-500">*</span>}
                            {versoes.length > 1 && (
                              <span className="text-xs text-muted-foreground">v{versoes.length}</span>
                            )}
                          </span>

                          <span className="flex items-center gap-3">
                            {atual && (
                              <a
                                href={atual.driveUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                              >
                                <FileText className="h-3.5 w-3.5" />
                                Abrir
                              </a>
                            )}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() => abrirEnvio(tipo)}
                            >
                              {atual ? "Nova versão" : "Enviar"}
                            </Button>
                          </span>
                        </div>

                        {atual && (
                          <div className="mt-1 text-[11px] text-muted-foreground">
                            {new Date(atual.enviadoEm).toLocaleString("pt-BR")}
                            {atual.enviadoPorNome ? ` · ${atual.enviadoPorNome}` : ""}
                          </div>
                        )}

                        {anteriores.length > 0 && (
                          <div className="mt-1.5">
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800"
                              onClick={() =>
                                setHistoricoAberto((prev) => ({ ...prev, [tipo]: !prev[tipo] }))
                              }
                            >
                              {aberto ? (
                                <ChevronDown className="h-3 w-3" />
                              ) : (
                                <ChevronRight className="h-3 w-3" />
                              )}
                              ver versões anteriores ({anteriores.length})
                            </button>
                            {aberto && (
                              <ul className="mt-1 space-y-0.5 border-l pl-2.5 text-[11px] text-muted-foreground">
                                {anteriores.map((versao, indice) => (
                                  <li key={versao.id} className="flex items-center justify-between gap-2">
                                    <span>
                                      v{anteriores.length - indice} ·{" "}
                                      {new Date(versao.enviadoEm).toLocaleString("pt-BR")}
                                    </span>
                                    <a
                                      href={versao.driveUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:text-blue-800"
                                    >
                                      Abrir
                                    </a>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {vendedorId && (
              <div className="rounded-md border p-3">
                <div className="text-sm font-medium text-foreground/80">
                  Revendedoras vinculadas ({revendedorasVinculadas.length})
                </div>
                {revendedorasVinculadas.length === 0 ? (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Nenhuma revendedora vinculada a este vendedor.
                  </p>
                ) : (
                  <ul className="mt-2 max-h-40 overflow-y-auto space-y-1 text-sm text-muted-foreground">
                    {revendedorasVinculadas.map((nome) => (
                      <li key={nome}>• {nome.toUpperCase()}</li>
                    ))}
                  </ul>
                )}
                {formData.status === "inativo" && revendedorasVinculadas.length > 0 && (
                  <p className="mt-2 text-xs text-amber-600 dark:text-amber-500">
                    Vendedor inativo não aparece em novos cadastros, mas continua vinculado às
                    revendedoras acima.
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-end gap-4 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>

    {/* Envio de documento do representante, sobre o modal de cadastro */}
    {vendedorId && (
      <DocumentoVendedorModal
        isOpen={modalDocumento}
        onClose={() => {
          setModalDocumento(false)
          setTipoDocInicial(undefined)
        }}
        vendedorId={vendedorId}
        vendedorNome={formData.nome}
        tipoInicial={tipoDocInicial}
        onSuccess={carregarDocumentos}
      />
    )}
    </>
  )
}
