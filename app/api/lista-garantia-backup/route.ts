import { NextResponse } from "next/server";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { verificarToken, naoAutorizado } from "@/lib/firebase/verificar-token"

export async function GET(req: Request) {
  const usuarioAutenticado = await verificarToken(req)
  if (!usuarioAutenticado) return naoAutorizado()


  try {
    const colRef = collection(db, "warranty");
    const snapshot = await getDocs(colRef);
    const garantias = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
    return NextResponse.json({ success: true, total: garantias.length, garantias });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
} 