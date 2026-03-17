import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Cargo } from "../generated/prisma/enums";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const clerkUser = await currentUser();
  if (!clerkUser) redirect("/sign-in");

  let usuario = await prisma.usuario.findUnique({
    where: { clerkId: clerkUser.id },
    select: { id: true, nome: true, cargo: true, avatarUrl: true, ativo: true },
  });

  if (!usuario) {
    const cargo = clerkUser.publicMetadata?.cargo as Cargo | undefined;

    if (!cargo || !Object.values(Cargo).includes(cargo)) redirect("/sem-acesso");

    usuario = await prisma.usuario.create({
      data: {
        clerkId: clerkUser.id,
        nome: `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim(),
        email: clerkUser.emailAddresses[0]?.emailAddress ?? "",
        cargo: cargo,
        avatarUrl: clerkUser.imageUrl ?? null,
        ativo: true,
      },
      select: { id: true, nome: true, cargo: true, avatarUrl: true, ativo: true },
    });
  }

  if (!usuario.ativo) redirect("/sem-acesso");

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