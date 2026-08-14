import { NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { verificarToken, naoAutorizado } from "@/lib/firebase/verificar-token"

export async function DELETE(
  _req: Request,
  { params }: { params: { uid: string } }
) {
  const usuarioAutenticado = await verificarToken(_req)
  if (!usuarioAutenticado) return naoAutorizado()


  const uid = params.uid
  try {
    // Tenta remover do Authentication primeiro
    try {
      await adminAuth.deleteUser(uid)
    } catch (e) {
      // Se não existir no Auth, segue para remover do Firestore
      console.warn('Usuário não encontrado no Auth ou erro ao excluir. Prosseguindo com Firestore.', e)
    }

    // Remove documento no Firestore
    await adminDb.collection('users').doc(uid).delete()

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('Erro ao excluir usuário via API', err)
    return NextResponse.json({ error: err?.message || 'Erro interno' }, { status: 500 })
  }
}
