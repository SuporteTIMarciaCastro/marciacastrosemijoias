import { fetchAutenticado } from "@/lib/api-client"

// Anexos do sistema vão para o Google Drive, não para o Firebase Storage
// (lib/firebase/config.ts nem inicializa o Storage). O fluxo é:
//   FormData { file, folderId } -> POST /api/upload -> drive.files.create()
//   -> arquivo tornado público -> devolve o webViewLink.
//
// Cada módulo usa uma pasta própria. Garantia, Pagamentos e Lista de Desejos
// têm as suas com o ID escrito direto no componente; aqui a constante fica
// isolada para o Gerenciador de Revendas.

// TODO: substituir pelo ID da pasta do Gerenciador de Revendas assim que ela
// for criada no Drive. Enquanto isso, aponta para a pasta da Garantia apenas
// para permitir o teste do fluxo.
export const PASTA_DRIVE_REVENDAS = "1-NZHEq0_4bKpL99KN2K-u5eQTxJ7BXfn"

// Pasta SEPARADA e com compartilhamento restrito para os documentos pessoais
// das revendedoras (RG, CPF, comprovante de residência, contrato, termo de
// confissão). Os arquivos sobem com `publico: false`, então herdam a permissão
// desta pasta — é no compartilhamento dela que se controla quem enxerga
// documento de identidade.
export const PASTA_DRIVE_DOCUMENTOS_REVENDEDORAS = "1J8u8a8hpi4Kd-tNF2ipMgz_oBXpf49qU"

interface OpcoesUpload {
  /** false mantém o arquivo restrito à permissão da pasta (documentos pessoais) */
  publico?: boolean
  /** renomeia o arquivo antes do envio, preservando a extensão original */
  nomeArquivo?: string
}

// Extrai a extensão do nome original ("foto.JPG" -> "jpg").
export function extensaoDoArquivo(nome: string): string {
  const partes = nome.split(".")
  return partes.length > 1 ? partes[partes.length - 1].toLowerCase() : "bin"
}

// Envia um arquivo para o Drive e devolve o webViewLink.
export async function uploadParaDrive(
  file: File,
  folderId: string,
  opcoes: OpcoesUpload = {}
): Promise<string> {
  const { publico = true, nomeArquivo } = opcoes

  // O nome do arquivo fica visível para quem lista a pasta, mesmo sem abrir o
  // conteúdo — por isso documentos pessoais são renomeados antes do envio.
  const arquivo = nomeArquivo
    ? new File([file], `${nomeArquivo}.${extensaoDoArquivo(file.name)}`, { type: file.type })
    : file

  const formData = new FormData()
  formData.append("file", arquivo)
  formData.append("folderId", folderId)
  if (!publico) formData.append("publico", "false")

  const response = await fetchAutenticado("/api/upload", {
    method: "POST",
    body: formData,
  })

  if (!response.ok) {
    throw new Error("Erro ao fazer upload do arquivo")
  }

  const result = await response.json()
  return result.fileUrl as string
}

/** Extrai o ID do arquivo a partir de qualquer formato de link do Drive. */
export function extrairFileIdDrive(url: string): string | null {
  const m = url.match(/id=([a-zA-Z0-9_-]+)/) || url.match(/d\/([a-zA-Z0-9_-]+)/)
  return m?.[1] ?? null
}

// Converte o webViewLink do Drive na URL de conteúdo bruto, usada junto do
// /api/image-proxy para exibir a imagem (o Drive bloqueia hotlink direto).
export function getGoogleDriveEmbedUrl(url: string): string {
  const fileId = extrairFileIdDrive(url)
  return fileId ? `https://drive.google.com/uc?id=${fileId}` : url
}

// URL pronta para usar no src de uma <img>.
export function getDriveImageSrc(url: string): string {
  return `/api/image-proxy?url=${encodeURIComponent(getGoogleDriveEmbedUrl(url))}`
}
