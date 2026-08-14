import { NextResponse } from "next/server"
import { verificarToken, naoAutorizado } from "@/lib/firebase/verificar-token"

export async function POST(request: Request) {
  const usuarioAutenticado = await verificarToken(request)
  if (!usuarioAutenticado) return naoAutorizado()


  try {
    const webhookUrl = process.env.WEBHOOK_WARRANTY_URL

    if (!webhookUrl) {
      console.error("WEBHOOK_WARRANTY_URL não está configurada")
      return NextResponse.json(
        { success: false, message: "Webhook não configurado" },
        { status: 500 }
      )
    }

    const payload = await request.json()

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => "")
      console.error("Falha ao enviar webhook de garantia", response.status, errorText)
      return NextResponse.json(
        {
          success: false,
          message: "Falha ao enviar webhook",
          status: response.status,
          error: errorText || undefined,
        },
        { status: 502 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erro ao processar webhook de garantia", error)
    return NextResponse.json(
      { success: false, message: "Erro interno" },
      { status: 500 }
    )
  }
}
