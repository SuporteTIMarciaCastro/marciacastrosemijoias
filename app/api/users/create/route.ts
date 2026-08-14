import { NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { verificarToken, naoAutorizado } from "@/lib/firebase/verificar-token"

export async function POST(req: Request) {
  const usuarioAutenticado = await verificarToken(req)
  if (!usuarioAutenticado) return naoAutorizado()


  try {
    const body = await req.json()
    const { name, email, password, isAdmin, permissions } = body as {
      name: string
      email: string
      password: string
      isAdmin: boolean
      permissions: any
    }

    console.log('[API /users/create] input', {
      name,
      email,
      passwordLen: password?.length ?? 0,
      isAdmin,
      permsKeys: permissions ? Object.keys(permissions) : [],
    })

    if (!email || !password) {
      console.warn('[API /users/create] missing email or password')
      return NextResponse.json({ error: 'Email e senha são obrigatórios.' }, { status: 400 })
    }

    // 1) Cria usuário no Firebase Authentication
    console.log('[API /users/create] creating auth user')
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: name || undefined,
      emailVerified: false,
      disabled: false,
    })
    console.log('[API /users/create] auth user created', { uid: userRecord.uid })

    const uid = userRecord.uid

    // 2) Cria o documento no Firestore com o mesmo UID
    console.log('[API /users/create] writing user doc to Firestore', { uid })
    await adminDb.collection('users').doc(uid).set({
      email,
      name: name || '',
      isAdmin: Boolean(isAdmin),
      permissions: permissions || {},
    })
    console.log('[API /users/create] user doc written', { uid })

    return NextResponse.json({ uid }, { status: 201 })
  } catch (err: any) {
    console.error('[API /users/create] error', { message: err?.message, stack: err?.stack })
    return NextResponse.json({ error: err?.message || 'Erro interno' }, { status: 500 })
  }
}
