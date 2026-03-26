import { UserButton } from "@clerk/nextjs";
import { Bell } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { calcularSLA } from "@/lib/sla-manual";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

interface Usuario {
  nome: string;
  cargo: string;
}

export default async function AppHeader({ usuario }: { usuario: Usuario }) {
  const osAtivas = await prisma.ordemServico.findMany({
    where: { status: { notIn: ["CONCLUIDA", "CANCELADA"] } },
    select: { id: true, dataEmissaoAxia: true, tipoOS: true },
  });
  const alertas = osAtivas.filter((os) => {
    const sla = calcularSLA(os.dataEmissaoAxia ?? new Date(), os.tipoOS);
    return sla.vencido || sla.statusColor === "red" || sla.statusColor === "orange";
  }).length;

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4 md:px-6">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <div className="flex-1" />
      <div className="flex items-center gap-3">
        {alertas > 0 && (
          <div className="relative">
            <Bell className="w-5 h-5 text-muted-foreground" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center font-medium">
              {alertas > 9 ? "9+" : alertas}
            </span>
          </div>
        )}
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium text-foreground leading-none">{usuario.nome}</p>
          <p className="text-xs text-muted-foreground capitalize mt-0.5">{usuario.cargo.toLowerCase()}</p>
        </div>
        <UserButton signInUrl="/sign-in" />
      </div>
    </header>
  );
}

export { AppHeader };