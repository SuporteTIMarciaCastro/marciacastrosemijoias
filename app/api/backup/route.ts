import { NextResponse } from "next/server";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { verificarToken, naoAutorizado } from "@/lib/firebase/verificar-token"

//  essa rota retorna todo o banco de dados
export async function GET(req: Request) {
  const usuarioAutenticado = await verificarToken(req)
  if (!usuarioAutenticado) return naoAutorizado()


  try {
    // Backup da lista de desejos
    const wishlistRef = collection(db, "wishlist");
    const wishlistSnap = await getDocs(wishlistRef);
    const wishlist = wishlistSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));

    // Backup das solicitações de materiais
    const materialRequestsRef = collection(db, "material-requests");
    const materialRequestsSnap = await getDocs(materialRequestsRef);
    const materialRequests = materialRequestsSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));

    // Backup da lista de pagamentos
    const pagamentosRef = collection(db, "pagamentos");
    const pagamentosSnap = await getDocs(pagamentosRef);
    const pagamentos = pagamentosSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));

    // Backup da lista de garantias
    const warrantyRef = collection(db, "warranty");
    const warrantySnap = await getDocs(warrantyRef);
    const warranty = warrantySnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));

    // Backup da coleção de usuários
    const usersRef = collection(db, "users");
    const usersSnap = await getDocs(usersRef);
    const users = usersSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));

    return NextResponse.json({
      success: true,
      wishlist,
      materialRequests,
      pagamentos,
      warranty,
      users
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
} 