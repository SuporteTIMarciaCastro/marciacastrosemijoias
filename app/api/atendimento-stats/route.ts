import { NextRequest, NextResponse } from "next/server"
import { verificarToken, naoAutorizado } from "@/lib/firebase/verificar-token"

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
