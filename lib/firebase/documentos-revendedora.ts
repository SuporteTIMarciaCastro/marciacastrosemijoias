import { collection, addDoc, getDocs, query, where } from "firebase/firestore"
import { db } from "./config"
import type { DocumentoRevendedora } from "@/types"

const COLLECTION_NAME = "documentosRevendedora"

const logarLinkDeIndice = (error: any) => {
  if (error?.code === "failed-precondition" || error?.code === 9 || error?.message?.includes("index")) {
    const link = String(error?.message || "").match(/https:\/\/console\.firebase\.google\.com[^\s)]+/)?.[0]
    if (link) {
      console.error("Crie o índice necessário nesta URL:", link)
    }
  }
}

/**
 * Registra um novo envio de documento.
 *
 * Não existe update nem delete nesta coleção de propósito: cada envio é um
 * documento novo, então o histórico não pode ser alterado nem apagado por
 * nenhum caminho de código.
 */
export async function addDocumentoRevendedora(
  documento: Omit<DocumentoRevendedora, "id" | "enviadoEm">
): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...documento,
      enviadoEm: new Date().toISOString(),
    })
    return docRef.id
  } catch (error) {
    console.error("Erro ao registrar documento da revendedora:", error)
    throw error
  }
}

export async function fetchDocumentosByRevendedora(
  revendedoraId: string
): Promise<DocumentoRevendedora[]> {
  try {
    // Igualdade em campo único + ordenação pelo mesmo campo do orderBy exigiria
    // índice composto; por isso a ordenação é feita em memória logo abaixo.
    const q = query(collection(db, COLLECTION_NAME), where("revendedoraId", "==", revendedoraId))
    const snapshot = await getDocs(q)
    return snapshot.docs
      .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as DocumentoRevendedora)
      .sort((a, b) => (b.enviadoEm || "").localeCompare(a.enviadoEm || ""))
  } catch (error) {
    console.error("Erro ao buscar documentos da revendedora:", error)
    logarLinkDeIndice(error)
    throw error
  }
}

/**
 * Todos os documentos, usado pela listagem para marcar quem tem pendência.
 * O agrupamento por revendedora é feito em memória — uma consulta só, em vez de
 * uma por linha da tabela.
 */
export async function fetchTodosDocumentos(): Promise<DocumentoRevendedora[]> {
  try {
    const snapshot = await getDocs(collection(db, COLLECTION_NAME))
    return snapshot.docs.map(
      (docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as DocumentoRevendedora
    )
  } catch (error) {
    console.error("Erro ao buscar documentos:", error)
    throw error
  }
}
