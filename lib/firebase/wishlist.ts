import { collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc, query, orderBy } from "firebase/firestore"
import { db } from "./config"
import type { WishlistItem } from "@/types"

const COLLECTION_NAME = "wishlist"

// Adicionar um novo item à lista de desejos
export async function addWishlistItem(item: Omit<WishlistItem, "id">) {
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...item,
      createdAt: new Date().toISOString(),
    })
    return docRef.id
  } catch (error) {
    console.error("Erro ao adicionar item à lista de desejos:", error)
    throw error
  }
}

// Buscar todos os itens da lista de desejos
export async function fetchWishlistItems(): Promise<WishlistItem[]> {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"))
    const querySnapshot = await getDocs(q)

    return querySnapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
        }) as WishlistItem,
    )
  } catch (error) {
    console.error("Erro ao buscar itens da lista de desejos:", error)
    throw error
  }
}

// Buscar um item específico da lista de desejos
export async function fetchWishlistItem(id: string): Promise<WishlistItem | null> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id)
    const docSnap = await getDoc(docRef)

    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data(),
      } as WishlistItem
    } else {
      return null
    }
  } catch (error) {
    console.error("Erro ao buscar item da lista de desejos:", error)
    throw error
  }
}

// Atualizar um item da lista de desejos
export async function updateWishlistItem(id: string, data: Partial<WishlistItem>) {
  try {
    const docRef = doc(db, COLLECTION_NAME, id)
    await updateDoc(docRef, {
      ...data,
      updatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Erro ao atualizar item da lista de desejos:", error)
    throw error
  }
}

// Excluir um item da lista de desejos
export async function deleteWishlistItem(id: string) {
  try {
    const docRef = doc(db, COLLECTION_NAME, id)
    await deleteDoc(docRef)
  } catch (error) {
    console.error("Erro ao excluir item da lista de desejos:", error)
    throw error
  }
}
