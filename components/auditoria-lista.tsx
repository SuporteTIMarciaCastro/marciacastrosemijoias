"use client"

import { getAcaoLabel, getAcaoCor } from "@/lib/auditoria"
import { cn } from "@/lib/utils"
import type { RegistroAuditoria } from "@/types"

interface AuditoriaListaProps {
  registros: RegistroAuditoria[]
  isLoading?: boolean
  /** mostra o nome de quem fez; falso na ficha, onde já há espaço limitado */
  vazio?: string
}

export default function AuditoriaLista({
  registros,
  isLoading,
  vazio = "Nenhuma ação registrada.",
}: AuditoriaListaProps) {
  if (isLoading) {
    return <div className="text-center py-4">Carregando...</div>
  }

  if (registros.length === 0) {
    return <div className="py-4 text-sm text-muted-foreground">{vazio}</div>
  }

  return (
    <ul className="space-y-2">
      {registros.map((registro) => (
        <li key={registro.id} className="rounded-md border p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                getAcaoCor(registro.acao)
              )}
            >
              {getAcaoLabel(registro.acao)}
            </span>
            <span className="text-xs text-muted-foreground">
              {new Date(registro.criadoEm).toLocaleString("pt-BR")}
              {registro.usuarioNome || registro.usuarioEmail
                ? ` · ${registro.usuarioNome || registro.usuarioEmail}`
                : ""}
            </span>
          </div>

          <p className="mt-2 text-sm text-foreground/85">{registro.descricao}</p>

          {registro.alteracoes && registro.alteracoes.length > 0 && (
            <ul className="mt-2 space-y-0.5 border-l pl-3 text-xs text-muted-foreground">
              {registro.alteracoes.map((alteracao, indice) => (
                <li key={`${alteracao.campo}-${indice}`}>
                  <span className="font-medium">{alteracao.campo}:</span>{" "}
                  <span className="line-through">{alteracao.de}</span> → {alteracao.para}
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  )
}
