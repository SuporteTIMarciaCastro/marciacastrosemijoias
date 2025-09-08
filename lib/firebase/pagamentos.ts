import { collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc, query, orderBy, limit as fbLimit, startAfter as fbStartAfter, QueryDocumentSnapshot } from "firebase/firestore"
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
  situacaoOrder?: number
  comprovantePagamento?: string[]
  comprovanteDevolucao?: string
  boletoPdf?: string
  formaPagamento?: string
  createdAt?: string
  updatedAt?: string
  criadoPor?: string
  anexos?: string[]
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

export async function fetchPagamentos(limitValue: number = 10, startAfterDoc?: QueryDocumentSnapshot): Promise<{ pagamentos: Pagamento[], lastDoc: QueryDocumentSnapshot | null }> {
  try {
    let q
    if (startAfterDoc) {
      q = query(
        collection(db, COLLECTION_NAME),
        orderBy("situacaoOrder", "asc"),
        orderBy("createdAt", "desc"),
        fbLimit(limitValue),
        fbStartAfter(startAfterDoc)
      )
    } else {
      q = query(
        collection(db, COLLECTION_NAME),
        orderBy("situacaoOrder", "asc"),
        orderBy("createdAt", "desc"),
        fbLimit(limitValue)
      )
    }
    const querySnapshot = await getDocs(q)
    const pagamentos = querySnapshot.docs.map(
      (doc) => ({
        id: doc.id,
        ...doc.data(),
      }) as Pagamento
    )
    const lastDoc = querySnapshot.docs.length > 0 ? querySnapshot.docs[querySnapshot.docs.length - 1] : null
    return { pagamentos, lastDoc }
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