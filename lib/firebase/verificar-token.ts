import { NextResponse } from "next/server"
import { adminAuth } from "./admin"

/**
 * Verificação de autenticação nas rotas de API.
 *
 * Até então nenhuma rota validava quem chamava: qualquer pessoa com a URL
 * conseguia criar usuário, subir arquivo ou disparar e-mail. Este módulo é o
 * ponto único onde o token do Firebase é conferido.
 *
 * O cliente envia o token no cabeçalho `Authorization: Bearer <token>` — ver
 * lib/api-client.ts.
 */

export interface UsuarioAutenticado {
  uid: string
  email?: string
}

/**
 * Devolve o usuário autenticado, ou `null` quando o token está ausente,
 * malformado ou expirado. Nunca lança: quem chama decide o que responder.
 */
export async function verificarToken(req: Request): Promise<UsuarioAutenticado | null> {
  const cabecalho = req.headers.get("authorization") || ""
  if (!cabecalho.startsWith("Bearer ")) return null

  const token = cabecalho.slice(7).trim()
  if (!token) return null

  try {
    const decodificado = await adminAuth.verifyIdToken(token)
    return { uid: decodificado.uid, email: decodificado.email }
  } catch (error) {
    // Token inválido ou expirado não é erro de sistema — é 401.
    return null
  }
}

/** Resposta padrão para chamada sem autenticação válida. */
export function naoAutorizado() {
  return NextResponse.json(
    { error: "Não autorizado. Faça login novamente." },
    { status: 401 }
  )
}
