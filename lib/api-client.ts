import { auth } from "@/lib/firebase/config"

/**
 * `fetch` que anexa o token do usuário logado.
 *
 * As rotas de API passaram a exigir autenticação; este helper é o único lugar
 * que monta o cabeçalho, para nenhuma tela precisar saber disso.
 *
 * Importante: os headers são montados a partir do `init` recebido, sem definir
 * Content-Type. Isso preserva o comportamento do FormData, em que o navegador
 * precisa definir o boundary sozinho — forçar o Content-Type quebraria o upload.
 */
export async function fetchAutenticado(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(init.headers)

  try {
    const token = await auth.currentUser?.getIdToken()
    if (token) headers.set("Authorization", `Bearer ${token}`)
  } catch (error) {
    // Sem token a requisição segue e o servidor responde 401 — melhor um erro
    // claro do que uma falha silenciosa aqui.
    console.error("Não foi possível obter o token de autenticação:", error)
  }

  return fetch(input, { ...init, headers })
}
