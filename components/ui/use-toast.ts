/**
 * Reexporta o hook de avisos de hooks/use-toast.
 *
 * O projeto tinha DUAS cópias deste arquivo — esta e a de hooks/ — cada uma
 * com sua própria lista de avisos em memória. O componente Toaster lê de
 * hooks/use-toast, enquanto os modais disparavam por aqui: um lado publicava,
 * o outro renderizava, e nenhuma mensagem chegava à tela.
 *
 * Mantido como reexport para que os mais de 30 imports existentes continuem
 * funcionando, agora compartilhando um único armazenamento.
 */
export { useToast, toast } from "@/hooks/use-toast"
