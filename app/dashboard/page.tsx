"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { useAuth } from "@/context/auth-context"
import Header from "@/components/header"
import { PermissionKey } from "@/types/permissions"
import { ArrowRight } from "lucide-react"

interface MenuItem {
  title: string
  path: string
  permission: PermissionKey | null
  external?: boolean
}

export default function DashboardPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.replace("/login")
    }
  }, [user, loading, router])

  if (loading || !user) {
    return null
  }

  const menuItems: MenuItem[] = [
    { title: "Lista de Desejos", path: "/lista-desejos", permission: "listaDesejos" },
    { title: "Lista de Garantia", path: "/lista-garantia", permission: "listaGarantia" },
    { title: "Lista de Retiradas", path: "https://marciacastro.lovable.app/auth", permission: "listaRetiradas", external: true },
    { title: "Lista de Materiais", path: "/lista-solicitacoes", permission: "listaMateriais" },
    { title: "Lista de Pagamentos", path: "/pagamentos", permission: "pagamentos" },
    { title: "Lista de Usuários", path: "/usuarios", permission: "listaUsuarios" },
    { title: "Estatísticas de Atendimento", path: "/estatisticas-atendimento", permission: "estatisticasAtendimento" },
    { title: "Gerenciador de Revendas", path: "/gerenciador-revendas", permission: "gerenciadorRevendas" },
  ]

  const filteredMenuItems = menuItems.filter(item => {
    if (!item.permission) return true
    return user.permissions?.[item.permission]?.visualizarPage
  })

  return (
    <div className="flex min-h-screen flex-col">
      <Header title="Dashboard" />

      <main className="flex-1 p-4 md:p-8">
        <div className="mx-auto max-w-5xl">
          {/* Abertura */}
          <div className="mb-8 md:mb-10">
            <Image
              src="/logo-preto.png"
              alt="Marcia Castro Semijoias"
              width={200}
              height={84}
              priority
              className="mb-6 h-9 w-auto object-contain dark:invert"
            />
            <p className="eyebrow mb-2">Sistema interno</p>
            <h2 className="text-3xl font-semibold tracking-[-0.028em] md:text-[2.5rem]">
              {user?.name ? `Olá, ${user.name.split(" ")[0]}` : "Menu Principal"}
            </h2>
            <p className="mt-2 text-muted-foreground">
              {filteredMenuItems.length}{" "}
              {filteredMenuItems.length === 1 ? "módulo disponível" : "módulos disponíveis"} para o seu
              acesso.
            </p>
          </div>

          {/* Módulos */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredMenuItems.map((item, index) => (
              <button
                key={index}
                type="button"
                onClick={() =>
                  item.external ? window.open(item.path, "_blank") : router.push(item.path)
                }
                className="group flex items-center justify-between gap-4 rounded-xl border border-border/80 bg-card p-5 text-left shadow-soft transition-all duration-150 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[1.0625rem] font-semibold tracking-[-0.018em]">
                    {item.title}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {item.external ? "Abre em nova aba" : "Acessar módulo"}
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-all duration-150 group-hover:translate-x-0.5 group-hover:text-primary" />
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
