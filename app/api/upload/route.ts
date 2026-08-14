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

export async function POST(request: NextRequest) {
  try {
    // Só usuário autenticado envia arquivo.
    const usuario = await verificarToken(request)
    if (!usuario) return naoAutorizado()

    const formData = await request.formData()
    const file = formData.get("file") as File
    const folderId = formData.get("folderId") as string
    // Padrão continua público, para não alterar o comportamento de garantia,
    // pagamentos e lista de desejos. Só quem envia "false" (documentos pessoais
    // de revendedora) mantém o arquivo restrito à permissão da pasta.
    const tornarPublico = formData.get("publico") !== "false"

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo foi enviado" }, { status: 400 })
    }

    if (!folderId) {
      return NextResponse.json({ error: "ID da pasta não especificado" }, { status: 400 })
    }

    // Criar um arquivo temporário
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const tempFilePath = join(tmpdir(), file.name)
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