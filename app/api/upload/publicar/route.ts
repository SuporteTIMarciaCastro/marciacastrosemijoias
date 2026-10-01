import { type NextRequest, NextResponse } from "next/server"
import { verificarToken, naoAutorizado } from "@/lib/firebase/verificar-token"
import { google } from "googleapis"
import { PASTA_DRIVE_FORMULARIO_PUBLICO } from "@/lib/upload-limites"

/**
 * Torna publico um arquivo recem-enviado e devolve o link de visualizacao.
 *
 * O envio em si acontece direto entre o navegador e o Drive (ver
 * /api/upload/sessao), mas dar permissao exige a credencial da empresa — por
 * isso este passo volta para o servidor. E uma chamada pequena, de JSON.
 *
 * Documentos pessoais NAO passam por aqui: eles ficam restritos a permissao da
 * pasta, que e o que protege RG, CPF e contrato.
 */

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  "urn:ietf:wg:oauth:2.0:oob"
)
oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN })
const drive = google.drive({ version: "v3", auth: oauth2Client })

export async function POST(request: NextRequest) {
  try {
    const corpo = await request.json().catch(() => null)
    const fileId = typeof corpo?.fileId === "string" ? corpo.fileId : ""
    const folderId = typeof corpo?.folderId === "string" ? corpo.folderId : ""

    if (!/^[A-Za-z0-9_-]{10,}$/.test(fileId)) {
      return NextResponse.json({ error: "fileId invalido" }, { status: 400 })
    }

    const usuario = await verificarToken(request)
    if (!usuario && folderId !== PASTA_DRIVE_FORMULARIO_PUBLICO) {
      return naoAutorizado()
    }

    // Confere que o arquivo esta mesmo na pasta informada antes de abrir: sem
    // isto, quem chamasse esta rota sem login poderia tornar publico qualquer
    // arquivo do Drive cujo id descobrisse.
    const info = await drive.files.get({ fileId, fields: "id,parents,webViewLink" })
    if (!usuario && !(info.data.parents ?? []).includes(PASTA_DRIVE_FORMULARIO_PUBLICO)) {
      return naoAutorizado()
    }

    await drive.permissions.create({
      fileId,
      requestBody: { role: "reader", type: "anyone" },
    })

    return NextResponse.json(
      { success: true, fileUrl: info.data.webViewLink },
      { headers: { "Cache-Control": "no-store" } }
    )
  } catch (error) {
    console.error("Erro ao publicar arquivo:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
