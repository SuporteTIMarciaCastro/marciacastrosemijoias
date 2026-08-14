import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  where,
  limit as fbLimit,
  startAfter as fbStartAfter,
  QueryDocumentSnapshot,
} from "firebase/firestore"
import { db } from "./config"
import type { RegistroAuditoria } from "@/types"

const COLLECTION_NAME = "auditoria"
const MODULO = "gerenciadorRevendas"

export interface EventoAuditoria {
  acao: string
  entidade: string
  entidadeId?: string
  revendedoraId?: string
  descricao: string
  alteracoes?: { campo: string; de: string; para: string }[]
  usuarioEmail?: string
  usuarioNome?: string
}

/**
 * Grava um evento no log.
 *
 * NUNCA lança para quem chamou: o try/catch é interno e só registra no console.
 * O log é aditivo — se falhar, a operação de negócio já foi concluída e o
 * usuário já viu a confirmação. Travar um pagamento porque o log falhou seria
 * inverter a prioridade.
 *
 * É aguardado (não disparado e esquecido) porque uma navegação logo após a ação
 * poderia abortar uma escrita não aguardada, e para auditoria garantir o
 * registro vale mais que os milissegundos.
 */
export async function registrarAuditoria(evento: EventoAuditoria): Promise<void> {
  try {
    const payload: Record<string, any> = {
      modulo: MODULO,
      acao: evento.acao,
      entidade: evento.entidade,
      descricao: evento.descricao,
      criadoEm: new Date().toISOString(),
    }
    if (evento.entidadeId) payload.entidadeId = evento.entidadeId
    if (evento.revendedoraId) payload.revendedoraId = evento.revendedoraId
    if (evento.alteracoes?.length) payload.alteracoes = evento.alteracoes
    if (evento.usuarioEmail) payload.usuarioEmail = evento.usuarioEmail
    if (evento.usuarioNome) payload.usuarioNome = evento.usuarioNome

    await addDoc(collection(db, COLLECTION_NAME), payload)
  } catch (error) {
    console.error("Falha ao registrar auditoria (operação não foi afetada):", error)
  }
}

/**
 * Histórico de uma revendedora.
 * Consulta só por revendedoraId e ordena em memória — o volume por revendedora
 * é pequeno e assim não exige índice composto no Firestore.
 */
export async function fetchAuditoriaPorRevendedora(
  revendedoraId: string
): Promise<RegistroAuditoria[]> {
  try {
    const q = query(collection(db, COLLECTION_NAME), where("revendedoraId", "==", revendedoraId))
    const snapshot = await getDocs(q)
    return snapshot.docs
      .map((d) => ({ id: d.id, ...d.data() }) as RegistroAuditoria)
      .sort((a, b) => (b.criadoEm || "").localeCompare(a.criadoEm || ""))
  } catch (error) {
    console.error("Erro ao buscar auditoria da revendedora:", error)
    throw error
  }
}

/**
 * Log geral, paginado.
 * Diferente das outras coleções do módulo, `auditoria` cresce indefinidamente —
 * por isso aqui nunca se carrega tudo. orderBy em campo único usa índice
 * automático.
 */
export async function fetchAuditoriaPaginada(
  limitValue: number = 30,
  startAfterDoc?: QueryDocumentSnapshot
): Promise<{ registros: RegistroAuditoria[]; lastDoc: QueryDocumentSnapshot | null }> {
  try {
    const restricoes: any[] = [orderBy("criadoEm", "desc"), fbLimit(limitValue)]
    if (startAfterDoc) restricoes.splice(1, 0, fbStartAfter(startAfterDoc))

    const snapshot = await getDocs(query(collection(db, COLLECTION_NAME), ...restricoes))
    const registros = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as RegistroAuditoria)
    const lastDoc = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null
    return { registros, lastDoc }
  } catch (error) {
    console.error("Erro ao buscar auditoria:", error)
    throw error
  }
}
