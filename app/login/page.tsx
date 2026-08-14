"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
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
    <div className="min-h-screen lg:grid lg:grid-cols-[1.05fr_1fr]">
      {/* ---------- Painel da marca ---------- */}
      <aside className="relative hidden overflow-hidden bg-sidebar px-14 py-16 lg:flex lg:flex-col lg:justify-between">
        {/* A própria logo, ampliada e quase invisível, sangrando pelo canto:
            textura de marca sem precisar de imagem decorativa. */}
        <Image
          src="/logo-branca.png"
          alt=""
          aria-hidden="true"
          width={1200}
          height={508}
          className="pointer-events-none absolute -bottom-24 -right-40 w-[46rem] max-w-none opacity-[0.045]"
        />
        {/* Brilho da marca, contido e discreto */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-32 top-1/3 h-[34rem] w-[34rem] rounded-full opacity-20 blur-3xl"
          style={{ background: "radial-gradient(circle, hsl(var(--primary)) 0%, transparent 68%)" }}
        />

        <Image
          src="/logo-branca.png"
          alt="Marcia Castro Semijoias"
          width={260}
          height={110}
          priority
          className="relative h-11 w-auto object-contain"
        />

        <div className="relative max-w-md">
          {/* Fio vermelho: o único traço de cor deste lado */}
          <div className="mb-7 h-px w-14 bg-sidebar-primary" />
          <h2 className="text-[2.5rem] font-semibold leading-[1.15] tracking-[-0.032em] text-white">
            Garantias, desejos e revendas em um só lugar.
          </h2>
          <p className="mt-5 text-[0.9375rem] leading-relaxed text-white/50">
            O sistema comercial da Márcia Castro Semijoias — cadastros, ciclos de consignação,
            prestação de contas e documentação, do primeiro contato ao acerto final.
          </p>
        </div>

        <p className="relative text-xs tracking-wide text-white/35">
          Acesso restrito a colaboradores autorizados
        </p>
      </aside>

      {/* ---------- Formulário ---------- */}
      <main className="flex min-h-screen flex-col justify-center bg-background px-6 py-12 sm:px-10 lg:min-h-0 lg:px-16">
        {/* Marca no topo apenas quando o painel está oculto */}
        <div className="mb-10 lg:hidden">
          <Image
            src="/logo-preto.png"
            alt="Marcia Castro Semijoias"
            width={220}
            height={93}
            priority
            className="h-10 w-auto object-contain dark:invert"
          />
        </div>

        <div className="w-full max-w-[23rem]">
          <p className="eyebrow mb-2.5">Acesso ao sistema</p>
          <h1 className="text-[2rem] font-semibold leading-none tracking-[-0.03em]">
            Entrar
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Use as credenciais fornecidas pela administração.
          </p>

          <form onSubmit={handleSubmit} className="mt-9 space-y-5">
            <div className="space-y-2">
              <label htmlFor="email" className="block text-[0.8125rem] font-medium text-foreground/80">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="voce@marciacastrosemijoias.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-[0.8125rem] font-medium text-foreground/80">
                Senha
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="h-11 pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center rounded-r-md px-3.5 text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus-visible:text-foreground"
                  tabIndex={-1}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <Checkbox
                id="remember15"
                checked={remember15}
                onCheckedChange={(v) => setRemember15(!!v)}
              />
              <label
                htmlFor="remember15"
                className="cursor-pointer select-none text-sm text-muted-foreground"
              >
                Lembrar por 15 dias
              </label>
            </div>

            {errorMessage && (
              <p
                role="alert"
                aria-live="polite"
                className="rounded-md border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive"
              >
                {errorMessage}
              </p>
            )}

            <Button
              type="submit"
              className="h-12 w-full text-[0.9375rem] tracking-wide"
              disabled={isLoading || loading}
            >
              {isLoading ? "Entrando..." : "Entrar"}
            </Button>
          </form>

          <p className="mt-10 text-xs text-muted-foreground/60">
            Márcia Castro Semijoias · Sistema interno
          </p>
        </div>
      </main>
    </div>
  )
}
