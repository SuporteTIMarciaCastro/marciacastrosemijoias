"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  User as FirebaseUser
} from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"
import { auth, db } from "../lib/firebase"
import { User, UserPermissions } from "@/types/permissions"

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string, remember15?: boolean) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Cache simples em memória
const userCache = new Map<string, User>()

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Verifica expiração customizada de "lembrar por 15 dias"
          const rememberUntil = (() => {
            try { return localStorage.getItem('auth_remember_until') } catch { return null }
          })()
          if (rememberUntil) {
            const expiresAt = Number(rememberUntil)
            if (Number.isFinite(expiresAt) && Date.now() > expiresAt) {
              // Expirado: força logout
              await signOut(auth)
              userCache.clear()
              setUser(null)
              setLoading(false)
              return
            }
          }
          // Verifica se o usuário já está em cache
          const cachedUser = userCache.get(firebaseUser.uid)
          
          if (cachedUser) {
            // Usa dados do cache
            setUser(cachedUser)
            setLoading(false)
            return
          }

          // Busca as informações adicionais do usuário no Firestore
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid))
          if (userDoc.exists()) {
            const userData = userDoc.data() as User
            const newUser = {
              id: firebaseUser.uid,
              email: firebaseUser.email!,
              name: userData.name,
              isAdmin: userData.isAdmin,
              permissions: userData.permissions
            }
            
            // Adiciona ao cache
            userCache.set(firebaseUser.uid, newUser)
            setUser(newUser)
          } else {
            throw new Error('Usuário não encontrado no sistema. Entre em contato com o administrador.')
          }
        } catch (error) {
          console.error('Erro ao carregar dados do usuário:', error)
          setUser(null)
          await signOut(auth)
        }
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const login = async (email: string, password: string, remember15: boolean = false) => {
    try {
      // Define persistência conforme preferência do usuário
      await setPersistence(auth, remember15 ? browserLocalPersistence : browserSessionPersistence)
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      // Controla expiração customizada de 15 dias (apenas quando lembrar estiver ativo)
      try {
        if (remember15) {
          const fifteenDaysMs = 15 * 24 * 60 * 60 * 1000
          localStorage.setItem('auth_remember_until', String(Date.now() + fifteenDaysMs))
        } else {
          localStorage.removeItem('auth_remember_until')
        }
      } catch {}

      // Verifica se o usuário já está em cache
      const cachedUser = userCache.get(user.uid)
      
      if (cachedUser) {
        // Usa dados do cache
        setUser(cachedUser)
        return
      }

      // Busca o documento do usuário no Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid))
      
      if (!userDoc.exists()) {
        throw new Error('Usuário não encontrado no sistema. Entre em contato com o administrador.')
      }

      const userData = userDoc.data() as User
      const newUser = {
        id: user.uid,
        email: user.email!,
        name: userData.name,
        isAdmin: userData.isAdmin,
        permissions: userData.permissions
      }
      
      // Adiciona ao cache
      userCache.set(user.uid, newUser)
      setUser(newUser)
    } catch (error: any) {
      console.error('Erro no login:', error)
      throw error
    }
  }

  const logout = async () => {
    try {
      await signOut(auth)
      setUser(null)
      // Limpa o cache ao fazer logout
      userCache.clear()
      try { localStorage.removeItem('auth_remember_until') } catch {}
    } catch (error) {
      console.error('Erro no logout:', error)
      throw error
    }
  }

  if (loading) {
    return <div>Carregando...</div>
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider")
  }
  return context
}
