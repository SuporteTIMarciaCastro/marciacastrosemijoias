import { collection, getDocs, doc, getDoc, updateDoc, deleteDoc, query, orderBy, limit as fbLimit, startAfter as fbStartAfter, startAt as fbStartAt, endAt as fbEndAt, where, runTransaction, QueryDocumentSnapshot } from "firebase/firestore"
import { db } from "./config"
import type { WarrantyItem } from "@/types"

const COLLECTION_NAME = "warranty"

// Contador atômico usado para gerar o numeroPedido sequencial.
const COUNTER_COLLECTION = "counters"
const COUNTER_DOC_ID = "warranty"
// Primeiro número emitido. Fica acima do volume de registros antigos (~1005),
// que não possuem numeroPedido e continuam exibindo "—".
const NUMERO_PEDIDO_INICIAL = 1006
const normalizeWhatsappValue = (value: unknown): string => {
  if (typeof value === "string" || typeof value === "number") {
    return String(value).replace(/\D+/g, "")
  }
  return ""
}

const isPhoneSearch = (term: string): boolean => normalizeWhatsappValue(term).length >= 3

// Detecta busca pelo Nº do pedido: "1006" ou "#1006".
// Telefones normalizados têm 10-11 dígitos (com DDD), então o limite de 6 dígitos
// mantém a busca por WhatsApp funcionando como antes.
const parseNumeroPedidoSearch = (term: string): number | null => {
  const cleaned = term.trim().replace(/^#/, "")
  if (!/^\d{1,6}$/.test(cleaned)) return null
  const numero = Number(cleaned)
  return numero > 0 ? numero : null
}

// Adicionar uma nova garantia
//
// O numeroPedido é gerado dentro de uma transaction junto com a criação do
// documento. Isso garante duas coisas:
//  1. Dois cadastros simultâneos nunca recebem o mesmo número — se o contador
//     mudar entre a leitura e a escrita, o Firestore re-executa a transaction.
//  2. Se a criação falhar, o número não é consumido (sem buracos na sequência),
//     porque contador e garantia são gravados na mesma operação atômica.
export async function addWarrantyItem(item: Omit<WarrantyItem, "id">) {
  try {
    const counterRef = doc(db, COUNTER_COLLECTION, COUNTER_DOC_ID)
    // Gera o ID do documento localmente (sem ida à rede) para poder criá-lo
    // dentro da transaction.
    const warrantyRef = doc(collection(db, COLLECTION_NAME))

    await runTransaction(db, async (transaction) => {
      const counterSnap = await transaction.get(counterRef)
      const ultimoNumero = counterSnap.exists() ? Number(counterSnap.data()?.ultimoNumero) : Number.NaN
      // Contador ainda não existe (primeira garantia) ou está com valor inválido.
      const proximoNumero = Number.isFinite(ultimoNumero) ? ultimoNumero + 1 : NUMERO_PEDIDO_INICIAL

      transaction.set(counterRef, { ultimoNumero: proximoNumero }, { merge: true })
      transaction.set(warrantyRef, {
        ...item,
        whatsapp: normalizeWhatsappValue(item.whatsapp),
        numeroPedido: proximoNumero,
        createdAt: new Date().toISOString(),
      })
    })

    return warrantyRef.id
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
    const updatePayload: Partial<WarrantyItem> = {
      ...data,
      updatedAt: new Date().toISOString(),
    }

    if (Object.prototype.hasOwnProperty.call(data, "whatsapp")) {
      updatePayload.whatsapp = normalizeWhatsappValue(data.whatsapp)
    }

    await updateDoc(docRef, updatePayload)
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

    // Busca pelo Nº do pedido: é um identificador único, então faz uma consulta
    // de igualdade direta e ignora os demais filtros (o pedido procurado é
    // sempre exibido, mesmo que esteja em outra loja ou outro status).
    // Sem orderBy/composite index — usa apenas o índice de campo único.
    const numeroPedidoBuscado = parseNumeroPedidoSearch(searchTerm);
    if (numeroPedidoBuscado !== null) {
      const numeroQuery = query(col, where("numeroPedido", "==", numeroPedidoBuscado), fbLimit(limitValue));
      const numeroSnapshot = await getDocs(numeroQuery);
      const numeroItems = numeroSnapshot.docs.map(
        (doc) => ({
          id: doc.id,
          ...doc.data(),
        }) as WarrantyItem
      );
      return { items: numeroItems, lastDoc: null };
    }

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
    const rawSearchTerm = searchTerm.trim();
    const searchTermLower = rawSearchTerm.toLowerCase();
    const normalizedPhoneSearch = normalizeWhatsappValue(rawSearchTerm);
    const usePhoneSearch = rawSearchTerm.length > 0 && isPhoneSearch(rawSearchTerm);

    if (rawSearchTerm) {
      if (usePhoneSearch) {
        constraints.push(orderBy("whatsapp"));
        constraints.push(fbStartAt(normalizedPhoneSearch));
        constraints.push(fbEndAt(normalizedPhoneSearch + '\uf8ff'));
      } else {
        constraints.push(orderBy("nome"));
        constraints.push(fbStartAt(searchTermLower));
        constraints.push(fbEndAt(searchTermLower + '\uf8ff'));
      }
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
