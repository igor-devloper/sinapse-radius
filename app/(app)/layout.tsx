import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Cargo } from "../generated/prisma/enums";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import AppHeader from "@/components/app-header";


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
    <SidebarProvider>
      <AppSidebar cargo={usuario.cargo} nome={usuario.nome} />
      <SidebarInset>
        <AppHeader usuario={usuario} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}