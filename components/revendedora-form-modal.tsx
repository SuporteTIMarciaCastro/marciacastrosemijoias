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
import {
  addRevendedora,
  updateRevendedora,
  fetchRevendedora,
  findRevendedoraByCpf,
} from "@/lib/firebase/revendedoras"
import { fetchVendedores } from "@/lib/firebase/vendedores"
import { isValidCpf, maskCpfInput, normalizeCpf } from "@/lib/cpf"
import type { Vendedor } from "@/types"
import {
  REVENDEDORA_STATUS_CODES,
  REVENDEDORA_STATUS_PADRAO,
  getRevendedoraStatusLabel,
} from "@/lib/revendedora-status"
import { registrarAuditoria } from "@/lib/firebase/auditoria"
import { calcularAlteracoes, formatarMoedaAuditoria, type CampoAuditavel } from "@/lib/auditoria"

interface RevendedoraFormModalProps {
  isOpen: boolean
  onClose: () => void
  revendedoraId?: string // se fornecido, é edição
  onSuccess: () => void
}

const formInicial = {
  nome: "",
  cpf: "",
  rg: "",
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  uf: "",
  whatsapp: "",
  vendedorId: "",
  vendedorResponsavel: "",
  status: REVENDEDORA_STATUS_PADRAO,
  limiteConsignado: "",
  prazoPadraoDias: "30",
}

// Valor do Select quando nenhum vendedor está selecionado. O Select do Radix não
// aceita string vazia como value de item.
const SEM_VENDEDOR = "__sem_vendedor__"

// Campos acompanhados pelo log de auditoria.
const CAMPOS_REVENDEDORA: CampoAuditavel[] = [
  { chave: "nome", rotulo: "Nome" },
  { chave: "cpf", rotulo: "CPF" },
  { chave: "rg", rotulo: "RG" },
  { chave: "whatsapp", rotulo: "WhatsApp" },
  { chave: "status", rotulo: "Status", formatar: (v) => getRevendedoraStatusLabel(v) || "(vazio)" },
  { chave: "limiteConsignado", rotulo: "Limite consignado", formatar: formatarMoedaAuditoria },
  { chave: "prazoPadraoDias", rotulo: "Prazo padrão (dias)" },
  { chave: "vendedorResponsavel", rotulo: "Vendedor responsável" },
  { chave: "cep", rotulo: "CEP" },
  { chave: "logradouro", rotulo: "Logradouro" },
  { chave: "numero", rotulo: "Número" },
  { chave: "complemento", rotulo: "Complemento" },
  { chave: "bairro", rotulo: "Bairro" },
  { chave: "cidade", rotulo: "Cidade" },
  { chave: "uf", rotulo: "UF" },
]

// Máscara de celular, mesmo formato usado no formulário de garantia.
const maskWhatsapp = (value: string) => {
  const num = value.replace(/\D/g, "").slice(0, 11)
  if (num.length <= 2) return num
  if (num.length <= 7) return `(${num.slice(0, 2)}) ${num.slice(2)}`
  return `(${num.slice(0, 2)}) ${num.slice(2, 7)}-${num.slice(7)}`
}

const maskCep = (value: string) => {
  const num = value.replace(/\D/g, "").slice(0, 8)
  if (num.length <= 5) return num
  return `${num.slice(0, 5)}-${num.slice(5)}`
}

export default function RevendedoraFormModal({
  isOpen,
  onClose,
  revendedoraId,
  onSuccess,
}: RevendedoraFormModalProps) {
  const [formData, setFormData] = useState(formInicial)
  const [vendedores, setVendedores] = useState<Vendedor[]>([])
  const [original, setOriginal] = useState<Record<string, any> | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth()

  // Carrega os vendedores toda vez que o modal abre, para a lista estar sempre
  // atualizada com o que foi cadastrado na aba Vendedores.
  useEffect(() => {
    if (!isOpen) return
    fetchVendedores()
      .then(setVendedores)
      .catch((error) => {
        console.error("Erro ao carregar vendedores:", error)
        setVendedores([])
      })
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return

    if (!revendedoraId) {
      setFormData(formInicial)
      setOriginal(null)
      return
    }

    setIsLoading(true)
    fetchRevendedora(revendedoraId)
      .then((item) => {
        if (!item) return
        // Guarda o estado anterior para o diff do log de auditoria.
        setOriginal(item)
        setFormData({
          nome: item.nome || "",
          cpf: maskCpfInput(item.cpf || ""),
          rg: item.rg || "",
          cep: maskCep(item.cep || ""),
          logradouro: item.logradouro || "",
          numero: item.numero || "",
          complemento: item.complemento || "",
          bairro: item.bairro || "",
          cidade: item.cidade || "",
          uf: item.uf || "",
          whatsapp: maskWhatsapp(item.whatsapp || ""),
          vendedorId: item.vendedorId || "",
          vendedorResponsavel: item.vendedorResponsavel || "",
          status: item.status || REVENDEDORA_STATUS_PADRAO,
          limiteConsignado:
            typeof item.limiteConsignado === "number" ? String(item.limiteConsignado) : "",
          prazoPadraoDias:
            typeof item.prazoPadraoDias === "number" ? String(item.prazoPadraoDias) : "30",
        })
      })
      .catch((error) => {
        console.error("Erro ao carregar revendedora:", error)
        toast({
          title: "Erro",
          description: "Não foi possível carregar os dados da revendedora",
          variant: "destructive",
        })
      })
      .finally(() => setIsLoading(false))
  }, [revendedoraId, isOpen, toast])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    let novoValor = value

    if (name === "cpf") novoValor = maskCpfInput(value)
    else if (name === "whatsapp") novoValor = maskWhatsapp(value)
    else if (name === "cep") novoValor = maskCep(value)
    else if (name === "uf") novoValor = value.toUpperCase().slice(0, 2)

    setFormData((prev) => ({ ...prev, [name]: novoValor }))
  }

  const vendedorSelecionado = formData.vendedorId
    ? vendedores.find((v) => v.id === formData.vendedorId)
    : undefined

  // Lista do Select: só os ativos, mais o vendedor já vinculado quando ele
  // estiver inativo — senão o campo abriria vazio e o vínculo se perderia.
  const opcoesVendedores = (() => {
    const ativos = vendedores.filter((v) => v.status === "ativo")
    if (vendedorSelecionado && vendedorSelecionado.status !== "ativo") {
      return [vendedorSelecionado, ...ativos]
    }
    return ativos
  })()

  // Registro legado: tem texto livre gravado, mas nenhum vínculo.
  const temVendedorLegado = !formData.vendedorId && formData.vendedorResponsavel.trim() !== ""

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.nome.trim()) {
      toast({ title: "Erro", description: "Informe o nome da revendedora.", variant: "destructive" })
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

    const limiteTexto = formData.limiteConsignado.replace(",", ".").trim()
    const limiteConsignado = limiteTexto === "" ? 0 : Number(limiteTexto)
    if (!Number.isFinite(limiteConsignado) || limiteConsignado < 0) {
      toast({
        title: "Limite inválido",
        description: "Informe um valor numérico para o limite consignado.",
        variant: "destructive",
      })
      return
    }

    const prazoPadrao = Number(formData.prazoPadraoDias.trim() || "30")
    if (!Number.isFinite(prazoPadrao) || prazoPadrao <= 0) {
      toast({
        title: "Prazo inválido",
        description: "O prazo padrão do ciclo precisa ser um número de dias maior que zero.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      // CPF único: consulta antes de gravar. Na edição, ignora a própria revendedora.
      const duplicada = await findRevendedoraByCpf(formData.cpf, revendedoraId)
      if (duplicada) {
        toast({
          title: "CPF já cadastrado",
          description: `Este CPF já pertence à revendedora "${duplicada.nome}".`,
          variant: "destructive",
        })
        setIsSubmitting(false)
        return
      }

      const dados = {
        nome: formData.nome,
        cpf: normalizeCpf(formData.cpf),
        rg: formData.rg.trim(),
        cep: formData.cep,
        logradouro: formData.logradouro.trim(),
        numero: formData.numero.trim(),
        complemento: formData.complemento.trim(),
        bairro: formData.bairro.trim(),
        cidade: formData.cidade.trim(),
        uf: formData.uf,
        whatsapp: formData.whatsapp,
        // Grava o vínculo (vendedorId) e o nome no momento do salvamento.
        // Sem vendedor escolhido, preserva o texto legado como estava.
        vendedorId: formData.vendedorId,
        vendedorResponsavel: vendedorSelecionado
          ? vendedorSelecionado.nome
          : formData.vendedorResponsavel.trim(),
        status: formData.status,
        limiteConsignado,
        prazoPadraoDias: prazoPadrao,
      }

      const autoria = { usuarioEmail: user?.email || "", usuarioNome: user?.name || "" }

      if (revendedoraId) {
        await updateRevendedora(revendedoraId, dados)
        toast({ title: "Sucesso", description: "Revendedora atualizada com sucesso!" })
        // O estado anterior já está carregado (o modal usou para preencher o
        // formulário), então o diff sai sem nenhuma leitura extra.
        await registrarAuditoria({
          acao: "revendedora.editar",
          entidade: "revendedora",
          entidadeId: revendedoraId,
          revendedoraId,
          descricao: `Cadastro de ${dados.nome} editado.`,
          alteracoes: calcularAlteracoes(original, dados, CAMPOS_REVENDEDORA),
          ...autoria,
        })
      } else {
        const novoId = await addRevendedora({ ...dados, criadoPor: user?.email || "" })
        toast({ title: "Sucesso", description: "Revendedora cadastrada com sucesso!" })
        await registrarAuditoria({
          acao: "revendedora.criar",
          entidade: "revendedora",
          entidadeId: novoId,
          revendedoraId: novoId,
          descricao: `Revendedora ${dados.nome} cadastrada.`,
          ...autoria,
        })
      }

      onSuccess()
      onClose()
    } catch (error) {
      console.error("Erro ao salvar revendedora:", error)
      toast({
        title: "Erro",
        description: `Não foi possível ${revendedoraId ? "atualizar" : "cadastrar"} a revendedora. Tente novamente.`,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{revendedoraId ? "Editar Revendedora" : "Adicionar Revendedora"}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <p>Carregando...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nome">
                  Nome <span className="text-red-500">*</span>
                </Label>
                <Input id="nome" name="nome" value={formData.nome} onChange={handleInputChange} required />
              </div>
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
                <Label htmlFor="rg">RG</Label>
                <Input id="rg" name="rg" value={formData.rg} onChange={handleInputChange} />
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
            </div>

            <div className="pt-2 text-sm font-medium text-foreground/80">Endereço</div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cep">CEP</Label>
                <Input id="cep" name="cep" value={formData.cep} onChange={handleInputChange} placeholder="00000-000" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="logradouro">Logradouro</Label>
                <Input id="logradouro" name="logradouro" value={formData.logradouro} onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="numero">Número</Label>
                <Input id="numero" name="numero" value={formData.numero} onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="complemento">Complemento</Label>
                <Input id="complemento" name="complemento" value={formData.complemento} onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bairro">Bairro</Label>
                <Input id="bairro" name="bairro" value={formData.bairro} onChange={handleInputChange} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="cidade">Cidade</Label>
                <Input id="cidade" name="cidade" value={formData.cidade} onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="uf">UF</Label>
                <Input id="uf" name="uf" value={formData.uf} onChange={handleInputChange} placeholder="PI" />
              </div>
            </div>

            <div className="pt-2 text-sm font-medium text-foreground/80">Revenda</div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vendedorId">Vendedor Responsável</Label>
                <Select
                  value={formData.vendedorId || SEM_VENDEDOR}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      vendedorId: value === SEM_VENDEDOR ? "" : value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o vendedor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SEM_VENDEDOR}>Nenhum</SelectItem>
                    {opcoesVendedores.map((vendedor) => (
                      <SelectItem key={vendedor.id} value={vendedor.id}>
                        {vendedor.nome}
                        {vendedor.status !== "ativo" ? " (inativo)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {temVendedorLegado && (
                  <p className="text-xs text-muted-foreground">
                    Cadastro anterior: <strong>{formData.vendedorResponsavel}</strong>. Continua
                    salvo enquanto nenhum vendedor for selecionado.
                  </p>
                )}
                {vendedores.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Nenhum vendedor cadastrado ainda — cadastre na aba Vendedores.
                  </p>
                )}
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
                    {REVENDEDORA_STATUS_CODES.map((codigo) => (
                      <SelectItem key={codigo} value={codigo}>
                        {getRevendedoraStatusLabel(codigo)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="limiteConsignado">Limite Consignado (R$)</Label>
                <Input
                  id="limiteConsignado"
                  name="limiteConsignado"
                  value={formData.limiteConsignado}
                  onChange={handleInputChange}
                  placeholder="0,00"
                  inputMode="decimal"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prazoPadraoDias">Prazo padrão do ciclo (dias)</Label>
                <Input
                  id="prazoPadraoDias"
                  name="prazoPadraoDias"
                  value={formData.prazoPadraoDias}
                  onChange={handleInputChange}
                  placeholder="30"
                  inputMode="numeric"
                />
                <p className="text-xs text-muted-foreground">
                  Pré-preenche o formulário de entrega. Ainda dá para ajustar em cada ciclo.
                </p>
              </div>
            </div>

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
  )
}
