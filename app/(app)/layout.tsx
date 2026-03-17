import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const usuario = await prisma.usuario.findUnique({
    where: { clerkId: userId },
    select: { id: true, nome: true, cargo: true, avatarUrl: true, ativo: true },
  });

  if (!usuario || !usuario.ativo) redirect("/sem-acesso");

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar cargo={usuario.cargo} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header usuario={usuario} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
