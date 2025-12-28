import { NextResponse } from "next/server"
import { collection, doc, getDocs, writeBatch } from "firebase/firestore"
import { db } from "@/lib/firebase/config"

const COLLECTION_NAME = "warranty"
const BATCH_WRITE_LIMIT = 500

const normalizeWhatsApp = (value: unknown) => {
  if (typeof value === "string" || typeof value === "number") {
    return String(value).replace(/\D+/g, "")
  }
  return null
}

export async function GET() {
  try {
    const snapshot = await getDocs(collection(db, COLLECTION_NAME))
    const documents = snapshot.docs

    const updates = documents
      .map((docSnap) => {
        const normalized = normalizeWhatsApp(docSnap.data().whatsapp)
        if (normalized === null) {
          return null
        }
        const currentValue = typeof docSnap.data().whatsapp === "string" || typeof docSnap.data().whatsapp === "number" ? String(docSnap.data().whatsapp) : ""
        if (normalized === currentValue) {
          return null
        }
        return { id: docSnap.id, whatsapp: normalized }
      })
      .filter(Boolean) as { id: string; whatsapp: string }[]

    if (updates.length === 0) {
      return NextResponse.json({
        success: true,
        mode: "bulk",
        message: "Nenhum registro precisa de normalização.",
        total: documents.length,
        updated: 0,
        skipped: documents.length,
      })
    }

    for (let i = 0; i < updates.length; i += BATCH_WRITE_LIMIT) {
      const batch = writeBatch(db)
      const chunk = updates.slice(i, i + BATCH_WRITE_LIMIT)
      chunk.forEach(({ id, whatsapp }) => {
        batch.update(doc(db, COLLECTION_NAME, id), { whatsapp })
      })
      await batch.commit()
    }

    return NextResponse.json({
      success: true,
      mode: "bulk",
      total: documents.length,
      updated: updates.length,
      skipped: documents.length - updates.length,
    })
  } catch (error) {
    console.error("Erro ao normalizar WhatsApp das garantias:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Falha ao normalizar números de WhatsApp das garantias.",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
