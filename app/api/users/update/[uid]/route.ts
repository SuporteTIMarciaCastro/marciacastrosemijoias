import { NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'

export async function PATCH(
  req: Request,
  { params }: { params: { uid: string } }
) {
  try {
    const uid = params.uid
    const body = await req.json()
    const { name, email, password, isAdmin, permissions } = body as {
      name?: string
      email?: string
      password?: string
      isAdmin?: boolean
      permissions?: any
    }

    // Atualiza Authentication quando necessário
    if (name || email || password) {
      await adminAuth.updateUser(uid, {
        displayName: name,
        email: email,
        password: password,
      })
    }

    // Atualiza Firestore (merge)
    const dataToUpdate: Record<string, any> = {}
    if (typeof name !== 'undefined') dataToUpdate.name = name
    if (typeof email !== 'undefined') dataToUpdate.email = email
    if (typeof isAdmin !== 'undefined') dataToUpdate.isAdmin = Boolean(isAdmin)
    if (typeof permissions !== 'undefined') dataToUpdate.permissions = permissions

    if (Object.keys(dataToUpdate).length > 0) {
      await adminDb.collection('users').doc(uid).set(dataToUpdate, { merge: true })
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('Erro ao atualizar usuário via API', err)
    return NextResponse.json({ error: err?.message || 'Erro interno' }, { status: 500 })
  }
}
