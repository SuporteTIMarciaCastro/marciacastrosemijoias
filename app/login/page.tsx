"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { useAuth } from "@/context/auth-context"
import { toast } from "@/components/ui/use-toast"
import { Eye, EyeOff } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [remember15, setRemember15] = useState<boolean>(false)
  const { login, user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard")
    }
  }, [user, loading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMessage(null)

    try {
      // Realiza login via contexto já configurado com persistência
      await login(email, password, remember15)
      
      toast({
        title: "Login realizado com sucesso",
        description: "Bem-vindo ao sistema!",
      })
      
      router.push("/dashboard")
    } catch (error: any) {
      let errorMessage = "Ocorreu um erro ao fazer login"
      
      // Adicionando log para debug
      console.log('Código do erro:', error.code)
      console.log('Erro completo:', error)
      
      // Tratamento específico dos erros do Firebase
      switch (error.code) {
        case 'auth/invalid-email':
          errorMessage = "O email informado é inválido"
          break
        case 'auth/user-disabled':
          errorMessage = "Esta conta foi desativada"
          break
        case 'auth/user-not-found':
          errorMessage = "Não existe uma conta com este email"
          break
        case 'auth/wrong-password':
          errorMessage = "Senha incorreta"
          break
        case 'auth/invalid-credential':
          // Verifica se o email está em um formato válido
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
          if (!emailRegex.test(email)) {
            errorMessage = "O formato do email é inválido"
          } else {
            errorMessage = "Email ou senha incorretos"
          }
          break
        case 'auth/too-many-requests':
          errorMessage = "Muitas tentativas de login. Tente novamente mais tarde"
          break
        case 'auth/network-request-failed':
          errorMessage = "Erro de conexão. Verifique sua internet"
          break
        default:
          console.error('Erro de autenticação:', error)
      }

      setErrorMessage(errorMessage)

      toast({
        title: "Erro de autenticação",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#18181b] px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md bg-[#23232b] text-white shadow-lg">
        <CardHeader className="space-y-2 text-center">
          <div className="flex justify-center mb-4">
            <Image src="/logo.png" alt="Marcia Castro Semijoias" width={120} height={120} priority />
          </div>
          <CardTitle className="text-2xl font-bold text-white">Comercial - Login</CardTitle>
          <CardDescription className="text-gray-300">Entre com suas credenciais para acessar o sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Input
                id="email"
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-[#18181b] text-white border-gray-600 placeholder-gray-400"
              />
            </div>
            <div className="space-y-2">
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-[#18181b] text-white border-gray-600 placeholder-gray-400 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-white focus:outline-none"
                  tabIndex={-1}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Checkbox id="remember15" checked={remember15} onCheckedChange={(v) => setRemember15(!!v)} />
                <label htmlFor="remember15" className="text-sm text-gray-300">Lembrar por 15 dias</label>
              </div>
              {errorMessage && (
                <p role="alert" aria-live="polite" className="text-red-400 text-sm mt-1">
                  {errorMessage}
                </p>
              )}
            </div>
            <Button 
              type="submit" 
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold" 
              disabled={isLoading || loading}
            >
              {isLoading ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
