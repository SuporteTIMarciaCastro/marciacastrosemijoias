import { collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc, query, orderBy } from "firebase/firestore"
import { db } from "./config"
import type { WarrantyItem } from "@/types"

const COLLECTION_NAME = "warranty"

// Adicionar uma nova garantia
export async function addWarrantyItem(item: Omit<WarrantyItem, "id">) {
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...item,
      createdAt: new Date().toISOString(),
    })
    return docRef.id
  } catch (error) {
    console.error("Erro ao adicionar garantia:", error)
    throw error
  }
}

// Buscar todas as garantias
export async function fetchWarrantyItems(): Promise<WarrantyItem[]> {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"))
    const querySnapshot = await getDocs(q)

    return querySnapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
        }) as WarrantyItem,
    )
  } catch (error) {
    console.error("Erro ao buscar garantias:", error)
    throw error
  }
}

// Buscar uma garantia específica
export async function fetchWarrantyItem(id: string): Promise<WarrantyItem | null> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id)
    const docSnap = await getDoc(docRef)

    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data(),
      } as WarrantyItem
    } else {
      return null
    }
  } catch (error) {
    console.error("Erro ao buscar garantia:", error)
    throw error
  }
}

// Atualizar uma garantia
export async function updateWarrantyItem(id: string, data: Partial<WarrantyItem>) {
  try {
    const docRef = doc(db, COLLECTION_NAME, id)
    await updateDoc(docRef, {
      ...data,
      updatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Erro ao atualizar garantia:", error)
    throw error
  }
}

// Excluir uma garantia
export async function deleteWarrantyItem(id: string) {
  try {
    const docRef = doc(db, COLLECTION_NAME, id)
    await deleteDoc(docRef)
  } catch (error) {
    console.error("Erro ao excluir garantia:", error)
    throw error
  }
}
