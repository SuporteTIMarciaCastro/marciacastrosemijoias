// Utilitários de CPF. Isolados aqui para reuso nas próximas fatias do
// Gerenciador de Revendas (documentos, contratos, consignação).

// Mantém apenas os dígitos. É esse formato que vai para o Firestore.
export const normalizeCpf = (value: unknown): string => {
  if (typeof value === "string" || typeof value === "number") {
    return String(value).replace(/\D+/g, "")
  }
  return ""
}

// Valida os dois dígitos verificadores do CPF.
export function isValidCpf(value: unknown): boolean {
  const cpf = normalizeCpf(value)
  if (cpf.length !== 11) return false
  // Sequências repetidas (000.000.000-00, 111.111.111-11...) passam no cálculo
  // dos dígitos, mas não são CPFs válidos.
  if (/^(\d)\1{10}$/.test(cpf)) return false

  const calcularDigito = (base: string, pesoInicial: number): number => {
    let soma = 0
    for (let i = 0; i < base.length; i++) {
      soma += Number(base[i]) * (pesoInicial - i)
    }
    const resto = (soma * 10) % 11
    return resto === 10 ? 0 : resto
  }

  if (calcularDigito(cpf.slice(0, 9), 10) !== Number(cpf[9])) return false
  return calcularDigito(cpf.slice(0, 10), 11) === Number(cpf[10])
}

// Formata para exibição: 000.000.000-00
export function formatCpf(value: unknown): string {
  const cpf = normalizeCpf(value)
  if (cpf.length !== 11) return typeof value === "string" ? value : ""
  return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`
}

// Máscara progressiva, usada enquanto o usuário digita no formulário.
export function maskCpfInput(value: string): string {
  const cpf = normalizeCpf(value).slice(0, 11)
  if (cpf.length <= 3) return cpf
  if (cpf.length <= 6) return `${cpf.slice(0, 3)}.${cpf.slice(3)}`
  if (cpf.length <= 9) return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6)}`
  return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`
}
