import { type NextRequest, NextResponse } from "next/server"
import { verificarToken, naoAutorizado } from "@/lib/firebase/verificar-token"
import { google } from "googleapis"

/**
 * Baixa um arquivo do Drive usando as credenciais de serviço.
 *
 * Existe porque os documentos das revendedoras sobem com `publico: false` — não
 * são acessíveis por link, e o navegador do usuário não tem como buscá-los.
 * Esta rota é a ponte, e por isso **exige autenticação**: sem a verificação de
 * token ela seria um caminho aberto para baixar RG e CPF de qualquer pessoa.
 */

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  "urn:ietf:wg:oauth:2.0:oob"
)
oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN })
const drive = google.drive({ version: "v3", auth: oauth2Client })

export async function GET(request: NextRequest) {
  const usuario = await verificarToken(request)
  if (!usuario) return naoAutorizado()

  const fileId = new URL(request.url).searchParams.get("fileId")
  if (!fileId || !/^[a-zA-Z0-9_-]{10,}$/.test(fileId)) {
    return NextResponse.json({ error: "fileId inválido" }, { status: 400 })
  }

  try {
    const meta = await drive.files.get({ fileId, fields: "name,mimeType,size" })

    const conteudo = await drive.files.get(
      { fileId, alt: "media" },
      { responseType: "arraybuffer" }
    )

    return new Response(conteudo.data as ArrayBuffer, {
      headers: {
        "Content-Type": meta.data.mimeType || "application/octet-stream",
        "Content-Disposition": `inline; filename="${meta.data.name || fileId}"`,
        // Documento pessoal não fica em cache compartilhado.
        "Cache-Control": "private, max-age=300",
      },
    })
  } catch (error) {
    console.error("Erro ao baixar arquivo do Drive:", error)
    return NextResponse.json({ error: "Arquivo não encontrado ou sem acesso" }, { status: 404 })
  }
}
