import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { NovaOSForm } from "@/components/os/nova-os-form";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

// app/(app)/ordens/nova/page.tsx
export default async function NovaOSPage() {
  const { userId } = await auth();
  
  const usuario = await prisma.usuario.findUnique({
    where: { clerkId: userId! },
    select: { cargo: true, id: true },
  });

  if (!usuario || !["ADMIN", "SUPERVISOR", "TECNICO"].includes(usuario.cargo)) {
    redirect("/ordens");
  }

  const tecnicos = await prisma.usuario.findMany({
    where: {
      ativo: true,
      cargo: { in: ["TECNICO", "SUPERVISOR", "ADMIN"] },
    },
    select: { id: true, nome: true, cargo: true, avatarUrl: true },
    orderBy: { nome: "asc" },
  });

  // Debug — remove depois de confirmar
  console.log("[NovaOS] tecnicos:", tecnicos.length);

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-10">
      <div className="flex items-center gap-3">
        <Link href="/ordens" className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-800">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Abrir Nova OS</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            O prazo SLA é calculado automaticamente pelo tipo de atividade — Manual ANTSPACE HK3 V6 + Contrato Axia §1.3.4
          </p>
        </div>
      </div>

      {/* Debug visual — remove depois */}
      {tecnicos.length === 0 && (
        <div className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">
          Nenhum técnico encontrado no banco. Verifique se o usuário foi criado corretamente.
        </div>
      )}

      <NovaOSForm tecnicos={tecnicos} usuarioId={usuario.id} />
    </div>
  );
}