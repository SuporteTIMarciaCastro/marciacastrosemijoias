import { fetchAutenticado } from "@/lib/api-client"
import { extrairFileIdDrive } from "@/lib/google-drive"
import { formatCpf } from "@/lib/cpf"
import { getRevendedoraStatusLabel } from "@/lib/revendedora-status"
import {
  getStatusEfetivoCiclo,
  getCicloStatusLabel,
  getFormaPagamentoLabel,
  formatarDataBR,
} from "@/lib/ciclo-status"
import { getDocumentoTipoLabel, DOCUMENTOS_OBRIGATORIOS } from "@/lib/documento-revendedora"
import type { Ciclo, DocumentoRevendedora, Revendedora } from "@/types"

/**
 * Dossiê da revendedora em PDF: cadastro, documentos, ciclos, prestações e
 * pagamentos, com os documentos anexados embutidos.
 *
 * Os documentos vêm da rota autenticada /api/drive-download, porque sobem como
 * privados no Drive. Arquivos PDF não podem ser embutidos pelo jsPDF — desses
 * fica registrada a referência, com data e autor do envio.
 */

const moeda = (v?: number) =>
  typeof v === "number" ? v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—"

interface DadosDossie {
  revendedora: Revendedora
  ciclos: Ciclo[]
  documentos: DocumentoRevendedora[]
  geradoPor?: string
}

/** Busca o arquivo pela rota autenticada e converte para data URL. */
async function baixarComoDataUrl(
  driveUrl: string
): Promise<{ dataUrl: string; tipo: string } | null> {
  const fileId = extrairFileIdDrive(driveUrl)
  if (!fileId) return null

  try {
    const resposta = await fetchAutenticado(`/api/drive-download?fileId=${fileId}`)
    if (!resposta.ok) return null

    const blob = await resposta.blob()
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(blob)
    })
    return { dataUrl, tipo: blob.type }
  } catch (error) {
    console.error("Falha ao baixar documento para o dossiê:", error)
    return null
  }
}

export async function gerarDossiePDF({
  revendedora,
  ciclos,
  documentos,
  geradoPor,
}: DadosDossie): Promise<void> {
  const { jsPDF } = await import("jspdf")
  const doc = new jsPDF({ unit: "mm", format: "a4" })

  const M = 15 // margem
  const L = 210 - M * 2 // largura útil
  let y = M

  const novaPagina = () => {
    doc.addPage()
    y = M
  }
  const espaco = (n: number) => {
    if (y + n > 280) novaPagina()
  }

  const titulo = (texto: string) => {
    espaco(14)
    doc.setFontSize(13)
    doc.setFont("helvetica", "bold")
    doc.text(texto, M, y)
    y += 2
    doc.setDrawColor(200)
    doc.line(M, y, M + L, y)
    y += 6
  }

  const linha = (rotulo: string, valor: string) => {
    espaco(6)
    doc.setFontSize(9.5)
    doc.setFont("helvetica", "bold")
    doc.text(`${rotulo}:`, M, y)
    doc.setFont("helvetica", "normal")
    doc.text(valor || "—", M + 42, y)
    y += 5.5
  }

  // ---------- Capa ----------
  doc.setFontSize(20)
  doc.setFont("helvetica", "bold")
  doc.text("Dossiê da Revendedora", M, y + 4)
  y += 12
  doc.setFontSize(11)
  doc.setFont("helvetica", "normal")
  doc.text((revendedora.nome || "").toUpperCase(), M, y)
  y += 6
  doc.setFontSize(8.5)
  doc.setTextColor(120)
  doc.text(
    `Emitido em ${new Date().toLocaleString("pt-BR")}${geradoPor ? ` por ${geradoPor}` : ""} · Márcia Castro Semijoias`,
    M,
    y
  )
  doc.setTextColor(0)
  y += 10

  // ---------- Cadastro ----------
  titulo("Dados cadastrais")
  linha("CPF", formatCpf(revendedora.cpf))
  linha("RG", revendedora.rg || "—")
  linha("WhatsApp", revendedora.whatsapp || "—")
  linha("Status", getRevendedoraStatusLabel(revendedora.status))
  linha("Limite consignado", moeda(revendedora.limiteConsignado))
  linha("Prazo padrão", revendedora.prazoPadraoDias ? `${revendedora.prazoPadraoDias} dias` : "—")
  linha("Vendedor responsável", revendedora.vendedorResponsavel || "—")
  linha(
    "Endereço",
    [
      revendedora.logradouro,
      revendedora.numero,
      revendedora.bairro,
      revendedora.cidade,
      revendedora.uf,
      revendedora.cep,
    ]
      .filter(Boolean)
      .join(", ") || "—"
  )
  y += 4

  // ---------- Documentos ----------
  titulo("Documentação")
  const porTipo = new Map<string, DocumentoRevendedora[]>()
  for (const d of documentos) {
    const atual = porTipo.get(d.tipo) ?? []
    atual.push(d)
    porTipo.set(d.tipo, atual)
  }
  for (const lista of porTipo.values()) {
    lista.sort((a, b) => (b.enviadoEm || "").localeCompare(a.enviadoEm || ""))
  }

  for (const tipo of DOCUMENTOS_OBRIGATORIOS) {
    const versoes = porTipo.get(tipo) ?? []
    const atual = versoes[0]
    linha(
      getDocumentoTipoLabel(tipo),
      atual
        ? `enviado em ${new Date(atual.enviadoEm).toLocaleDateString("pt-BR")}` +
            `${atual.enviadoPorNome ? ` por ${atual.enviadoPorNome}` : ""}` +
            `${versoes.length > 1 ? ` (${versoes.length} versões)` : ""}`
        : "NÃO ENVIADO"
    )
  }
  y += 4

  // ---------- Ciclos ----------
  titulo("Ciclos de consignação")
  if (ciclos.length === 0) {
    doc.setFontSize(9.5)
    doc.text("Nenhum ciclo registrado.", M, y)
    y += 6
  }

  for (const ciclo of [...ciclos].sort((a, b) => a.numeroCiclo - b.numeroCiclo)) {
    espaco(40)
    doc.setFontSize(10.5)
    doc.setFont("helvetica", "bold")
    doc.text(
      `Ciclo ${ciclo.numeroCiclo} — ${getCicloStatusLabel(getStatusEfetivoCiclo(ciclo))}`,
      M,
      y
    )
    y += 5.5
    doc.setFont("helvetica", "normal")

    linha("Entrega", formatarDataBR(ciclo.dataEntrega))
    linha("Prazo", `${ciclo.prazoDias} dias`)
    linha("Vencimento", formatarDataBR(ciclo.dataEncerramentoPrevista))
    if (typeof ciclo.valorEntregue === "number") linha("Mercadoria", moeda(ciclo.valorEntregue))
    if (ciclo.vendedorEntregaNome) linha("Entregue por", ciclo.vendedorEntregaNome)
    if (ciclo.dataEncerramentoReal) linha("Encerrado em", formatarDataBR(ciclo.dataEncerramentoReal))

    for (const extra of ciclo.entregasAdicionais ?? []) {
      linha(
        "Entrega adicional",
        `${formatarDataBR(extra.dataEntrega)} · ${moeda(extra.valorEntregue)} · autorizada: ${extra.autorizacao?.justificativa || "—"}`
      )
    }

    const p = ciclo.prestacaoContas
    if (p) {
      linha("Vendido", moeda(p.valorVendido))
      linha("Devolvido", moeda(p.valorDevolvido))
      linha("Em falta", moeda(p.valorFalta))
      linha("Comissão", `${p.percentualComissao}% (${moeda(p.valorComissao)})`)
      linha("A repassar", moeda(p.valorRepassar))
      linha("Total pago", moeda(ciclo.totalPago ?? 0))
      linha("Saldo", moeda(Math.max(0, p.valorRepassar - (ciclo.totalPago ?? 0))))

      for (const pg of ciclo.pagamentos ?? []) {
        linha(
          "Pagamento",
          `${formatarDataBR(pg.data)} · ${moeda(pg.valor)} · ${getFormaPagamentoLabel(pg.forma)}`
        )
      }
    } else {
      linha("Prestação de contas", "não registrada")
    }
    y += 4
  }

  // ---------- Anexos ----------
  const paraAnexar = Array.from(porTipo.values())
    .map((v) => v[0])
    .filter(Boolean)

  for (const documento of paraAnexar) {
    const arquivo = await baixarComoDataUrl(documento.driveUrl)
    novaPagina()

    doc.setFontSize(11)
    doc.setFont("helvetica", "bold")
    doc.text(getDocumentoTipoLabel(documento.tipo), M, y)
    y += 5
    doc.setFontSize(8.5)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(120)
    doc.text(
      `Enviado em ${new Date(documento.enviadoEm).toLocaleString("pt-BR")}` +
        `${documento.enviadoPorNome ? ` por ${documento.enviadoPorNome}` : ""}`,
      M,
      y
    )
    doc.setTextColor(0)
    y += 7

    if (arquivo && arquivo.tipo.startsWith("image/")) {
      try {
        const props = doc.getImageProperties(arquivo.dataUrl)
        const escala = Math.min(L / props.width, (270 - y) / props.height)
        doc.addImage(
          arquivo.dataUrl,
          M,
          y,
          props.width * escala,
          props.height * escala
        )
      } catch {
        doc.setFontSize(9.5)
        doc.text("Não foi possível renderizar a imagem deste documento.", M, y)
      }
    } else {
      // jsPDF não embute outro PDF: registra a referência.
      doc.setFontSize(9.5)
      doc.text(
        arquivo
          ? "Documento em PDF — não pode ser embutido. Referência do arquivo:"
          : "Documento indisponível no momento da emissão. Referência do arquivo:",
        M,
        y
      )
      y += 6
      doc.setFontSize(8)
      doc.setTextColor(70)
      doc.text(doc.splitTextToSize(documento.driveUrl, L), M, y)
      doc.setTextColor(0)
    }
  }

  // ---------- Rodapé em todas as páginas ----------
  const total = doc.getNumberOfPages()
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    doc.setFontSize(7.5)
    doc.setTextColor(140)
    doc.text(
      `${(revendedora.nome || "").toUpperCase()} · CPF ${formatCpf(revendedora.cpf)} · página ${i} de ${total}`,
      M,
      290
    )
    doc.setTextColor(0)
  }

  const nomeArquivo = `dossie_${(revendedora.nome || "revendedora")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")}.pdf`
  doc.save(nomeArquivo)
}
