import { collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc, query, orderBy, limit as fbLimit, startAfter as fbStartAfter, startAt as fbStartAt, endAt as fbEndAt, where, QueryDocumentSnapshot } from "firebase/firestore"
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

// Finalizar uma garantia
export async function finalizeWarrantyItem(id: string) {
  try {
    const docRef = doc(db, COLLECTION_NAME, id)
    await updateDoc(docRef, {
      finalized: true,
      updatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Erro ao finalizar garantia:", error)
    throw error
  }
}

// Buscar garantias paginadas
export async function fetchWarrantyItemsPaginated(limitValue: number = 20, startAfterDoc?: QueryDocumentSnapshot): Promise<{ items: WarrantyItem[], lastDoc: QueryDocumentSnapshot | null }> {
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
      }) as WarrantyItem
    )
    const lastDoc = querySnapshot.docs.length > 0 ? querySnapshot.docs[querySnapshot.docs.length - 1] : null
    return { items, lastDoc }
  } catch (error) {
    console.error("Erro ao buscar garantias paginadas:", error)
    throw error
  }
}

// Buscar garantias paginadas filtrando por nome (prefixo) - busca real usando o campo 'nome'
export async function fetchWarrantyItemsPaginatedByName(searchTerm: string, limitValue: number = 20, startAfterDoc?: QueryDocumentSnapshot): Promise<{ items: WarrantyItem[], lastDoc: QueryDocumentSnapshot | null }> {
  try {
    const col = collection(db, COLLECTION_NAME);
    const searchTermLower = searchTerm.toLowerCase();
    let constraints = [
      orderBy("nome"),
      fbStartAt(searchTermLower),
      fbEndAt(searchTermLower + '\uf8ff'),
      fbLimit(limitValue)
    ];
    if (startAfterDoc) {
      constraints.push(fbStartAfter(startAfterDoc));
    }
    const q = query(col, ...constraints);
    const querySnapshot = await getDocs(q);
    const items = querySnapshot.docs.map(
      (doc) => ({
        id: doc.id,
        ...doc.data(),
      }) as WarrantyItem
    );
    const lastDoc = querySnapshot.docs.length > 0 ? querySnapshot.docs[querySnapshot.docs.length - 1] : null;
    return { items, lastDoc };
  } catch (error) {
    console.error("Erro ao buscar garantias paginadas por nome:", error);
    throw error;
  }
}

// Buscar garantias paginadas com filtros dinâmicos (loja, status, finalizada, nome)
export async function fetchWarrantyItemsPaginatedWithFilters({
  searchTerm = "",
  loja = "todas",
  status = "todos",
  finalizada = "todas",
  limitValue = 20,
  startAfterDoc = undefined
}: {
  searchTerm?: string,
  loja?: string,
  status?: string,
  finalizada?: string,
  limitValue?: number,
  startAfterDoc?: QueryDocumentSnapshot | undefined
}): Promise<{ items: WarrantyItem[], lastDoc: QueryDocumentSnapshot | null }> {
  try {
    const col = collection(db, COLLECTION_NAME);
    const constraints: any[] = [];
    // Filtros
    if (loja && loja !== "todas") {
      constraints.push(where("loja", "==", loja));
    }
    if (status && status !== "todos") {
      constraints.push(where("status", "==", status));
    }
    if (finalizada && finalizada !== "todas") {
      constraints.push(where("finalized", "==", finalizada === "sim"));
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
      }) as WarrantyItem
    );
    const lastDoc = querySnapshot.docs.length > 0 ? querySnapshot.docs[querySnapshot.docs.length - 1] : null;
    return { items, lastDoc };
  } catch (error) {
    console.error("Erro ao buscar garantias paginadas com filtros:", error);
    throw error;
  }
}

// Atualizar um documento de garantia para incluir o campo nomeLower
export async function updateOneWarrantyWithNomeLower(id: string) {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      throw new Error("Documento não encontrado");
    }
    const data = docSnap.data();
    const nome = data.nome || "";
    const nomeLower = nome.toLowerCase();
    await updateDoc(docRef, { nomeLower });
    return { id, nome, nomeLower };
  } catch (error) {
    console.error("Erro ao atualizar nomeLower:", error);
    throw error;
  }
}
