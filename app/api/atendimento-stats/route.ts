import { NextRequest, NextResponse } from "next/server"
import { verificarToken, naoAutorizado } from "@/lib/firebase/verificar-token"
import { ehAtendenteAtivo } from "@/lib/atendentes-ativos"

const API_BASE =
  "https://automacoes-sales-couching.cvibkg.easypanel.host/api/v1/metrics/vendedoras"

export async function GET(request: NextRequest) {
  const usuarioAutenticado = await verificarToken(request)
  if (!usuarioAutenticado) return naoAutorizado()


  const { searchParams } = new URL(request.url)
  const dateFrom = searchParams.get("date_from")
  const dateTo = searchParams.get("date_to")

  if (!dateFrom || !dateTo) {
    return NextResponse.json(
      { error: "Parâmetros date_from e date_to são obrigatórios" },
      { status: 400 }
    )
  }

  try {
    const url = `${API_BASE}?date_from=${encodeURIComponent(dateFrom)}&date_to=${encodeURIComponent(dateTo)}`
    const res = await fetch(url, { cache: "no-store" })

    if (!res.ok) {
      const text = await res.text().catch(() => "")
      return NextResponse.json(
        { error: `Erro ${res.status} ao consultar API externa`, details: text },
        { status: res.status }
      )
    }

    const data = await res.json()

    // A API externa devolve todo o historico, inclusive de quem saiu da empresa
    // e de contas que nao sao de atendimento. Filtrar aqui, e nao na tela,
    // garante um unico ponto de corte: os graficos, os rankings e os insights
    // da pagina derivam todos desta resposta e ficam coerentes entre si.
    // Ver lib/atendentes-ativos.ts para incluir alguem novo.
    if (Array.isArray(data)) {
      const filtrado = data.filter(ehAtendenteAtivo)
      if (filtrado.length === 0 && data.length > 0) {
        // Nao cai para a lista completa de proposito: mostrar quem saiu seria
        // pior do que a tela vazia. O aviso indica que os ids mudaram.
        console.warn(
          "[atendimento-stats] nenhum registro sobrou apos o filtro. " +
            "Os user_id em lib/atendentes-ativos.ts podem estar desatualizados."
        )
      }
      return NextResponse.json(filtrado, {
        headers: { "Cache-Control": "no-store" },
      })
    }

    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store" },
    })
  } catch (e: any) {
    console.error("Erro ao consultar API de atendimento:", e)
    return NextResponse.json(
      { error: e?.message || "Falha ao consultar API externa" },
      { status: 502 }
    )
  }
}
