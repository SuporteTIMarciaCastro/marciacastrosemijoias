import {
  collection,
  addDoc,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit as fbLimit,
  where,
  getCountFromServer,
} from "firebase/firestore"
import { db } from "./config"
import { normalizeCpf } from "@/lib/cpf"
import type { Revendedora } from "@/types"

const COLLECTION_NAME = "revendedoras"

const normalizeWhatsappValue = (value: unknown): string => {
  if (typeof value === "string" || typeof value === "number") {
    return String(value).replace(/\D+/g, "")
  }
  return ""
}

// Extrai o link de criação de índice da mensagem de erro do Firestore.
// Mesmo tratamento usado em lib/firebase/pagamentos.ts.
const logarLinkDeIndice = (error: any) => {
  if (error?.code === "failed-precondition" || error?.code === 9 || error?.message?.includes("index")) {
    const link = String(error?.message || "").match(/https:\/\/console\.firebase\.google\.com[^\s)]+/)?.[0]
    if (link) {
      console.error("Crie o índice necessário nesta URL:", link)
    }
  }
}

// Monta o payload gravado no Firestore a partir dos dados do formulário.
const montarPayload = (dados: Partial<Revendedora>) => {
  const payload: Record<string, any> = { ...dados }
  delete payload.id

  if (typeof dados.nome !== "undefined") {
    payload.nome = dados.nome.trim()
    payload.nomeLower = payload.nome.toLowerCase()
  }
  if (typeof dados.cpf !== "undefined") {
    payload.cpf = normalizeCpf(dados.cpf)
  }
  if (typeof dados.whatsapp !== "undefined") {
    payload.whatsapp = normalizeWhatsappValue(dados.whatsapp)
  }

  return payload
}

// Busca uma revendedora pelo CPF. Usado para impedir CPF duplicado.
// `ignorarId` evita que a própria revendedora bloqueie a edição dela mesma.
export async function findRevendedoraByCpf(cpf: string, ignorarId?: string): Promise<Revendedora | null> {
  try {
    const cpfNormalizado = normalizeCpf(cpf)
    if (cpfNormalizado.length !== 11) return null

    // Igualdade em campo único: o Firestore indexa sozinho, sem índice composto.
    const q = query(collection(db, COLLECTION_NAME), where("cpf", "==", cpfNormalizado), fbLimit(2))
    const snapshot = await getDocs(q)

    const encontrada = snapshot.docs
      .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as Revendedora)
      .find((item) => item.id !== ignorarId)

    return encontrada ?? null
  } catch (error) {
    console.error("Erro ao buscar revendedora por CPF:", error)
    throw error
  }
}

export async function addRevendedora(revendedora: Omit<Revendedora, "id">) {
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...montarPayload(revendedora),
      createdAt: new Date().toISOString(),
    })
    return docRef.id
  } catch (error) {
    console.error("Erro ao adicionar revendedora:", error)
    throw error
  }
}

export async function fetchRevendedoras(): Promise<Revendedora[]> {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"))
    const snapshot = await getDocs(q)
    return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as Revendedora)
  } catch (error) {
    console.error("Erro ao buscar revendedoras:", error)
    logarLinkDeIndice(error)
    throw error
  }
}

export async function fetchRevendedora(id: string): Promise<Revendedora | null> {
  try {
    const docSnap = await getDoc(doc(db, COLLECTION_NAME, id))
    if (!docSnap.exists()) return null
    return { id: docSnap.id, ...docSnap.data() } as Revendedora
  } catch (error) {
    console.error("Erro ao buscar revendedora:", error)
    throw error
  }
}

export async function updateRevendedora(id: string, dados: Partial<Revendedora>) {
  try {
    await updateDoc(doc(db, COLLECTION_NAME, id), {
      ...montarPayload(dados),
      updatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Erro ao atualizar revendedora:", error)
    throw error
  }
}

// Conta quantas revendedoras estão vinculadas a um vendedor.
// Usada na guarda de exclusão do vendedor: precisa ser autoritativa, por isso
// consulta o servidor em vez de usar a lista já carregada em memória.
// getCountFromServer devolve só o número, sem ler os documentos.
export async function countRevendedorasByVendedor(vendedorId: string): Promise<number> {
  try {
    const q = query(collection(db, COLLECTION_NAME), where("vendedorId", "==", vendedorId))
    const snapshot = await getCountFromServer(q)
    return snapshot.data().count
  } catch (error) {
    console.error("Erro ao contar revendedoras do vendedor:", error)
    throw error
  }
}

export async function deleteRevendedora(id: string) {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id))
  } catch (error) {
    console.error("Erro ao excluir revendedora:", error)
    throw error
  }
}
