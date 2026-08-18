import { collection, addDoc, getDocs, query, where } from "firebase/firestore"
import { db } from "./config"
import type { DocumentoVendedor } from "@/types"

const COLLECTION_NAME = "documentosVendedor"

/**
 * Registra um novo envio de documento do representante.
 *
 * Não existe update nem delete nesta coleção, de propósito: cada envio é um
 * documento novo, então o histórico não pode ser alterado nem apagado por
 * nenhum caminho de código.
 */
export async function addDocumentoVendedor(
  documento: Omit<DocumentoVendedor, "id" | "enviadoEm">
): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...documento,
      enviadoEm: new Date().toISOString(),
    })
    return docRef.id
  } catch (error) {
    console.error("Erro ao registrar documento do vendedor:", error)
    throw error
  }
}

/**
 * Documentos de um vendedor.
 * Consulta só por igualdade e ordena em memória: combinar where com orderBy em
 * campos diferentes exigiria índice composto criado no console.
 */
export async function fetchDocumentosByVendedor(vendedorId: string): Promise<DocumentoVendedor[]> {
  try {
    const q = query(collection(db, COLLECTION_NAME), where("vendedorId", "==", vendedorId))
    const snapshot = await getDocs(q)
    return snapshot.docs
      .map((d) => ({ id: d.id, ...d.data() }) as DocumentoVendedor)
      .sort((a, b) => (b.enviadoEm || "").localeCompare(a.enviadoEm || ""))
  } catch (error) {
    console.error("Erro ao buscar documentos do vendedor:", error)
    throw error
  }
}

/** Todos os documentos, para a listagem marcar quem tem pendência. */
export async function fetchTodosDocumentosVendedor(): Promise<DocumentoVendedor[]> {
  try {
    const snapshot = await getDocs(collection(db, COLLECTION_NAME))
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as DocumentoVendedor)
  } catch (error) {
    console.error("Erro ao buscar documentos de vendedores:", error)
    throw error
  }
}
