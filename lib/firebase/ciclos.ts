import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  query,
  orderBy,
  where,
  runTransaction,
} from "firebase/firestore"
import { db } from "./config"
import {
  CICLO_STATUS_ABERTOS,
  CICLO_STATUS_PADRAO,
  arredondar2,
  estaQuitado,
} from "@/lib/ciclo-status"
import { documentosExigidosPendentes, statusPermiteEntrega } from "@/lib/entrega-regras"
import { DOCUMENTO_TIPO_LABELS } from "@/lib/documento-revendedora"
import { getRevendedoraStatusLabel } from "@/lib/revendedora-status"
import { fetchDocumentosByRevendedora } from "./documentos-revendedora"
import type {
  AutorizacaoExcecao,
  Ciclo,
  EntregaAdicional,
  PagamentoCiclo,
  PrestacaoContas,
} from "@/types"

const COLLECTION_NAME = "ciclos"
const REVENDEDORAS_COLLECTION = "revendedoras"

// Erro tipado para a UI distinguir "regra de negócio" de "falha técnica".
export class CicloAbertoError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "CicloAbertoError"
  }
}

/** Entrega barrada por status da revendedora ou documentação faltando. */
export class EntregaBloqueadaError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "EntregaBloqueadaError"
  }
}

const logarLinkDeIndice = (error: any) => {
  if (error?.code === "failed-precondition" || error?.code === 9 || error?.message?.includes("index")) {
    const link = String(error?.message || "").match(/https:\/\/console\.firebase\.google\.com[^\s)]+/)?.[0]
    if (link) {
      console.error("Crie o índice necessário nesta URL:", link)
    }
  }
}

/**
 * Abre um ciclo de consignação para a revendedora.
 *
 * Tudo acontece numa única transaction, o que resolve dois problemas de uma vez:
 *  1. O número do ciclo vem de `ultimoNumeroCiclo` na revendedora, então nunca
 *     se repete — nem com dois cliques simultâneos, nem se um ciclo antigo for
 *     apagado (contar documentos existentes teria esse furo).
 *  2. A regra "só um ciclo aberto por revendedora" é verificada e gravada na
 *     mesma operação atômica. Uma consulta prévia solta não garantiria isso.
 */
export async function abrirCiclo(
  revendedoraId: string,
  dados: Omit<Ciclo, "id" | "revendedoraId" | "numeroCiclo" | "status">,
  /** contorna status e documentação pendentes, registrando quem autorizou */
  autorizacao?: AutorizacaoExcecao
): Promise<{ id: string; numeroCiclo: number }> {
  try {
    const revendedoraRef = doc(db, REVENDEDORAS_COLLECTION, revendedoraId)
    // ID gerado localmente, sem ida à rede, para criar dentro da transaction.
    const cicloRef = doc(collection(db, COLLECTION_NAME))

    // Documentação exigida: validada ANTES da transaction porque o Firestore
    // não permite query dentro de uma — só leitura por referência. É seguro:
    // documentos nunca são excluídos (documentos-revendedora.ts não tem delete),
    // então o resultado não muda entre esta checagem e a gravação.
    if (!autorizacao) {
      const documentos = await fetchDocumentosByRevendedora(revendedoraId)
      const pendentes = documentosExigidosPendentes(documentos)
      if (pendentes.length > 0) {
        const nomes = pendentes.map((tipo) => DOCUMENTO_TIPO_LABELS[tipo] ?? tipo).join(" e ")
        throw new EntregaBloqueadaError(`Envie ${nomes} antes de registrar a entrega.`)
      }
    }

    const numeroCiclo = await runTransaction(db, async (transaction) => {
      const revendedoraSnap = await transaction.get(revendedoraRef)
      if (!revendedoraSnap.exists()) {
        throw new Error("Revendedora não encontrada")
      }

      const revendedora = revendedoraSnap.data()

      // Status validado DENTRO da transaction: o documento já é lido aqui, então
      // a regra não pode ser burlada por uma alteração de status simultânea.
      if (!autorizacao && !statusPermiteEntrega(revendedora?.status)) {
        throw new EntregaBloqueadaError(
          `Revendedora com status "${getRevendedoraStatusLabel(revendedora?.status)}" não pode receber mercadoria. Altere o status para "Ativa" para liberar.`
        )
      }

      if (revendedora?.cicloAbertoId) {
        throw new CicloAbertoError(
          "Esta revendedora já possui um ciclo em aberto. Encerre o ciclo atual antes de registrar uma nova entrega."
        )
      }

      const ultimo = Number(revendedora?.ultimoNumeroCiclo)
      const proximoNumero = Number.isFinite(ultimo) ? ultimo + 1 : 1

      transaction.set(cicloRef, {
        ...dados,
        revendedoraId,
        numeroCiclo: proximoNumero,
        status: CICLO_STATUS_PADRAO,
        ...(autorizacao ? { autorizacao } : {}),
        createdAt: new Date().toISOString(),
      })

      transaction.update(revendedoraRef, {
        ultimoNumeroCiclo: proximoNumero,
        cicloAbertoId: cicloRef.id,
        updatedAt: new Date().toISOString(),
      })

      return proximoNumero
    })

    return { id: cicloRef.id, numeroCiclo }
  } catch (error) {
    // Regra de negócio não é falha técnica — não polui o console.
    if (!(error instanceof CicloAbertoError) && !(error instanceof EntregaBloqueadaError)) {
      console.error("Erro ao abrir ciclo:", error)
    }
    throw error
  }
}

/**
 * Registra uma entrega ADICIONAL dentro de um ciclo já aberto.
 *
 * É o caminho de exceção previsto na regra "só libera nova entrega quando o
 * ciclo anterior estiver encerrado; caso contrário, exige autorização manual
 * com justificativa". Em vez de abrir um segundo ciclo em paralelo — o que
 * tornaria ambíguo a qual ciclo cada pagamento pertence e quebraria o
 * `cicloAbertoId` —, a mercadoria entra no ciclo corrente e é acertada na
 * mesma prestação de contas.
 */
export async function registrarEntregaAdicional(
  cicloId: string,
  entrega: Omit<EntregaAdicional, "id" | "registradoEm">
) {
  try {
    const cicloRef = doc(db, COLLECTION_NAME, cicloId)
    const agora = new Date().toISOString()

    await runTransaction(db, async (transaction) => {
      const cicloSnap = await transaction.get(cicloRef)
      if (!cicloSnap.exists()) {
        throw new Error("Ciclo não encontrado")
      }

      const dados = cicloSnap.data() as Ciclo
      if (dados.status === "encerrado") {
        throw new EntregaBloqueadaError(
          "Este ciclo já foi encerrado. Registre uma nova entrega normalmente."
        )
      }
      if (dados.prestacaoContas) {
        throw new EntregaBloqueadaError(
          "A prestação de contas deste ciclo já foi registrada. Não é possível acrescentar mercadoria depois da apuração."
        )
      }

      const nova: EntregaAdicional = {
        ...entrega,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        registradoEm: agora,
      }

      transaction.update(cicloRef, {
        entregasAdicionais: [...(dados.entregasAdicionais ?? []), nova],
        updatedAt: agora,
      })
    })
  } catch (error) {
    if (!(error instanceof EntregaBloqueadaError)) {
      console.error("Erro ao registrar entrega adicional:", error)
    }
    throw error
  }
}

/**
 * Registra a prestação de contas do ciclo.
 *
 * Se o valor a repassar for zero ou negativo, o ciclo já encerra aqui — não faz
 * sentido esperar um pagamento de R$ 0,00.
 */
export async function registrarPrestacaoContas(
  cicloId: string,
  revendedoraId: string,
  prestacao: PrestacaoContas
) {
  try {
    const cicloRef = doc(db, COLLECTION_NAME, cicloId)
    const revendedoraRef = doc(db, REVENDEDORAS_COLLECTION, revendedoraId)
    const agora = new Date().toISOString()

    await runTransaction(db, async (transaction) => {
      const cicloSnap = await transaction.get(cicloRef)
      if (!cicloSnap.exists()) {
        throw new Error("Ciclo não encontrado")
      }

      const totalPago = arredondar2(Number(cicloSnap.data()?.totalPago) || 0)
      const quitado = estaQuitado(totalPago, prestacao.valorRepassar)

      transaction.update(cicloRef, {
        prestacaoContas: prestacao,
        totalPago,
        statusPagamento: quitado ? "pago" : totalPago > 0 ? "parcial" : "pendente",
        status: quitado ? "encerrado" : "aguardando_pagamento",
        ...(quitado ? { dataEncerramentoReal: agora.slice(0, 10) } : {}),
        updatedAt: agora,
      })

      // Só libera a revendedora se já estiver quitado.
      if (quitado) {
        transaction.update(revendedoraRef, { cicloAbertoId: null, updatedAt: agora })
      }
    })
  } catch (error) {
    console.error("Erro ao registrar prestação de contas:", error)
    throw error
  }
}

/**
 * Registra um pagamento (possivelmente parcial) e recalcula o total.
 *
 * Quando a soma atinge o valor a repassar, o ciclo encerra sozinho e a
 * revendedora é liberada — tudo na mesma transaction, para que status e
 * `cicloAbertoId` nunca fiquem dessincronizados.
 */
export async function registrarPagamento(
  cicloId: string,
  revendedoraId: string,
  pagamento: Omit<PagamentoCiclo, "id" | "createdAt">
) {
  try {
    const cicloRef = doc(db, COLLECTION_NAME, cicloId)
    const revendedoraRef = doc(db, REVENDEDORAS_COLLECTION, revendedoraId)
    const agora = new Date().toISOString()

    await runTransaction(db, async (transaction) => {
      const cicloSnap = await transaction.get(cicloRef)
      if (!cicloSnap.exists()) {
        throw new Error("Ciclo não encontrado")
      }

      const dados = cicloSnap.data() as Ciclo
      const valorRepassar = dados.prestacaoContas?.valorRepassar
      if (typeof valorRepassar !== "number") {
        throw new Error("Registre a prestação de contas antes de lançar pagamentos.")
      }

      const novoPagamento: PagamentoCiclo = {
        ...pagamento,
        valor: arredondar2(pagamento.valor),
        // ID local só para identificar a linha na tela e permitir remoção.
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        createdAt: agora,
      }

      const pagamentos = [...(dados.pagamentos ?? []), novoPagamento]
      const totalPago = arredondar2(pagamentos.reduce((soma, p) => soma + (Number(p.valor) || 0), 0))
      const quitado = estaQuitado(totalPago, valorRepassar)

      transaction.update(cicloRef, {
        pagamentos,
        totalPago,
        statusPagamento: quitado ? "pago" : "parcial",
        ...(quitado
          ? { status: "encerrado", dataEncerramentoReal: agora.slice(0, 10) }
          : {}),
        updatedAt: agora,
      })

      if (quitado) {
        transaction.update(revendedoraRef, { cicloAbertoId: null, updatedAt: agora })
      }
    })
  } catch (error) {
    console.error("Erro ao registrar pagamento:", error)
    throw error
  }
}

/**
 * Remove um pagamento lançado por engano.
 *
 * Permitido apenas com o ciclo ainda aberto. Depois de encerrado seria preciso
 * restaurar o `cicloAbertoId` da revendedora, o que entraria em conflito caso
 * uma nova entrega já tivesse sido registrada.
 */
export async function removerPagamento(cicloId: string, pagamentoId: string) {
  try {
    const cicloRef = doc(db, COLLECTION_NAME, cicloId)
    const agora = new Date().toISOString()

    await runTransaction(db, async (transaction) => {
      const cicloSnap = await transaction.get(cicloRef)
      if (!cicloSnap.exists()) {
        throw new Error("Ciclo não encontrado")
      }

      const dados = cicloSnap.data() as Ciclo
      if (dados.status === "encerrado") {
        throw new Error("Não é possível remover pagamentos de um ciclo já encerrado.")
      }

      const pagamentos = (dados.pagamentos ?? []).filter((p) => p.id !== pagamentoId)
      const totalPago = arredondar2(pagamentos.reduce((soma, p) => soma + (Number(p.valor) || 0), 0))

      transaction.update(cicloRef, {
        pagamentos,
        totalPago,
        statusPagamento: totalPago > 0 ? "parcial" : "pendente",
        updatedAt: agora,
      })
    })
  } catch (error) {
    console.error("Erro ao remover pagamento:", error)
    throw error
  }
}

/**
 * Renegocia o ciclo: novo prazo e status próprio.
 * `cicloAbertoId` permanece preenchido — a revendedora continua bloqueada para
 * novas entregas até quitar.
 */
export async function renegociarCiclo(
  cicloId: string,
  revendedoraId: string,
  novaDataPrevista: string,
  observacao?: string,
  novoValorRepassar?: number
) {
  try {
    const cicloRef = doc(db, COLLECTION_NAME, cicloId)
    const revendedoraRef = doc(db, REVENDEDORAS_COLLECTION, revendedoraId)
    const agora = new Date().toISOString()

    // Em transaction porque renegociar o VALOR pode quitar o ciclo na hora
    // (ex.: abatimento que deixa o valor abaixo do que já foi pago) — e aí
    // status, statusPagamento e cicloAbertoId precisam mudar juntos.
    await runTransaction(db, async (transaction) => {
      const cicloSnap = await transaction.get(cicloRef)
      if (!cicloSnap.exists()) {
        throw new Error("Ciclo não encontrado")
      }

      const dados = cicloSnap.data() as Ciclo
      const atualizacao: Record<string, any> = {
        status: "renegociado",
        updatedAt: agora,
      }
      if (novaDataPrevista) atualizacao.dataEncerramentoPrevista = novaDataPrevista
      if (typeof observacao === "string" && observacao.trim() !== "") {
        atualizacao.observacao = observacao.trim()
      }

      let quitado = false

      if (typeof novoValorRepassar === "number" && Number.isFinite(novoValorRepassar)) {
        const prestacao = dados.prestacaoContas
        if (!prestacao) {
          throw new Error("Registre a prestação de contas antes de renegociar o valor.")
        }
        const valor = arredondar2(Math.max(0, novoValorRepassar))
        const totalPago = dados.totalPago ?? 0
        quitado = estaQuitado(totalPago, valor)

        atualizacao.prestacaoContas = {
          ...prestacao,
          // Guarda o valor original para não perder o histórico da negociação.
          valorRepassarOriginal: prestacao.valorRepassarOriginal ?? prestacao.valorRepassar,
          valorRepassar: valor,
        }
        atualizacao.statusPagamento = quitado ? "pago" : totalPago > 0 ? "parcial" : "pendente"
        if (quitado) {
          atualizacao.status = "encerrado"
          atualizacao.dataEncerramentoReal = agora.slice(0, 10)
        }
      }

      transaction.update(cicloRef, atualizacao)

      // Só libera a revendedora se a renegociação já deixou o ciclo quitado.
      if (quitado) {
        transaction.update(revendedoraRef, { cicloAbertoId: null, updatedAt: agora })
      }
    })
  } catch (error) {
    console.error("Erro ao renegociar ciclo:", error)
    throw error
  }
}

export async function fetchCiclosByRevendedora(revendedoraId: string): Promise<Ciclo[]> {
  try {
    // Só a igualdade na consulta, sem orderBy: combinar where e orderBy em
    // campos diferentes exigiria índice composto criado no console. Como o
    // número de ciclos por revendedora é pequeno, ordenar em memória resolve —
    // mesma decisão tomada em documentos-revendedora e auditoria.
    const q = query(collection(db, COLLECTION_NAME), where("revendedoraId", "==", revendedoraId))
    const snapshot = await getDocs(q)
    return snapshot.docs
      .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as Ciclo)
      .sort((a, b) => (b.numeroCiclo ?? 0) - (a.numeroCiclo ?? 0))
  } catch (error) {
    console.error("Erro ao buscar ciclos da revendedora:", error)
    logarLinkDeIndice(error)
    throw error
  }
}

/**
 * Todos os ciclos ainda abertos, de todas as revendedoras.
 *
 * Usada pelos alertas da listagem. Como só pode existir um ciclo aberto por
 * revendedora (invariante do `cicloAbertoId`), o resultado é limitado ao número
 * de revendedoras e NÃO cresce com o histórico — os ciclos encerrados, que são
 * a maioria, nunca são lidos.
 *
 * `in` com poucos valores usa índice de campo único, sem índice composto.
 */
export async function fetchCiclosAbertos(): Promise<Ciclo[]> {
  try {
    const q = query(collection(db, COLLECTION_NAME), where("status", "in", CICLO_STATUS_ABERTOS))
    const snapshot = await getDocs(q)
    return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as Ciclo)
  } catch (error) {
    console.error("Erro ao buscar ciclos abertos:", error)
    logarLinkDeIndice(error)
    throw error
  }
}

export async function fetchCiclo(id: string): Promise<Ciclo | null> {
  try {
    const docSnap = await getDoc(doc(db, COLLECTION_NAME, id))
    if (!docSnap.exists()) return null
    return { id: docSnap.id, ...docSnap.data() } as Ciclo
  } catch (error) {
    console.error("Erro ao buscar ciclo:", error)
    throw error
  }
}

export async function updateCiclo(id: string, dados: Partial<Ciclo>) {
  try {
    const payload: Record<string, any> = { ...dados }
    delete payload.id
    await updateDoc(doc(db, COLLECTION_NAME, id), {
      ...payload,
      updatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Erro ao atualizar ciclo:", error)
    throw error
  }
}

// Um ciclo está aberto (e bloqueia nova entrega) conforme CICLO_STATUS_ABERTOS.
export function isCicloAberto(ciclo: Ciclo): boolean {
  return CICLO_STATUS_ABERTOS.includes(ciclo.status)
}
