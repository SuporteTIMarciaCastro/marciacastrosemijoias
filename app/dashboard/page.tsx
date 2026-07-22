"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/auth-context"
import Header from "@/components/header"
import { PermissionKey } from "@/types/permissions"

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
    { title: "Lista de Retiradas", path: "https://marciacastro.lovable.app/auth", permission: null, external: true },
    { title: "Lista de Materiais", path: "/lista-solicitacoes", permission: "listaMateriais" },
    { title: "Lista de Pagamentos", path: "/pagamentos", permission: "pagamentos" },
    { title: "Lista de Usuários", path: "/usuarios", permission: "listaUsuarios" },
    { title: "Estatísticas de Atendimento", path: "/estatisticas-atendimento", permission: "estatisticasAtendimento" },
  ]

  const filteredMenuItems = menuItems.filter(item => {
    if (!item.permission) return true
    return user.permissions?.[item.permission]?.visualizarPage
  })

  return (
    <div className="flex min-h-screen flex-col">
      <Header title="Dashboard" />

      <main className="flex-1 p-4 md:p-6">
        <div className="max-w-md mx-auto">
          <Card className="shadow-elevated">
            <CardHeader className="pb-2">
              <div className="flex justify-center mb-3">
                <Image src="/logo-preto.png" alt="Marcia Castro Semijoias" width={200} height={84} priority className="h-auto w-[180px] object-contain dark:invert" />
              </div>
              <div className="mx-auto mb-2 h-px w-12 bg-primary/40" />
              <CardTitle className="text-center text-3xl">Menu Principal</CardTitle>
              <CardDescription className="text-center">Escolha uma opção:</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              {filteredMenuItems.map((item, index) => (
                <Button
                  key={index}
                  className="w-full h-12 justify-center text-base font-medium tracking-wide"
                  onClick={() => item.external ? window.open(item.path, "_blank") : router.push(item.path)}
                >
                  {item.title}
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
