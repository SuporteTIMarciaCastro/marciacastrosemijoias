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
  const wishlistRef = collection(db, "wishlist")
  const snapshot = await getDocs(wishlistRef)
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as WishlistItem[]
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
export async function updateWishlistItem(id: string, data: Omit<WishlistItem, "id">): Promise<void> {
  const docRef = doc(db, "wishlist", id)
  await updateDoc(docRef, data)
}

// Excluir um item da lista de desejos
export async function deleteWishlistItem(id: string): Promise<void> {
  const docRef = doc(db, "wishlist", id)
  await deleteDoc(docRef)
}

export async function fetchWishlistItemById(id: string): Promise<WishlistItem> {
  const docRef = doc(db, "wishlist", id)
  const docSnap = await getDoc(docRef)
  
  if (!docSnap.exists()) {
    throw new Error("Item não encontrado")
  }

  return {
    id: docSnap.id,
    ...docSnap.data(),
  } as WishlistItem
}
