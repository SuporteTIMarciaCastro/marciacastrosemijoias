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

    // Timeout proprio: quando o servico de metricas cai, a conexao fica
    // pendurada ate a funcao ser cortada, e a tela passa esse tempo todo
    // "carregando" sem dizer nada. Melhor desistir cedo e explicar.
    const controle = new AbortController()
    const relogio = setTimeout(() => controle.abort(), 8000)

    let res: Response
    try {
      res = await fetch(url, { cache: "no-store", signal: controle.signal })
    } finally {
      clearTimeout(relogio)
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "")
      return NextResponse.json(
        {
          error: "O serviço de métricas do Kommo respondeu com erro.",
          servicoIndisponivel: true,
          status: res.status,
          details: text.slice(0, 300),
        },
        { status: 502 }
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
    // Chega aqui quando o servico sequer aceita conexao (fora do ar, caiu a
    // maquina, DNS aponta para lugar nenhum) ou quando estourou o timeout.
    const expirou = e?.name === "AbortError"
    console.error("Erro ao consultar API de atendimento:", e?.message || e)
    return NextResponse.json(
      {
        error: expirou
          ? "O serviço de métricas do Kommo não respondeu a tempo."
          : "Não foi possível falar com o serviço de métricas do Kommo.",
        servicoIndisponivel: true,
      },
      { status: 502 }
    )
  }
}
