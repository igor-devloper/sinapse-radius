import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { TabelaUsuarios } from "@/components/admin/tabela-usuarios";
import { GerenciarUsuarios } from "@/components/admin/gerenciar-usuarios";

export default async function AdminPage() {
  const { userId } = await auth();
  const admin = await prisma.usuario.findUnique({
    where: { clerkId: userId! },
    select: { cargo: true },
  });

  if (!admin || admin.cargo !== "ADMIN") redirect("/dashboard");

  const usuarios = await prisma.usuario.findMany({
    orderBy: { nome: "asc" },
    include: {
      _count: { select: { ordensResponsavel: true, ordensAberta: true } },
    },
  });

  const stats = {
    total: usuarios.length,
    ativos: usuarios.filter((u) => u.ativo).length,
    porCargo: {
      ADMIN: usuarios.filter((u) => u.cargo === "ADMIN").length,
      SUPERVISOR: usuarios.filter((u) => u.cargo === "SUPERVISOR").length,
      TECNICO: usuarios.filter((u) => u.cargo === "TECNICO").length,
      VISUALIZADOR: usuarios.filter((u) => u.cargo === "VISUALIZADOR").length,
    },
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Administração</h1>
        <p className="text-sm text-gray-500 mt-0.5">Controle de usuários e cargos</p>
      </div>

      {/* Cards de stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Total", value: stats.total, class: "bg-gray-50 text-gray-700" },
          { label: "Ativos", value: stats.ativos, class: "bg-green-50 text-green-700" },
          { label: "Admin", value: stats.porCargo.ADMIN, class: "bg-violet-50 text-violet-700" },
          { label: "Supervisor", value: stats.porCargo.SUPERVISOR, class: "bg-blue-50 text-blue-700" },
          { label: "Técnico", value: stats.porCargo.TECNICO, class: "bg-orange-50 text-orange-700" },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl p-4 ${s.class}`}>
            <p className="text-2xl font-semibold">{s.value}</p>
            <p className="text-xs mt-0.5 opacity-70">{s.label}</p>
          </div>
        ))}
      </div>
      <GerenciarUsuarios usuarios={usuarios}/>
      {/* <TabelaUsuarios usuarios={usuarios} /> */}
    </div>
  );
}
