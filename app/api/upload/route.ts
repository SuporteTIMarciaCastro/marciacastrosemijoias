import { type NextRequest, NextResponse } from "next/server"
import { verificarToken, naoAutorizado } from "@/lib/firebase/verificar-token"
import { google } from "googleapis"
import { createReadStream } from "fs"
import { writeFile } from "fs/promises"
import { join } from "path"
import { tmpdir } from "os"

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  "urn:ietf:wg:oauth:2.0:oob",
)

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
})

const drive = google.drive({ version: "v3", auth: oauth2Client })

/**
 * Pasta do "Formulário para Cliente" da lista de desejos.
 *
 * Esse formulário é PÚBLICO: o cliente preenche sem login, a partir do link
 * copiado na tela da lista de desejos, e a foto do produto é obrigatória. Por
 * isso é a única pasta que aceita envio sem token — e com restrições: só
 * imagem, só até o limite abaixo, e sempre como arquivo público (que era o
 * comportamento original). Qualquer outra pasta continua exigindo login.
 */
const PASTA_FORMULARIO_PUBLICO = "1dQYLq0i_h59A5ZOMI0a2JrdJ0Bu8IvBP"
const LIMITE_ENVIO_PUBLICO_BYTES = 10 * 1024 * 1024

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const folderId = formData.get("folderId") as string

    const usuario = await verificarToken(request)
    if (!usuario) {
      // Sem login, só o formulário público do cliente passa.
      if (folderId !== PASTA_FORMULARIO_PUBLICO) return naoAutorizado()
      if (!file || !file.type?.startsWith("image/")) {
        return NextResponse.json({ error: "Envie uma imagem" }, { status: 400 })
      }
      if (file.size > LIMITE_ENVIO_PUBLICO_BYTES) {
        return NextResponse.json({ error: "Imagem muito grande" }, { status: 413 })
      }
    }

    // Padrão continua público, para não alterar o comportamento de garantia,
    // pagamentos e lista de desejos. Só quem envia "false" (documentos pessoais
    // de revendedora) mantém o arquivo restrito à permissão da pasta. Envio sem
    // login nunca escolhe: segue o padrão.
    const tornarPublico = !usuario || formData.get("publico") !== "false"

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo foi enviado" }, { status: 400 })
    }

    if (!folderId) {
      return NextResponse.json({ error: "ID da pasta não especificado" }, { status: 400 })
    }

    // Criar um arquivo temporário. O nome no disco é gerado aqui, e não o
    // enviado pelo navegador: com envio sem login, um nome como "../x" poderia
    // escrever fora da pasta temporária. O nome no Drive continua o original.
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const tempFilePath = join(tmpdir(), `upload-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    await writeFile(tempFilePath, buffer)

    // Criar um stream de leitura do arquivo temporário
    const fileStream = createReadStream(tempFilePath)

    // Fazer upload para o Google Drive
    const response = await drive.files.create({
      requestBody: {
        name: file.name,
        parents: [folderId],
      },
      media: {
        mimeType: file.type,
        body: fileStream,
      },
    })

    // Tornar o arquivo público (quando solicitado)
    if (tornarPublico) {
      await drive.permissions.create({
        fileId: response.data.id!,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      })
    }

    // Obter o link público do arquivo
    const fileDetails = await drive.files.get({
      fileId: response.data.id!,
      fields: 'webViewLink',
    })

    return NextResponse.json({
      success: true,
      fileId: response.data.id,
      fileName: file.name,
      message: "Arquivo enviado com sucesso!",
      fileUrl: fileDetails.data.webViewLink,
    })
  } catch (error) {
    console.error("Erro no upload:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
} 