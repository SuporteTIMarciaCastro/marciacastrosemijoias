import { type NextRequest, NextResponse } from "next/server"
import { verificarToken, naoAutorizado } from "@/lib/firebase/verificar-token"
import { google } from "googleapis"
import {
  PASTAS_PERMITIDAS,
  PASTA_DRIVE_FORMULARIO_PUBLICO,
  LIMITE_ENVIO_BYTES,
  LIMITE_ENVIO_MB,
} from "@/lib/upload-limites"

/**
 * Abre uma sessao de envio no Google Drive e devolve a URL dela.
 *
 * POR QUE ISTO EXISTE: a plataforma recusa requisicoes acima de ~4,5 MB antes
 * de elas chegarem na aplicacao, entao arquivo grande nunca chegaria em
 * /api/upload. Aqui o arquivo NAO passa pelo servidor: ele so abre a sessao
 * (uma requisicao de poucos bytes) e o navegador manda os bytes direto para o
 * Google, que libera CORS para o nosso dominio.
 *
 * As credenciais continuam no servidor. O navegador recebe apenas a URL da
 * sessao, que serve para um unico envio, naquela pasta, e expira.
 */

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  "urn:ietf:wg:oauth:2.0:oob"
)
oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN })

export async function POST(request: NextRequest) {
  try {
    const corpo = await request.json().catch(() => null)
    const nomeArquivo = typeof corpo?.nomeArquivo === "string" ? corpo.nomeArquivo : ""
    const mimeType = typeof corpo?.mimeType === "string" ? corpo.mimeType : "application/octet-stream"
    const folderId = typeof corpo?.folderId === "string" ? corpo.folderId : ""
    const tamanho = Number(corpo?.tamanho)

    // Pasta tem que ser uma das nossas: a sessao usa a credencial da empresa, e
    // sem esta trava daria para escrever em qualquer lugar do Drive.
    if (!PASTAS_PERMITIDAS.includes(folderId)) {
      return NextResponse.json({ error: "Pasta de destino invalida" }, { status: 400 })
    }

    const usuario = await verificarToken(request)
    if (!usuario) {
      // Mesma excecao do envio tradicional: o "Formulario para Cliente" da
      // lista de desejos e preenchido sem login e exige foto.
      if (folderId !== PASTA_DRIVE_FORMULARIO_PUBLICO) return naoAutorizado()
      if (!mimeType.startsWith("image/")) {
        return NextResponse.json({ error: "Envie uma imagem" }, { status: 400 })
      }
    }

    if (!nomeArquivo) {
      return NextResponse.json({ error: "Nome do arquivo nao informado" }, { status: 400 })
    }
    if (!Number.isFinite(tamanho) || tamanho <= 0) {
      return NextResponse.json({ error: "Tamanho do arquivo nao informado" }, { status: 400 })
    }
    if (tamanho > LIMITE_ENVIO_BYTES) {
      return NextResponse.json(
        { error: `O limite por arquivo e de ${LIMITE_ENVIO_MB} MB` },
        { status: 413 }
      )
    }

    const { token } = await oauth2Client.getAccessToken()
    if (!token) {
      return NextResponse.json({ error: "Falha ao autenticar no Drive" }, { status: 502 })
    }

    const resposta = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,webViewLink",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json; charset=UTF-8",
          "X-Upload-Content-Type": mimeType,
          "X-Upload-Content-Length": String(tamanho),
        },
        body: JSON.stringify({ name: nomeArquivo, parents: [folderId] }),
      }
    )

    const sessionUrl = resposta.headers.get("location")
    if (!resposta.ok || !sessionUrl) {
      const detalhe = await resposta.text().catch(() => "")
      console.error("Falha ao abrir sessao no Drive:", resposta.status, detalhe.slice(0, 300))
      return NextResponse.json({ error: "Nao foi possivel iniciar o envio" }, { status: 502 })
    }

    return NextResponse.json({ sessionUrl }, { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    console.error("Erro ao abrir sessao de upload:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
