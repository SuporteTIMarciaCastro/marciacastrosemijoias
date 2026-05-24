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
          <Card>
            <CardHeader>
              <CardTitle className="text-center text-2xl">Menu Principal</CardTitle>
              <CardDescription className="text-center">Escolha uma opção:</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {filteredMenuItems.map((item, index) => (
                <Button 
                  key={index} 
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold" 
                  onClick={() => router.push(item.path)}
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
