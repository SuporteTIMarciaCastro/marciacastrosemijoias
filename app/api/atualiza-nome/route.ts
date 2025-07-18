import { NextResponse } from "next/server";
import { collection, getDocs, updateDoc, doc, deleteField } from "firebase/firestore";
import { db } from "@/lib/firebase/config";

export async function POST() {
  try {
    const colRef = collection(db, "warranty");
    const snapshot = await getDocs(colRef);
    let updated = 0;
    let errors: any[] = [];
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      const nomeOriginal = data.nome || "";
      const nomeAtualizado = nomeOriginal.trimStart().toLowerCase();
      try {
        await updateDoc(doc(colRef, docSnap.id), { nome: nomeAtualizado, nomeLower: deleteField() });
        updated++;
      } catch (err) {
        errors.push({ id: docSnap.id, error: String(err) });
      }
    }
    return NextResponse.json({ success: true, updated, total: snapshot.size, errors });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
} 