import { collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc, query, orderBy } from "firebase/firestore"
import { db } from "./config"

export interface Pagamento {
  id?: string
  tipo: string
  quemPagou?: string
  finalidade: string
  data?: string
  dataVencimento?: string
  justificativa: string
  dadosPagamento?: string
  situacao: string
  comprovantePagamento?: string
  comprovanteDevolucao?: string
  boletoPdf?: string
  formaPagamento?: string
  createdAt?: string
  updatedAt?: string
  criadoPor?: string
}

const COLLECTION_NAME = "pagamentos"

export async function addPagamento(pagamento: Omit<Pagamento, "id">) {
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...pagamento,
      createdAt: new Date().toISOString(),
    })
    return docRef.id
  } catch (error) {
    console.error("Erro ao adicionar pagamento:", error)
    throw error
  }
}

export async function fetchPagamentos(): Promise<Pagamento[]> {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"))
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(
      (doc) => ({
        id: doc.id,
        ...doc.data(),
      }) as Pagamento
    )
  } catch (error) {
    console.error("Erro ao buscar pagamentos:", error)
    throw error
  }
}

export async function fetchPagamento(id: string): Promise<Pagamento | null> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id)
    const docSnap = await getDoc(docRef)
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data(),
      } as Pagamento
    } else {
      return null
    }
  } catch (error) {
    console.error("Erro ao buscar pagamento:", error)
    throw error
  }
}

export async function updatePagamento(id: string, data: Partial<Pagamento>) {
  try {
    const docRef = doc(db, COLLECTION_NAME, id)
    await updateDoc(docRef, {
      ...data,
      updatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Erro ao atualizar pagamento:", error)
    throw error
  }
}

export async function deletePagamento(id: string) {
  try {
    const docRef = doc(db, COLLECTION_NAME, id)
    await deleteDoc(docRef)
  } catch (error) {
    console.error("Erro ao excluir pagamento:", error)
    throw error
  }
} 