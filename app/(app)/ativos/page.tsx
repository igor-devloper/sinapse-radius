import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { listAssets } from "@/lib/assets";
import { AtivosPageClient } from "@/components/assets/ativos-page-client";

export default async function AtivosPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const usuario = await prisma.usuario.findUnique({
    where: { clerkId: userId },
    select: { cargo: true, ativo: true },
  });

  if (!usuario?.ativo) redirect("/sem-acesso");

  const assets = await listAssets();
  const canManage = ["ADMIN", "SUPERVISOR", "TECNICO"].includes(usuario.cargo);

  return <AtivosPageClient initialAssets={assets} canManage={canManage} />;
}
