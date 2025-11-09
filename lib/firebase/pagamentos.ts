import { collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc, query, orderBy, limit as fbLimit, startAfter as fbStartAfter, QueryDocumentSnapshot, where } from "firebase/firestore"
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
  } catch (error: any) {
    console.error("Erro ao buscar pagamentos:", error)
    
    // Verificar se é erro de índice faltando do Firestore
    // Códigos de erro: 'failed-precondition' (string) ou 9 (número) para índice faltando
    if (error?.code === 'failed-precondition' || error?.code === 9 || error?.message?.includes('index')) {
      // Extrair link do índice da mensagem de erro
      const errorMessage = error?.message || '';
      
      // Tentar vários padrões de link
      const linkPatterns = [
        /https:\/\/console\.firebase\.google\.com[^\s\)]+/g,
        /https:\/\/console\.firebase\.google\.com\/project\/[^\/]+\/firestore[^\s\)]+/g,
      ];
      
      let indexLink: string | null = null;
      for (const pattern of linkPatterns) {
        const matches = errorMessage.match(pattern);
        if (matches && matches[0]) {
          indexLink = matches[0];
          break;
        }
      }
      
      if (!indexLink && error?.link) {
        indexLink = error.link;
      }
      
      if (indexLink) {
        const customError = new Error(`Índice do Firestore necessário. Crie o índice em: ${indexLink}`);
        (customError as any).code = error.code;
        (customError as any).indexLink = indexLink;
        (customError as any).isIndexError = true;
        throw customError;
      }
    }
    
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

// Buscar pagamentos com filtros e busca global
export async function fetchPagamentosWithFilters({
  searchTerm = "",
  criadoPor = "",
  dataInicio = "",
  dataFim = "",
  limitValue = 10,
  startAfterDoc = undefined
}: {
  searchTerm?: string,
  criadoPor?: string,
  dataInicio?: string,
  dataFim?: string,
  limitValue?: number,
  startAfterDoc?: QueryDocumentSnapshot | undefined
}): Promise<{ pagamentos: Pagamento[], lastDoc: QueryDocumentSnapshot | null }> {
  try {
    // Se há apenas busca global (searchTerm) sem filtros do Firestore, fazer busca global completa
    const hasFirestoreFilters = (criadoPor && criadoPor.trim() !== "" && criadoPor !== "todos") || 
                                 (dataInicio && dataInicio.trim() !== "") || 
                                 (dataFim && dataFim.trim() !== "");
    
    const searchTermLower = searchTerm.trim().toLowerCase();
    const hasSearchTerm = searchTermLower.length > 0;
    
    // Se há apenas busca global sem filtros do Firestore, buscar todos e filtrar no cliente
    if (hasSearchTerm && !hasFirestoreFilters) {
      const allPagamentos = await fetchAllPagamentos();
      const filtered = allPagamentos.filter((p) =>
        (p.finalidade?.toLowerCase().includes(searchTermLower) ||
          p.justificativa?.toLowerCase().includes(searchTermLower) ||
          p.tipo?.toLowerCase().includes(searchTermLower) ||
          p.situacao?.toLowerCase().includes(searchTermLower) ||
          p.criadoPor?.toLowerCase().includes(searchTermLower))
      );
      
      // Aplicar paginação no resultado filtrado
      const startIndex = startAfterDoc ? filtered.findIndex(p => p.id === startAfterDoc.id) + 1 : 0;
      const paginated = filtered.slice(startIndex, startIndex + limitValue);
      
      // Criar um documento fake para lastDoc (para paginação)
      const lastDoc = paginated.length > 0 ? { id: paginated[paginated.length - 1].id } as QueryDocumentSnapshot : null;
      return { pagamentos: paginated, lastDoc };
    }
    
    // Se há filtros do Firestore, aplicar query no Firestore
    const col = collection(db, COLLECTION_NAME);
    const constraints: any[] = [];

    // Filtro por criadoPor
    if (criadoPor && criadoPor.trim() !== "" && criadoPor !== "todos") {
      constraints.push(where("criadoPor", "==", criadoPor));
    }

    // Filtro por período (data de criação)
    if (dataInicio && dataInicio.trim() !== "") {
      const inicioDate = new Date(dataInicio);
      inicioDate.setHours(0, 0, 0, 0);
      const inicioISO = inicioDate.toISOString();
      constraints.push(where("createdAt", ">=", inicioISO));
    }

    if (dataFim && dataFim.trim() !== "") {
      const fimDate = new Date(dataFim);
      fimDate.setHours(23, 59, 59, 999);
      const fimISO = fimDate.toISOString();
      constraints.push(where("createdAt", "<=", fimISO));
    }

    // Ordenação baseada nos filtros aplicados
    // Se há filtro por criadoPor E data, ordenar por criadoPor e createdAt
    if (criadoPor && criadoPor.trim() !== "" && criadoPor !== "todos" && (dataInicio || dataFim)) {
      constraints.push(orderBy("criadoPor", "asc"));
      constraints.push(orderBy("createdAt", "desc"));
    }
    // Se há apenas filtro de data, ordenar apenas por createdAt
    else if (dataInicio || dataFim) {
      constraints.push(orderBy("createdAt", "desc"));
    } 
    // Se há apenas filtro por criadoPor, ordenar por criadoPor e createdAt
    else if (criadoPor && criadoPor.trim() !== "" && criadoPor !== "todos") {
      constraints.push(orderBy("criadoPor", "asc"));
      constraints.push(orderBy("createdAt", "desc"));
    } 
    // Ordenação padrão (situacaoOrder + createdAt)
    else {
      constraints.push(orderBy("situacaoOrder", "asc"));
      constraints.push(orderBy("createdAt", "desc"));
    }

    constraints.push(fbLimit(limitValue));
    
    if (startAfterDoc) {
      constraints.push(fbStartAfter(startAfterDoc));
    }

    const q = query(col, ...constraints);
    const querySnapshot = await getDocs(q);
    
    let pagamentos = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Pagamento[];

    // Se há busca por termo E filtros do Firestore, filtrar no cliente também
    if (hasSearchTerm && hasFirestoreFilters) {
      pagamentos = pagamentos.filter((p) =>
        (p.finalidade?.toLowerCase().includes(searchTermLower) ||
          p.justificativa?.toLowerCase().includes(searchTermLower) ||
          p.tipo?.toLowerCase().includes(searchTermLower) ||
          p.situacao?.toLowerCase().includes(searchTermLower) ||
          p.criadoPor?.toLowerCase().includes(searchTermLower))
      );
    }

    const lastDoc = querySnapshot.docs.length > 0 ? querySnapshot.docs[querySnapshot.docs.length - 1] : null;
    return { pagamentos, lastDoc };
  } catch (error: any) {
    console.error("Erro ao buscar pagamentos com filtros:", error);
    
    // Verificar se é erro de índice faltando do Firestore
    // Códigos de erro: 'failed-precondition' (string) ou 9 (número) para índice faltando
    if (error?.code === 'failed-precondition' || error?.code === 9 || error?.message?.includes('index')) {
      // Extrair link do índice da mensagem de erro
      const errorMessage = error?.message || '';
      
      // Tentar vários padrões de link
      const linkPatterns = [
        /https:\/\/console\.firebase\.google\.com[^\s\)]+/g,
        /https:\/\/console\.firebase\.google\.com\/project\/[^\/]+\/firestore[^\s\)]+/g,
      ];
      
      let indexLink: string | null = null;
      for (const pattern of linkPatterns) {
        const matches = errorMessage.match(pattern);
        if (matches && matches[0]) {
          indexLink = matches[0];
          break;
        }
      }
      
      if (!indexLink && error?.link) {
        indexLink = error.link;
      }
      
      if (indexLink) {
        const customError = new Error(`Índice do Firestore necessário. Crie o índice em: ${indexLink}`);
        (customError as any).code = error.code;
        (customError as any).indexLink = indexLink;
        (customError as any).isIndexError = true;
        throw customError;
      }
    }
    
    throw error;
  }
}

// Buscar todos os pagamentos (para busca global)
async function fetchAllPagamentos(): Promise<Pagamento[]> {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }) as Pagamento);
  } catch (error) {
    console.error("Erro ao buscar todos os pagamentos:", error);
    throw error;
  }
}

// Buscar lista de usuários únicos que criaram pagamentos
export async function fetchCriadoresPagamentos(): Promise<string[]> {
  try {
    const q = query(collection(db, COLLECTION_NAME));
    const querySnapshot = await getDocs(q);
    const criadores = new Set<string>();
    
    querySnapshot.docs.forEach((doc) => {
      const data = doc.data();
      if (data.criadoPor && data.criadoPor.trim() !== "") {
        criadores.add(data.criadoPor);
      }
    });
    
    return Array.from(criadores).sort();
  } catch (error) {
    console.error("Erro ao buscar criadores de pagamentos:", error);
    throw error;
  }
}