import { UserButton } from "@clerk/nextjs";
import { Bell } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { calcularSLA } from "@/lib/sla-manual";

interface Usuario {
  nome: string;
  cargo: string;
}

export default async function Header({ usuario }: { usuario: Usuario }) {
  // OS ativas com SLA em estado crítico (≥ 90% do prazo decorrido ou vencido)
  const osAtivas = await prisma.ordemServico.findMany({
    where: { status: { notIn: ["CONCLUIDA", "CANCELADA"] } },
    select: { id: true, dataEmissaoAxia: true, tipoOS: true },
  });
  const alertas = osAtivas.filter((os) => {
    const sla = calcularSLA(os.dataEmissaoAxia ?? new Date(), os.tipoOS);
    return sla.vencido || sla.statusColor === "red" || sla.statusColor === "orange";
  }).length;

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 shrink-0">
      <div />
      <div className="flex items-center gap-4">
        {alertas > 0 && (
          <div className="relative">
            <Bell className="w-5 h-5 text-gray-400" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center font-medium">
              {alertas > 9 ? "9+" : alertas}
            </span>
          </div>
        )}
        <div className="text-right hidden md:block">
          <p className="text-sm font-medium text-gray-900">{usuario.nome}</p>
          <p className="text-xs text-gray-400 capitalize">{usuario.cargo.toLowerCase()}</p>
        </div>
        <UserButton signInUrl="/sign-in" />
      </div>
    </header>
  );
}