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
} from "firebase/firestore"
import { db } from "./config"
import { normalizeCpf } from "@/lib/cpf"
import type { Vendedor } from "@/types"

const COLLECTION_NAME = "vendedores"

const normalizeWhatsappValue = (value: unknown): string => {
  if (typeof value === "string" || typeof value === "number") {
    return String(value).replace(/\D+/g, "")
  }
  return ""
}

// Mesmo tratamento de link de índice usado em lib/firebase/pagamentos.ts
const logarLinkDeIndice = (error: any) => {
  if (error?.code === "failed-precondition" || error?.code === 9 || error?.message?.includes("index")) {
    const link = String(error?.message || "").match(/https:\/\/console\.firebase\.google\.com[^\s)]+/)?.[0]
    if (link) {
      console.error("Crie o índice necessário nesta URL:", link)
    }
  }
}

const montarPayload = (dados: Partial<Vendedor>) => {
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

// Impede CPF duplicado. `ignorarId` evita que o próprio vendedor bloqueie sua edição.
export async function findVendedorByCpf(cpf: string, ignorarId?: string): Promise<Vendedor | null> {
  try {
    const cpfNormalizado = normalizeCpf(cpf)
    if (cpfNormalizado.length !== 11) return null

    const q = query(collection(db, COLLECTION_NAME), where("cpf", "==", cpfNormalizado), fbLimit(2))
    const snapshot = await getDocs(q)

    const encontrado = snapshot.docs
      .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as Vendedor)
      .find((item) => item.id !== ignorarId)

    return encontrado ?? null
  } catch (error) {
    console.error("Erro ao buscar vendedor por CPF:", error)
    throw error
  }
}

export async function addVendedor(vendedor: Omit<Vendedor, "id">) {
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...montarPayload(vendedor),
      createdAt: new Date().toISOString(),
    })
    return docRef.id
  } catch (error) {
    console.error("Erro ao adicionar vendedor:", error)
    throw error
  }
}

export async function fetchVendedores(): Promise<Vendedor[]> {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy("nomeLower", "asc"))
    const snapshot = await getDocs(q)
    return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as Vendedor)
  } catch (error) {
    console.error("Erro ao buscar vendedores:", error)
    logarLinkDeIndice(error)
    throw error
  }
}

export async function fetchVendedor(id: string): Promise<Vendedor | null> {
  try {
    const docSnap = await getDoc(doc(db, COLLECTION_NAME, id))
    if (!docSnap.exists()) return null
    return { id: docSnap.id, ...docSnap.data() } as Vendedor
  } catch (error) {
    console.error("Erro ao buscar vendedor:", error)
    throw error
  }
}

export async function updateVendedor(id: string, dados: Partial<Vendedor>) {
  try {
    await updateDoc(doc(db, COLLECTION_NAME, id), {
      ...montarPayload(dados),
      updatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Erro ao atualizar vendedor:", error)
    throw error
  }
}

export async function deleteVendedor(id: string) {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id))
  } catch (error) {
    console.error("Erro ao excluir vendedor:", error)
    throw error
  }
}
