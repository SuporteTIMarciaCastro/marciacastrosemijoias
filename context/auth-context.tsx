"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

interface User {
  username: string
}

interface AuthContextType {
  user: User | null
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Verificar se o usuário está logado ao carregar a página
    const storedUser = localStorage.getItem("user")
    if (storedUser) {
      setUser(JSON.parse(storedUser))
    }
    setLoading(false)
  }, [])

  const login = async (username: string, password: string) => {
    // Simulação de login - em produção, isso seria uma chamada para o Firebase Auth
    if (username === "adm" && password === "marcia@2025") {
      const user = { username }
      setUser(user)
      localStorage.setItem("user", JSON.stringify(user))
      return Promise.resolve()
    } else {
      return Promise.reject(new Error("Credenciais inválidas"))
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem("user")
  }

  if (loading) {
    return <div>Carregando...</div>
  }

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider")
  }
  return context
}
