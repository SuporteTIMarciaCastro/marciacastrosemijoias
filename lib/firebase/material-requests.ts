import { collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc, query, orderBy } from "firebase/firestore"
import { db } from "./config"
import type { MaterialRequest } from "@/types"

const COLLECTION_NAME = "material-requests"

// Adicionar uma nova solicitação de material
export async function addMaterialRequest(request: Omit<MaterialRequest, "id">) {
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...request,
      createdAt: new Date().toISOString(),
    })
    return docRef.id
  } catch (error) {
    console.error("Erro ao adicionar solicitação de material:", error)
    throw error
  }
}

// Buscar todas as solicitações de materiais
export async function fetchMaterialRequests(): Promise<MaterialRequest[]> {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"))
    const querySnapshot = await getDocs(q)

    return querySnapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
        }) as MaterialRequest,
    )
  } catch (error) {
    console.error("Erro ao buscar solicitações de materiais:", error)
    throw error
  }
}

// Buscar uma solicitação de material específica
export async function fetchMaterialRequest(id: string): Promise<MaterialRequest | null> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id)
    const docSnap = await getDoc(docRef)

    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data(),
      } as MaterialRequest
    } else {
      return null
    }
  } catch (error) {
    console.error("Erro ao buscar solicitação de material:", error)
    throw error
  }
}

// Atualizar uma solicitação de material
export async function updateMaterialRequest(id: string, data: Partial<MaterialRequest>) {
  try {
    const docRef = doc(db, COLLECTION_NAME, id)
    await updateDoc(docRef, {
      ...data,
      updatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Erro ao atualizar solicitação de material:", error)
    throw error
  }
}

// Excluir uma solicitação de material
export async function deleteMaterialRequest(id: string) {
  try {
    const docRef = doc(db, COLLECTION_NAME, id)
    await deleteDoc(docRef)
  } catch (error) {
    console.error("Erro ao excluir solicitação de material:", error)
    throw error
  }
}
