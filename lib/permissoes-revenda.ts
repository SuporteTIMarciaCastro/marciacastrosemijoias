import type { User } from "@/types/permissions"
import type { Revendedora, Vendedor } from "@/types"

/**
 * Capacidades do Gerenciador de Revendas.
 *
 * Cada capacidade nova cai na caixa equivalente antiga quando a chave NÃO
 * existe no documento do usuário. Isso evita a regressão do dia do deploy:
 * quem lançava pagamento por ter "editar" continua lançando, sem ninguém
 * precisar reconfigurar.
 *
 * O `??` só cai no fallback quando a chave é undefined. Se um admin desmarcar
 * explicitamente, o valor gravado é `false` e passa a mandar.
 */

type PermRevendas = NonNullable<NonNullable<User["permissions"]>["gerenciadorRevendas"]>

const perm = (user?: User | null): Partial<PermRevendas> =>
  (user?.permissions?.gerenciadorRevendas ?? {}) as Partial<PermRevendas>

export function podeVerModulo(user?: User | null): boolean {
  return !!perm(user).visualizarPage
}

export function podeAdicionar(user?: User | null): boolean {
  return !!perm(user).adicionar
}

export function podeEditar(user?: User | null): boolean {
  return !!perm(user).editar
}

export function podeRemover(user?: User | null): boolean {
  return !!perm(user).remover
}

/** Prestação de contas, pagamentos e renegociação. Herda de `editar`. */
export function podeLancarPagamento(user?: User | null): boolean {
  const p = perm(user)
  return !!(p.lancarPagamento ?? p.editar)
}

/** Aba Relatórios. Herda de `visualizarPage`. */
export function podeVerRelatorios(user?: User | null): boolean {
  const p = perm(user)
  return !!(p.verRelatorios ?? p.visualizarPage)
}

/** Aba Vendedores. Herda de `editar`. */
export function podeGerenciarVendedores(user?: User | null): boolean {
  const p = perm(user)
  return !!(p.gerenciarVendedores ?? p.editar)
}

/** Envio de documentos. Herda de `adicionar`. */
export function podeEnviarDocumentos(user?: User | null): boolean {
  const p = perm(user)
  return !!(p.enviarDocumentos ?? p.adicionar)
}

/** Restrição de carteira. Sem fallback: ausente = não restringe ninguém. */
export function veApenasProprias(user?: User | null): boolean {
  return !!perm(user).apenasProprias
}

/** Autoriza entrega com pendência, mediante justificativa. Herda de `remover`. */
export function podeAutorizarExcecao(user?: User | null): boolean {
  const p = perm(user)
  return !!(p.autorizarExcecao ?? p.remover)
}

/**
 * Vendedor vinculado ao usuário logado, pelo campo `usuarioEmail` do cadastro
 * de vendedor. Devolve null quando não há vínculo.
 */
export function vendedorDoUsuario(
  user: User | null | undefined,
  vendedores: Vendedor[]
): Vendedor | null {
  const email = (user?.email || "").trim().toLowerCase()
  if (!email) return null
  return vendedores.find((v) => (v.usuarioEmail || "").trim().toLowerCase() === email) ?? null
}

/**
 * Aplica a restrição de carteira.
 *
 * Falha FECHADA: usuário restrito e sem vínculo com nenhum vendedor vê lista
 * vazia, nunca a lista inteira. O motivo é devolvido para a tela explicar.
 */
export function filtrarPorCarteira(
  user: User | null | undefined,
  revendedoras: Revendedora[],
  vendedores: Vendedor[]
): { lista: Revendedora[]; restrito: boolean; semVinculo: boolean } {
  if (!veApenasProprias(user)) {
    return { lista: revendedoras, restrito: false, semVinculo: false }
  }

  const vendedor = vendedorDoUsuario(user, vendedores)
  if (!vendedor) {
    return { lista: [], restrito: true, semVinculo: true }
  }

  return {
    lista: revendedoras.filter((r) => r.vendedorId === vendedor.id),
    restrito: true,
    semVinculo: false,
  }
}

/** Presets de papel: marcam o conjunto de caixas de uma vez. */
export const PRESETS_PAPEL: Record<string, Record<string, boolean>> = {
  Administrador: {
    visualizarPage: true,
    visualizar: true,
    adicionar: true,
    editar: true,
    remover: true,
    lancarPagamento: true,
    verRelatorios: true,
    gerenciarVendedores: true,
    enviarDocumentos: true,
    apenasProprias: false,
    autorizarExcecao: true,
  },
  Financeiro: {
    visualizarPage: true,
    visualizar: true,
    adicionar: false,
    editar: true,
    remover: false,
    lancarPagamento: true,
    verRelatorios: true,
    gerenciarVendedores: false,
    enviarDocumentos: true,
    apenasProprias: false,
    autorizarExcecao: false,
  },
  Vendedor: {
    visualizarPage: true,
    visualizar: true,
    adicionar: true,
    editar: true,
    remover: false,
    lancarPagamento: false,
    verRelatorios: false,
    gerenciarVendedores: false,
    enviarDocumentos: true,
    apenasProprias: true,
    autorizarExcecao: false,
  },
}
