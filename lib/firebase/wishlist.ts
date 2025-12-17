import { collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc, query, orderBy, limit as fbLimit, startAfter as fbStartAfter, startAt as fbStartAt, endAt as fbEndAt, where, QueryDocumentSnapshot, getCountFromServer } from "firebase/firestore"
import { db } from "./config"
import type { WishlistItem } from "@/types"

const COLLECTION_NAME = "wishlist"
const normalizePhone = (phone: string) => phone?.replace(/\D/g, "") || ""

// Adicionar um novo item à lista de desejos
export async function addWishlistItem(item: Omit<WishlistItem, "id">) {
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...item,
      celular: normalizePhone(item.celular),
      nome: item.nome?.toLowerCase() || '', // Converter nome para lowercase
      data: new Date().toISOString(),
      status: 'Pendente',
      createdAt: new Date().toISOString(),
    })
    return docRef.id
  } catch (error) {
    console.error("Erro ao adicionar item à lista de desejos:", error)
    throw error
  }
}

// Buscar todos os itens da lista de desejos (mantido para compatibilidade)
export async function fetchWishlistItems(): Promise<WishlistItem[]> {
  const wishlistRef = collection(db, "wishlist")
  const snapshot = await getDocs(wishlistRef)
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as WishlistItem[]
}

// Buscar itens da lista de desejos paginados
export async function fetchWishlistItemsPaginated(limitValue: number = 20, startAfterDoc?: QueryDocumentSnapshot): Promise<{ items: WishlistItem[], lastDoc: QueryDocumentSnapshot | null, totalCount: number }> {
  try {
    let q
    if (startAfterDoc) {
      q = query(
        collection(db, COLLECTION_NAME),
        orderBy("createdAt", "desc"),
        fbLimit(limitValue),
        fbStartAfter(startAfterDoc)
      )
    } else {
      q = query(
        collection(db, COLLECTION_NAME),
        orderBy("createdAt", "desc"),
        fbLimit(limitValue)
      )
    }
    const querySnapshot = await getDocs(q)
    const items = querySnapshot.docs.map(
      (doc) => ({
        id: doc.id,
        ...doc.data(),
      }) as WishlistItem
    )
    const lastDoc = querySnapshot.docs.length > 0 ? querySnapshot.docs[querySnapshot.docs.length - 1] : null
    
    // Buscar contagem total
    const countQuery = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"));
    const countSnapshot = await getDocs(countQuery);
    const totalCount = countSnapshot.size;
    
    return { items, lastDoc, totalCount }
  } catch (error) {
    console.error("Erro ao buscar itens paginados:", error)
    
    // Verificar se é erro de índice faltando
    if (error instanceof Error && error.message.includes('indexes')) {
      console.log("🔥 CRIE OS ÍNDICES DO FIREBASE AQUI: https://console.firebase.google.com");
      console.log("📋 Instruções completas em: firebase-indexes.md");
    }
    
    throw error
  }
}

// Buscar itens da lista de desejos paginados com filtros
export async function fetchWishlistItemsPaginatedWithFilters({
  searchTerm = "",
  lojaDestino = "todas",
  avisado = "todos",
  limitValue = 20,
  startAfterDoc = undefined
}: {
  searchTerm?: string,
  lojaDestino?: string,
  avisado?: string,
  limitValue?: number,
  startAfterDoc?: QueryDocumentSnapshot | undefined
}): Promise<{ items: WishlistItem[], lastDoc: QueryDocumentSnapshot | null, totalCount: number }> {
  try {
    const col = collection(db, COLLECTION_NAME);
    const constraints: any[] = [];
    
    // Filtros
    if (lojaDestino && lojaDestino !== "todas") {
      constraints.push(where("lojaDestino", "==", lojaDestino));
    }
    if (avisado && avisado !== "todos") {
      constraints.push(where("avisado", "==", avisado === "sim"));
    }
    
    // Busca por nome (prefixo)
    let searchTermLower = searchTerm.trim().toLowerCase();
    if (searchTermLower) {
      constraints.push(orderBy("nome"));
      constraints.push(fbStartAt(searchTermLower));
      constraints.push(fbEndAt(searchTermLower + '\uf8ff'));
    } else {
      constraints.push(orderBy("createdAt", "desc"));
    }
    
    constraints.push(fbLimit(limitValue));
    
    if (startAfterDoc) {
      constraints.push(fbStartAfter(startAfterDoc));
    }
    
    const q = query(col, ...constraints);
    const querySnapshot = await getDocs(q);
    const items = querySnapshot.docs.map(
      (doc) => ({
        id: doc.id,
        ...doc.data(),
      }) as WishlistItem
    );
    const lastDoc = querySnapshot.docs.length > 0 ? querySnapshot.docs[querySnapshot.docs.length - 1] : null;
    
    // Buscar contagem total para paginação
    const countConstraints: any[] = [];
    if (lojaDestino && lojaDestino !== "todas") {
      countConstraints.push(where("lojaDestino", "==", lojaDestino));
    }
    if (avisado && avisado !== "todos") {
      countConstraints.push(where("avisado", "==", avisado === "sim"));
    }
    if (searchTermLower) {
      countConstraints.push(orderBy("nome"));
      countConstraints.push(fbStartAt(searchTermLower));
      countConstraints.push(fbEndAt(searchTermLower + '\uf8ff'));
    } else {
      countConstraints.push(orderBy("createdAt", "desc"));
    }
    
    const countQuery = query(col, ...countConstraints);
    const countSnapshot = await getDocs(countQuery);
    const totalCount = countSnapshot.size;
    
    return { items, lastDoc, totalCount };
  } catch (error) {
    console.error("Erro ao buscar itens paginados com filtros:", error);
    
    // Verificar se é erro de índice faltando
    if (error instanceof Error && error.message.includes('indexes')) {
      console.log("🔥 CRIE OS ÍNDICES DO FIREBASE AQUI: https://console.firebase.google.com");
      console.log("📋 Instruções completas em: firebase-indexes.md");
    }
    
    throw error;
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
export async function updateWishlistItem(id: string, data: Partial<Omit<WishlistItem, "id">>): Promise<void> {
  const docRef = doc(db, "wishlist", id)
  const updateData = { ...data }
  
  // Se o nome foi alterado, converter para lowercase
  if (data.nome) {
    updateData.nome = data.nome.toLowerCase()
  }
  if (data.celular) {
    updateData.celular = normalizePhone(data.celular)
  }
  
  await updateDoc(docRef, updateData)
}

// Marcar um item como avisado
export async function markWishlistItemAsAvisado(id: string): Promise<void> {
  const docRef = doc(db, "wishlist", id)
  await updateDoc(docRef, { avisado: true })
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
